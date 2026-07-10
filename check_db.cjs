const { createClient } = require('@supabase/supabase-js');
// Strip /rest/v1/ suffix if present — Supabase client adds it automatically
const rawUrl = process.env.SUPABASE_URL || 'https://xzmakpsongrcbnrpdvsy.supabase.co';
const baseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
const supabase = createClient(
  baseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function check() {
  const tables = ['ab_test_variants', 'ab_test_results', 'ab_test_winner_history'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id', { count: 'exact', head: true }).limit(1);
    console.log(`  ${t}: ${error ? 'NO (' + error.message + ')' : 'EXISTS (' + (data?.length ?? 0) + ' rows)'}`);
  }
  // Check tenant_settings prompt column
  const { data: ts, error: tsErr } = await supabase.from('tenant_settings').select('ai_persona_prompt').limit(1);
  console.log(`  tenant_settings.ai_persona_prompt: ${tsErr ? 'NO (' + tsErr.message + ')' : (ts?.[0]?.ai_persona_prompt ? 'PRESENT' : 'COLUMN EXISTS BUT NULL')}`);
}
check().catch(console.error);
