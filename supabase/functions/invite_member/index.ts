// Supabase Edge Function: invite_member
// A mentor invites a teammate by email. Creates the auth user (invite email)
// and the members row in one call, so no dashboard round-trip is needed.
//
// Deploy:  supabase functions deploy invite_member
// The runtime injects SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') || ''

    // Caller-scoped client — identifies who is calling and enforces their RLS.
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: userData } = await caller.auth.getUser()
    const uid = userData?.user?.id
    if (!uid) return json({ error: 'Not authenticated' }, 401)

    const { data: me } = await caller.from('members').select('role').eq('id', uid).maybeSingle()
    if (me?.role !== 'mentor') return json({ error: 'Mentors only' }, 403)

    const { email, full_name, role } = await req.json()
    if (!email || !['mentor', 'editor', 'viewer'].includes(role)) {
      return json({ error: 'email and a valid role are required' }, 400)
    }

    // Admin client — creates the auth user and the members row.
    const admin = createClient(url, service)
    const invite = await admin.auth.admin.inviteUserByEmail(email)
    if (invite.error) return json({ error: invite.error.message }, 400)

    const newId = invite.data.user.id
    const ins = await admin.from('members').insert({ id: newId, email, full_name: full_name || null, role })
    if (ins.error) return json({ error: ins.error.message }, 400)

    return json({ ok: true, id: newId }, 200)
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
