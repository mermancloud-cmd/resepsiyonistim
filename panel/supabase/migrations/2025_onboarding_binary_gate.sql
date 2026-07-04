-- ═══════════════════════════════════════════════════════════════════════════════
-- Onboarding Wizard Binary Gate Implementation
-- Migration: Add onboarding_completed tracking + activation RPCs + WF02
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Ensure schema has required columns ─────────────────────────────────────

-- Add onboarding_completed columns to tenants table (if not exists)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Add onboarding_completed columns to businesses table (legacy, if not exists)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Add whatsapp_number to tenants (if not exists)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add onboarding_steps tracking table (if not exists)
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 12),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  step_data JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, step_number)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_business
  ON onboarding_steps(business_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_steps_completed
  ON onboarding_steps(business_id, is_completed)
  WHERE is_completed = true;

-- ─── 2. RPC: init_onboarding_steps ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION init_onboarding_steps(p_business_id UUID)
RETURNS TABLE (
  step_number INTEGER,
  is_completed BOOLEAN,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert all 12 steps if they don't exist
  INSERT INTO onboarding_steps (business_id, step_number, is_completed)
  SELECT p_business_id, gs.step, false
  FROM generate_series(1, 12) AS gs(step)
  ON CONFLICT (business_id, step_number) DO NOTHING;

  -- Return current state
  RETURN QUERY
  SELECT os.step_number, os.is_completed, os.completed_at
  FROM onboarding_steps os
  WHERE os.business_id = p_business_id
  ORDER BY os.step_number;
END;
$$;

-- ─── 3. RPC: complete_onboarding_step ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION complete_onboarding_step(
  p_business_id UUID,
  p_step_number INTEGER,
  p_step_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_all_complete BOOLEAN;
BEGIN
  -- Mark step as complete
  INSERT INTO onboarding_steps (business_id, step_number, is_completed, step_data, completed_at)
  VALUES (p_business_id, p_step_number, true, p_step_data, now())
  ON CONFLICT (business_id, step_number)
  DO UPDATE SET
    is_completed = true,
    step_data = EXCLUDED.step_data,
    completed_at = now(),
    updated_at = now();

  -- Check if all 12 steps are now complete
  SELECT COUNT(*) = 12 INTO v_all_complete
  FROM onboarding_steps
  WHERE business_id = p_business_id AND is_completed = true;

  -- If all complete, auto-set onboarding_completed on the business
  IF v_all_complete THEN
    UPDATE businesses
    SET onboarding_completed = true,
        onboarding_completed_at = now(),
        updated_at = now()
    WHERE id = p_business_id;

    -- Also update tenants table if linked
    UPDATE tenants
    SET onboarding_completed = true,
        onboarding_completed_at = now(),
        updated_at = now()
    WHERE id = p_business_id;
  END IF;

  RETURN v_all_complete;
END;
$$;

-- ─── 4. RPC: check_onboarding_complete ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_onboarding_complete(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- Check from businesses/tenants table (authoritative)
  SELECT COALESCE(onboarding_completed, false) INTO v_result
  FROM businesses
  WHERE id = p_business_id;

  -- Fallback: count completed steps
  IF v_result IS NULL OR NOT v_result THEN
    SELECT COUNT(*) = 12 INTO v_result
    FROM onboarding_steps
    WHERE business_id = p_business_id AND is_completed = true;
  END IF;

  RETURN COALESCE(v_result, false);
END;
$$;

-- ─── 5. RPC: activate_business (Binary Gate → Active) ──────────────────────────

CREATE OR REPLACE FUNCTION activate_business(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_all_steps_complete BOOLEAN;
BEGIN
  -- Verify all 12 steps are complete (binary gate check)
  SELECT COUNT(*) = 12 INTO v_all_steps_complete
  FROM onboarding_steps
  WHERE business_id = p_business_id AND is_completed = true;

  IF NOT v_all_steps_complete THEN
    RAISE EXCEPTION 'Cannot activate: not all onboarding steps are complete';
  END IF;

  -- Set onboarding_completed = true
  UPDATE businesses
  SET onboarding_completed = true,
      onboarding_completed_at = now(),
      updated_at = now()
  WHERE id = p_business_id;

  UPDATE tenants
  SET onboarding_completed = true,
      onboarding_completed_at = now(),
      updated_at = now()
  WHERE id = p_business_id;

  -- Activate WF02 (Elif AI conversation workflow)
  -- WF02 is the AI conversation handler workflow
  PERFORM activate_wf02(p_business_id);

  RETURN true;
END;
$$;

-- ─── 6. RPC: activate_wf02 (Enable Elif AI for tenant) ────────────────────────

CREATE OR REPLACE FUNCTION activate_wf02(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enable AI for the tenant in tenant_settings
  UPDATE tenant_settings
  SET ai_enabled = true,
      updated_at = now()
  WHERE tenant_id = p_tenant_id;

  -- If no tenant_settings row exists, create one
  IF NOT FOUND THEN
    INSERT INTO tenant_settings (tenant_id, ai_enabled)
    VALUES (p_tenant_id, true)
    ON CONFLICT (tenant_id) DO UPDATE
    SET ai_enabled = true, updated_at = now();
  END IF;

  -- Log the activation event
  INSERT INTO workflow_events (tenant_id, workflow_id, event_type, payload, created_at)
  VALUES (p_tenant_id, 'WF02', 'activated', jsonb_build_object(
    'activated_at', now(),
    'source', 'onboarding_completion'
  ), now())
  ON CONFLICT DO NOTHING;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Gracefully handle missing tables
    RAISE WARNING 'WF02 activation partial: %', SQLERRM;
    RETURN false;
END;
$$;

-- ─── 7. RLS Policies ───────────────────────────────────────────────────────────

-- Enable RLS on onboarding_steps
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Owners can read their own steps
CREATE POLICY "owners_read_own_steps"
  ON onboarding_steps FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Owners can update their own steps
CREATE POLICY "owners_update_own_steps"
  ON onboarding_steps FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- ─── 8. Updated_at trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_onboarding_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_onboarding_steps_updated_at ON onboarding_steps;
CREATE TRIGGER tr_onboarding_steps_updated_at
  BEFORE UPDATE ON onboarding_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_steps_updated_at();
