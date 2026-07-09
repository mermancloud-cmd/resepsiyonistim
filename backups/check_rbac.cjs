const https = require('https');
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const API = '/v1/projects/xzmakpsongrcbnrpdvsy/database/query';

const queries = [
  // Use tenants.owner_email to seed user_roles
  `DO $$
  DECLARE
    admin_role_id UUID;
    r RECORD;
  BEGIN
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';

    FOR r IN
      SELECT u.id AS user_id, t.id AS tenant_id
      FROM auth.users u
      JOIN public.tenants t ON t.owner_email = u.email
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = u.id AND ur.tenant_id = t.id
      )
      LIMIT 10
    LOOP
      INSERT INTO public.user_roles (user_id, tenant_id, role_id)
      VALUES (r.user_id, r.tenant_id, admin_role_id)
      ON CONFLICT (user_id, tenant_id) DO NOTHING;
    END LOOP;
  END;
  $$;`,

  // Check results
  `SELECT ur.user_id, ur.tenant_id, r.name as role_name, t.business_name
   FROM public.user_roles ur
   JOIN public.roles r ON r.id = ur.role_id
   JOIN public.tenants t ON t.id = ur.tenant_id`,

  // Verify RLS policies exist
  `SELECT tablename, policyname FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('rooms', 'reservations', 'conversations', 'roles', 'user_roles')
   ORDER BY tablename, policyname`,

  // Verify function works
  `SELECT public.user_has_permission('reservations.read')`,

  // Verify get_user_role function
  `SELECT proname, prosrc FROM pg_proc WHERE proname IN ('get_user_role', 'user_has_permission', 'get_user_tenant_id') ORDER BY proname`,
];

function sendQuery(sql, idx) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: API,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${idx+1}] ${data.slice(0, 400)}`);
        resolve();
      });
    });
    req.on('error', (e) => { console.log(`[${idx+1}] NETERR: ${e.message}`); resolve(); });
    req.write(body);
    req.end();
  });
}

(async () => {
  for (let i = 0; i < queries.length; i++) {
    await sendQuery(queries[i], i);
  }
})();
