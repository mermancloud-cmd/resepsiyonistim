const https = require('https');
const fs = require('fs');

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API = '/v1/projects/xzmakpsongrcbnrpdvsy/database/query';

const queries = [
  `CREATE OR REPLACE FUNCTION public.user_has_permission(p_permission TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $func$
DECLARE parts TEXT[]; resource TEXT; action TEXT; perms JSONB;
BEGIN
  parts := string_to_array(p_permission, '.');
  resource := parts[1]; action := parts[2];
  SELECT r.permissions INTO perms FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() LIMIT 1;
  IF perms IS NULL THEN RETURN false; END IF;
  IF perms ? '*::*' THEN RETURN (perms->>'*::*')::boolean; END IF;
  IF perms ? resource AND (perms->resource) ? '*' THEN RETURN ((perms->resource)->>'*')::boolean; END IF;
  IF perms ? resource AND (perms->resource) ? action THEN RETURN ((perms->resource)->>action)::boolean; END IF;
  RETURN false;
END;
$func$;`,

  `CREATE OR REPLACE FUNCTION public.get_user_tenant_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT t.id FROM public.tenants t WHERE t.owner_id = auth.uid() LIMIT 1),
    (SELECT b.id FROM public.bungalows b WHERE b.owner_id = auth.uid() LIMIT 1)
  );
$$;`,

  `CREATE OR REPLACE FUNCTION public.get_user_tenant_id_legacy() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT t.id FROM public.tenants t WHERE t.owner_id = auth.uid() LIMIT 1),
    (SELECT b.id FROM public.bungalows b WHERE b.owner_id = auth.uid() LIMIT 1)
  );
$$;`,

  `ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rbac_roles_select" ON public.roles;
CREATE POLICY "rbac_roles_select" ON public.roles
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));`,

  `ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rbac_user_roles_select" ON public.user_roles;
CREATE POLICY "rbac_user_roles_select" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());`,

  // RLS for rooms
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'tenant_id') THEN
      ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.rooms FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "tenant_isolation_select" ON public.rooms;
      DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.rooms;
      DROP POLICY IF EXISTS "tenant_isolation_update" ON public.rooms;
      DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.rooms;
      DROP POLICY IF EXISTS "rbac_rooms_select" ON public.rooms;
      CREATE POLICY "rbac_rooms_select" ON public.rooms FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('rooms.read'));
      DROP POLICY IF EXISTS "rbac_rooms_insert" ON public.rooms;
      CREATE POLICY "rbac_rooms_insert" ON public.rooms FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('rooms.write'));
      DROP POLICY IF EXISTS "rbac_rooms_update" ON public.rooms;
      CREATE POLICY "rbac_rooms_update" ON public.rooms FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('rooms.write')) WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('rooms.write'));
      DROP POLICY IF EXISTS "rbac_rooms_delete" ON public.rooms;
      CREATE POLICY "rbac_rooms_delete" ON public.rooms FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('rooms.write'));
    END IF;
  END $$;`,

  // RLS for reservations
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'tenant_id') THEN
      DROP POLICY IF EXISTS "tenant_isolation_select" ON public.reservations;
      DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.reservations;
      DROP POLICY IF EXISTS "tenant_isolation_update" ON public.reservations;
      DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.reservations;
      DROP POLICY IF EXISTS "rbac_reservations_select" ON public.reservations;
      CREATE POLICY "rbac_reservations_select" ON public.reservations FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('reservations.read'));
      DROP POLICY IF EXISTS "rbac_reservations_insert" ON public.reservations;
      CREATE POLICY "rbac_reservations_insert" ON public.reservations FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('reservations.write'));
      DROP POLICY IF EXISTS "rbac_reservations_update" ON public.reservations;
      CREATE POLICY "rbac_reservations_update" ON public.reservations FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('reservations.write')) WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('reservations.write'));
      DROP POLICY IF EXISTS "rbac_reservations_delete" ON public.reservations;
      CREATE POLICY "rbac_reservations_delete" ON public.reservations FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('reservations.write'));
    END IF;
  END $$;`,

  // RLS for conversations
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'tenant_id') THEN
      DROP POLICY IF EXISTS "tenant_isolation_select" ON public.conversations;
      DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.conversations;
      DROP POLICY IF EXISTS "tenant_isolation_update" ON public.conversations;
      DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.conversations;
      DROP POLICY IF EXISTS "rbac_conversations_select" ON public.conversations;
      CREATE POLICY "rbac_conversations_select" ON public.conversations FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('chat.read'));
      DROP POLICY IF EXISTS "rbac_conversations_insert" ON public.conversations;
      CREATE POLICY "rbac_conversations_insert" ON public.conversations FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('chat.write'));
      DROP POLICY IF EXISTS "rbac_conversations_update" ON public.conversations;
      CREATE POLICY "rbac_conversations_update" ON public.conversations FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('chat.write')) WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('chat.write'));
      DROP POLICY IF EXISTS "rbac_conversations_delete" ON public.conversations;
      CREATE POLICY "rbac_conversations_delete" ON public.conversations FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('chat.write'));
    END IF;
  END $$;`,

  // RLS for messages
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'tenant_id') THEN
      DROP POLICY IF EXISTS "tenant_isolation_select" ON public.messages;
      DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.messages;
      DROP POLICY IF EXISTS "tenant_isolation_update" ON public.messages;
      DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.messages;
      DROP POLICY IF EXISTS "rbac_messages_select" ON public.messages;
      CREATE POLICY "rbac_messages_select" ON public.messages FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('chat.read'));
      DROP POLICY IF EXISTS "rbac_messages_insert" ON public.messages;
      CREATE POLICY "rbac_messages_insert" ON public.messages FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('chat.write'));
      DROP POLICY IF EXISTS "rbac_messages_update" ON public.messages;
      CREATE POLICY "rbac_messages_update" ON public.messages FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('chat.write')) WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('chat.write'));
      DROP POLICY IF EXISTS "rbac_messages_delete" ON public.messages;
      CREATE POLICY "rbac_messages_delete" ON public.messages FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('chat.write'));
    END IF;
  END $$;`,

  // RLS for bungalows
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bungalows' AND column_name = 'tenant_id') THEN
      DROP POLICY IF EXISTS "tenant_isolation_select" ON public.bungalows;
      DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.bungalows;
      DROP POLICY IF EXISTS "tenant_isolation_update" ON public.bungalows;
      DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.bungalows;
      DROP POLICY IF EXISTS "rbac_bungalows_select" ON public.bungalows;
      CREATE POLICY "rbac_bungalows_select" ON public.bungalows FOR SELECT USING (tenant_id = public.get_user_tenant_id());
      DROP POLICY IF EXISTS "rbac_bungalows_insert" ON public.bungalows;
      CREATE POLICY "rbac_bungalows_insert" ON public.bungalows FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('settings.write'));
      DROP POLICY IF EXISTS "rbac_bungalows_update" ON public.bungalows;
      CREATE POLICY "rbac_bungalows_update" ON public.bungalows FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('settings.write')) WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('settings.write'));
      DROP POLICY IF EXISTS "rbac_bungalows_delete" ON public.bungalows;
      CREATE POLICY "rbac_bungalows_delete" ON public.bungalows FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.user_has_permission('settings.write'));
    END IF;
  END $$;`,

  // RLS for tenants
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
      DROP POLICY IF EXISTS "owner_can_select_own_tenant" ON public.tenants;
      DROP POLICY IF EXISTS "owner_can_update_own_tenant" ON public.tenants;
      DROP POLICY IF EXISTS "rbac_tenants_select" ON public.tenants;
      CREATE POLICY "rbac_tenants_select" ON public.tenants FOR SELECT USING (id = public.get_user_tenant_id());
      DROP POLICY IF EXISTS "rbac_tenants_update" ON public.tenants;
      CREATE POLICY "rbac_tenants_update" ON public.tenants FOR UPDATE USING (id = public.get_user_tenant_id() AND public.user_has_permission('settings.write')) WITH CHECK (id = public.get_user_tenant_id() AND public.user_has_permission('settings.write'));
    END IF;
  END $$;`,

  // Seed existing users as admin
  `DO $$
  DECLARE
    admin_role_id UUID;
    existing_user RECORD;
  BEGIN
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
    FOR existing_user IN
      SELECT DISTINCT u.id AS user_id, t.id AS tenant_id
      FROM auth.users u
      CROSS JOIN public.tenants t
      WHERE t.owner_id = u.id
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = u.id AND ur.tenant_id = t.id
        )
    LOOP
      INSERT INTO public.user_roles (user_id, tenant_id, role_id)
      VALUES (existing_user.user_id, existing_user.tenant_id, admin_role_id)
      ON CONFLICT (user_id, tenant_id) DO NOTHING;
    END LOOP;
  END;
  $$;`
];

function sendQuery(sql, idx) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: API,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const ok = !data.includes('error') || data === '[]';
        console.log(`[${idx+1}/${queries.length}] ${ok ? 'OK' : 'ERROR'}: ${data.slice(0, 200)}`);
        resolve(ok);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  let allOk = true;
  for (let i = 0; i < queries.length; i++) {
    try {
      const ok = await sendQuery(queries[i], i);
      if (!ok) allOk = false;
    } catch(e) {
      console.error(`[${i+1}] FAILED: ${e.message}`);
      allOk = false;
    }
  }
  console.log(`\n=== ${allOk ? 'ALL OK' : 'SOME FAILED'} ===`);
  process.exit(allOk ? 0 : 1);
})();
