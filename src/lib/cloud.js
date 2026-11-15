// Keeps the app's lists in Supabase while the screens keep using plain arrays.
//   const [rows, setRows] = useCloudList('employees', userId)
// setRows works like React's setState. After each change the difference
// (added / changed / removed records) is saved to Supabase in the background.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

// How each app list maps to a table. `toRow` adds the plain columns that the
// security rules read; the full record is kept in `data`.
const LISTS = {
  employees: { table: 'employees', toRow: x => ({ id: x.id, district: x.district, phase: x.phase, closed: !!x.closed, data: x }) },
  phases: { table: 'phases', toRow: x => ({ id: x.id, name: x.name, status: x.status, all_districts: !Array.isArray(x.districts), districts: Array.isArray(x.districts) ? x.districts : [], data: x }) },
  fq: { table: 'fq_applications', toRow: x => ({ id: x.id, district: x.district, data: x }) },
  notices: { table: 'notices', desc: true, toRow: x => ({ id: x.id, author: x.from, audience: x.aud, data: x }) },
  docs: { table: 'documents', desc: true, toRow: x => ({ id: x.id, author: x.by, by_role: x.byRole, share: x.share, district: x.district || null, data: x }) },
  notes: { table: 'notes', toRow: x => ({ id: x.id, to_user: x.to, from_user: x.from, data: x }) },
}

const PAGE = 1000          // rows per read (Supabase returns at most 1000 per request)
const CHUNK_BYTES = 900000 // about 0.9 MB per write request
const IN_CHUNK = 100       // ids per delete request

// JSON with sorted keys, so the same record always gives the same text
const stable = v => JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x)

// ---- save status shared by all lists (drives the banner in App.jsx) ----
let status = { pending: 0, error: '' }
const pendingSet = new Set()
const listeners = new Set()
const emit = patch => { status = { ...status, ...patch }; listeners.forEach(f => f(status)) }
const setPending = (k, on) => { on ? pendingSet.add(k) : pendingSet.delete(k); emit({ pending: pendingSet.size }) }
const retryFns = new Set()
export const retrySaving = () => { emit({ error: '' }); retryFns.forEach(f => f()) }
export function useSyncStatus() {
  const [s, setS] = useState(status)
  useEffect(() => { listeners.add(setS); setS(status); return () => { listeners.delete(setS) } }, [])
  useEffect(() => {
    const h = e => { if (status.pending) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h)
  }, [])
  return s
}
const friendly = e => {
  const m = (e && e.message) || String(e)
  if (/row-level security|permission denied/i.test(m)) return 'You are not allowed to make that change.'
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No internet connection.'
  return m
}

function* chunksBySize(rows) {
  let part = [], size = 0
  for (const r of rows) {
    const n = stable(r).length
    if (part.length && size + n > CHUNK_BYTES) { yield part; part = []; size = 0 }
    part.push(r); size += n
  }
  if (part.length) yield part
}

async function writeAll(cfg, rows, delIds) {
  let mismatch = false
  for (let i = 0; i < delIds.length; i += IN_CHUNK) {          // deletes first (frees unique names)
    const ids = delIds.slice(i, i + IN_CHUNK)
    const { data, error } = await supabase.from(cfg.table).delete().in('id', ids).select('id')
    if (error) throw error
    if ((data || []).length < ids.length) mismatch = true
  }
  for (const part of chunksBySize(rows)) {
    const { error } = await supabase.from(cfg.table).upsert(part, { onConflict: 'id' })
    if (error) throw error
  }
  return mismatch
}

async function fetchAll(cfg) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(cfg.table).select('data')
      .order('seq', { ascending: !cfg.desc }).range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...data.map(r => r.data))
    if (data.length < PAGE) break
  }
  return out
}

