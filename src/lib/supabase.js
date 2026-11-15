import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key)
export const supabase = configured ? createClient(url, key) : null

// People sign in with a username. Supabase Auth wants an email, so the app
// uses username@LOGIN_DOMAIN behind the scenes. No email is ever sent.
// Must be the same value in Vercel for the browser and for api/admin-users.js.
export const LOGIN_DOMAIN = import.meta.env.VITE_LOGIN_DOMAIN || 'emp-login.app'
export const emailOf = u => `${String(u).trim().toLowerCase()}@${LOGIN_DOMAIN}`

// Calls the one server function that creates / removes logins (needs the service key).
export async function adminApi(action, payload) {
  const { data } = await supabase.auth.getSession()
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
    body: JSON.stringify({ action, ...payload }),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error || 'The request failed. Try again.')
  return out
}
