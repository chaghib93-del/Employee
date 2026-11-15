// The ONLY server code in this project. Creating or removing a login needs the
// Supabase service key, which must never be in the browser, so it lives here.
// Vercel runs this file automatically at  /api/admin-users
import { createClient } from '@supabase/supabase-js'

const DOMAIN = process.env.VITE_LOGIN_DOMAIN || 'emp-login.app'
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const fail = (res, code, error) => res.status(code).json({ error })
const NAME = /^[a-z0-9._-]{2,40}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Use POST.')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VITE_SUPABASE_URL) return fail(res, 500, 'Server is not configured: add SUPABASE_SERVICE_ROLE_KEY in Vercel.')

  // 1. Who is calling?
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const { data: auth, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !auth?.user) return fail(res, 401, 'Please sign in again.')
  const { data: me } = await admin.from('profiles').select('*').eq('id', auth.user.id).maybeSingle()
  if (!me) return fail(res, 403, 'Your account has no role.')

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})

  // 2. Create a login
  if (body.action === 'create') {
    const username = String(body.u || '').trim().toLowerCase()
    const password = String(body.p || '')
    const kind = body.kind
    const district = String(body.district || '').trim()
    if (!NAME.test(username)) return fail(res, 400, 'Username: 2 to 40 letters, numbers, dot, dash or underscore (no spaces).')
    if (password.length < 6) return fail(res, 400, 'Password must be 6 or more characters.')

    // Who may create whom
    let row
    if (me.role === 'dir' && kind === 'deo') {
      if (!district) return fail(res, 400, 'Enter a district.')
      row = { role: 'deo', district }
    } else if (me.role === 'dir' && kind === 'ad') row = { role: 'ad' }
    else if (me.role === 'deo' && kind === 'entry') row = { role: 'entry', district: me.district }
    else if (me.role === 'ad' && kind === 'ops') row = { role: 'ops', owner: me.username }
    else return fail(res, 403, 'You are not allowed to add that kind of user.')

    const { data: taken } = await admin.from('profiles').select('id').eq('username', username).maybeSingle()
    if (taken) return fail(res, 409, 'That username is taken. Choose another.')

    const { data: created, error } = await admin.auth.admin.createUser({
      email: `${username}@${DOMAIN}`, password, email_confirm: true,
    })
    if (error) return fail(res, 400, error.message)
    const { error: pErr } = await admin.from('profiles').insert({ id: created.user.id, username, ...row })
    if (pErr) { await admin.auth.admin.deleteUser(created.user.id); return fail(res, 400, pErr.message) }
    return res.json({ ok: true })
  }

  // 3. Remove a login
  if (body.action === 'delete') {
    const username = String(body.u || '').trim().toLowerCase()
    const { data: t } = await admin.from('profiles').select('*').eq('username', username).maybeSingle()
    if (!t) return fail(res, 404, 'User not found.')
    const ok = (me.role === 'dir' && (t.role === 'deo' || t.role === 'ad'))
      || (me.role === 'deo' && t.role === 'entry' && t.district === me.district)
      || (me.role === 'ad' && t.role === 'ops' && t.owner === me.username)
    if (!ok) return fail(res, 403, 'You are not allowed to remove that user.')
    const { error } = await admin.auth.admin.deleteUser(t.id)     // the profile row is removed with it
    if (error) return fail(res, 400, error.message)
    return res.json({ ok: true })
  }

  return fail(res, 400, 'Unknown action.')
}