// ---------------------------------------------------------------------
export function useCloudList(name, userId, pollMs = 90000) {
  const cfg = LISTS[name]
  const [items, setItems] = useState([])
  const R = useRef({ items: [], synced: new Map(), busy: false, again: false, timer: null, tries: 0 })

  const adopt = useCallback(list => {
    const r = R.current
    r.items = list; r.synced = new Map(list.map(x => [x.id, stable(x)])); setItems(list)
  }, [])

  const refresh = useCallback(async (force = false) => {
    const r = R.current
    if (!userId || (!force && (r.busy || pendingSet.has(name)))) return
    try {
      const list = await fetchAll(cfg)
      if (!force && (r.busy || pendingSet.has(name))) return
      if (force || stable(list) !== stable(r.items)) adopt(list)
    } catch (e) { emit({ error: friendly(e) }) }
  }, [userId, cfg, name, adopt])

  const flush = useCallback(async () => {
    const r = R.current
    if (r.busy) { r.again = true; return }
    r.busy = true; let mismatch = false
    try {
      do {
        r.again = false
        const snap = r.items
        const next = new Map(); snap.forEach(x => next.set(x.id, x))      // last one wins on duplicate ids
        const del = [...r.synced.keys()].filter(id => !next.has(id))
        const up = [...next.values()].filter(x => r.synced.get(x.id) !== stable(x))
        if (del.length || up.length) {
          if (await writeAll(cfg, up.map(cfg.toRow), del)) mismatch = true
          del.forEach(id => r.synced.delete(id)); up.forEach(x => r.synced.set(x.id, stable(x)))
        }
      } while (r.again)
      r.tries = 0; setPending(name, false); emit({ error: '' })
    } catch (e) {
      emit({ error: friendly(e) })
      if (++r.tries <= 3) r.timer = setTimeout(flush, 5000 * r.tries)    // retry a few times, then wait for the Retry button
    } finally { r.busy = false }
    if (mismatch) refresh(true)                                          // something was refused: show the server's truth
  }, [cfg, name, refresh])

  const set = useCallback(upd => {
    const r = R.current
    const next = typeof upd === 'function' ? upd(r.items) : upd
    if (next === r.items) return
    r.items = next; setItems(next); setPending(name, true)
    clearTimeout(r.timer); r.timer = setTimeout(flush, 300)
  }, [name, flush])

  useEffect(() => {                    // load when a person signs in, clear when they sign out
    const r = R.current
    clearTimeout(r.timer); r.synced = new Map(); r.items = []; setItems([]); setPending(name, false)
    if (!userId) return
    refresh(true)
    const again = () => { r.tries = 0; flush() }
    retryFns.add(again)
    const tick = setInterval(() => { if (!document.hidden) refresh() }, pollMs)
    const vis = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', vis); retryFns.delete(again); clearTimeout(r.timer) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  return [items, set]
}

// One setting stored in app_settings (key 'review' or 'cols')
export function useCloudSetting(key, init, userId) {
  const [v, setV] = useState(init)
  const R = useRef({ synced: stable(init), timer: null, v: init })
  useEffect(() => {
    if (!userId) { setV(init); return }
    let on = true
    supabase.from('app_settings').select('value').eq('key', key).maybeSingle().then(({ data }) => {
      if (on && data) { R.current.synced = stable(data.value); R.current.v = data.value; setV(data.value) }
    })
    return () => { on = false }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = useCallback(upd => {
    const r = R.current
    const next = typeof upd === 'function' ? upd(r.v) : upd
    r.v = next; setV(next); setPending('s:' + key, true)
    clearTimeout(r.timer)
    r.timer = setTimeout(async () => {
      if (stable(r.v) === r.synced) return setPending('s:' + key, false)
      const { error } = await supabase.from('app_settings').upsert({ key, value: r.v }, { onConflict: 'key' })
      if (error) return emit({ error: friendly(error) })
      r.synced = stable(r.v); setPending('s:' + key, false)
    }, 400)
  }, [key])
  return [v, set]
}

// Everyone who can sign in (from the profiles table), shaped like the app's old user list
export function useProfiles(userId) {
  const [users, setUsers] = useState(null)
  const load = useCallback(async () => {
    if (!userId) return setUsers(null)
    const { data, error } = await supabase.from('profiles').select('id, username, role, district, owner').order('username')
    if (error) return emit({ error: friendly(error) })
    setUsers(data.map(p => ({ id: p.id, u: p.username, role: p.role, district: p.district || undefined, owner: p.owner || undefined })))
  }, [userId])
  useEffect(() => { load() }, [load])
  return [users, load]
}

export function useSession() {
  const [session, setSession] = useState(undefined)     // undefined = still loading
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  return session
}

// ---- files in the private "files" bucket (same shape as the old browser-storage helpers) ----
export const filePut = async (key, blob) => {
  const { error } = await supabase.storage.from('files').upload(key, blob, { contentType: blob.type || 'application/octet-stream', upsert: false })
  if (error) throw error
}
export const fileGet = async key => {
  const { data, error } = await supabase.storage.from('files').download(key)
  if (error) return null
  return data
}
export const fileDel = async key => { try { await supabase.storage.from('files').remove([key]) } catch { /* ignore */ } }
