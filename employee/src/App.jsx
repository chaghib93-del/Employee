import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import logoUrl from './logo.png'
import * as XLSX from 'xlsx'

const DEG = [['matric','Matric'],['fsc','FA/FSc'],['ba','BA/BSc/BS'],['prof','Professional Degree']]
const ST = ['Verified','Not verified','Pending','N/A']
const COL = { Verified:'var(--ok)', 'Not verified':'var(--no)', Pending:'var(--pe)', 'N/A':'var(--na)' }
const DECS = ['Under review','Appointment upheld','Grievance accepted','Referred back to DEO']
const FINAL_DECS = ['Appointment upheld', 'Grievance accepted']
// A phase is assigned to all districts or to a list of districts (older phases without the field mean all districts)
const inPhase = (p, d) => !p.districts || p.districts === 'all' || p.districts.includes(d)
const distTxt = p => !p.districts || p.districts === 'all' ? 'All districts' : p.districts.join(', ')
const DISTRICTS = ['Quetta','Pishin','Killa Abdullah','Chaman']
const ROLE_NAME = { entry:'Entry level operator', deo:'District Education Officer', dir:'Director / Admin level', ad:'Assistant Director', ops:'Office entry operator' }
const ROLE_TXT = {
  entry:'Enter your district’s employee records and degree numbers.',
  deo:'Comment on appointments in your district and add entry level operators.',
  dir:'Verify degrees, decide grievances, add District Education Officers and Assistant Directors, post notices and control Review access.',
  ad:'Assist the Director: review and verify records across districts, post notices and add office entry operators.',
  ops:'Enter employee records for any district, assisting your Assistant Director.',
}
// Demo accounts. Replace with a real backend (see README) before real use.
const SEED_USERS = [
  { u:'admin1', p:'admin123', role:'dir' },
  { u:'deo.quetta', p:'deo123', role:'deo', district:'Quetta' },
  { u:'deo.pishin', p:'deo123', role:'deo', district:'Pishin' },
  { u:'entry.quetta', p:'entry123', role:'entry', district:'Quetta' },
  { u:'ad1', p:'ad123', role:'ad' },
]
const uid = () => Math.random().toString(36).slice(2, 9)
const an = s => s.replace(/[^A-Za-z0-9\-/ ]/g, '')
const auto = v => (v.trim() ? 'Pending' : 'N/A')
const V='Verified', X='Not verified', P='Pending', N='N/A'
const mk = (name,father,gender,desig,district,m,f,b,p,x={}) => ({ id:uid(), name,father,gender,desig,district,
  matric:m[0],matricS:m[1], fsc:f[0],fscS:f[1], ba:b[0],baS:b[1], prof:p[0],profS:p[1], ...x })
const SAMPLE = [
  mk('Ali Raza','Muhammad Aslam','Male','Procurement Officer','Quetta',['QTA10231',V],['QTA20877',V],['UOB30412',V],['',N],{deo:'Documents verified; appointment satisfactory.'}),
  mk('Sana Malik','Abdul Malik','Female','Assistant Manager','Quetta',['QTA10544',V],['QTA20931',V],['UOB30677',V],['MBA-7781',V]),
  mk('Bilal Ahmed','Ahmed Tariq','Male','Site Engineer','Quetta',['QTA10688',V],['QTA21002',V],['UOB30790',P],['PEC-4410',P]),
  mk('Hina Khan','Khalid Khan','Female','Data Entry Operator','Quetta',['QTA10712',V],['QTA21113',P],['',N],['',N],{grv:'Appointment letter issued without merit list display.',deo:'Documents complete; FSc verification awaited from Board.'}),
  mk('Usman Tariq','Tariq Mehmood','Male','Driver','Pishin',['PSH10021',V],['',N],['',N],['',N]),
  mk('Ayesha Noor','Iqbal Hussain','Female','Accounts Officer','Pishin',['PSH10090',V],['PSH20144',V],['UOB31020',V],['ACCA-2210',P]),
  mk('Imran Shah','Shah Nawaz','Male','Civil Engineer','Quetta',['QTA10901',V],['QTA21340',V],['BUET-5521',V],['PEC-8812',X],{grv:'Complaint about delay in posting order.',deo:'Degree verification flagged; recommended hold.',dec:'Under review',dir:'Verification report requested from university.'}),
  mk('Farah Iqbal','Iqbal Ahmed','Female','Office Assistant','Killa Abdullah',['KLA10033',V],['KLA20010',V],['UOB31201',P],['',N]),
  mk('Kamran Ali','Ali Akbar','Male','Store Keeper','Killa Abdullah',['KLA10077',P],['',N],['',N],['',N]),
  mk('Zahid Mehmood','Mehmood Khan','Male','Junior Clerk','Pishin',['PSH10150',V],['PSH20201',V],['',N],['',N]),
].map(r => ({ ...r, phase: 'sbk' }))
const SAMPLE_PHASES = [{ id: 'sbk', name: 'SBK', at: Date.now(), by: 'admin1', status: 'Active', districts: 'all' }]

function usePersist(key, init) {
  const [v, setV] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init } catch { return init } })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }, [key, v])
  return [v, setV]
}
const Pill = ({ s }) => <span className="pill" style={{ background: COL[s] }}>{s}</span>
const Logo = ({ logo }) => <div className="logo"><img src={logo || logoUrl} alt="Government of Balochistan logo" /></div>
function Header({ logo, who, right }) {
  return <div className="hdr"><Logo logo={logo} />
    <div className="ht"><div className="gov">Government of Balochistan</div><h1>Directorate of Education (Schools) Quetta Division</h1>{who && <div className="who">{who}</div>}</div>{right}</div>
}

function Login({ users, logo, onLogin }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('')
  const go = e => {
    e.preventDefault()
    const m = users.find(x => x.u === u.trim().toLowerCase() && x.p === p)
    m ? onLogin(m.u) : setErr('Wrong username or password. Check both and try again.')
  }
  return (
    <div className="wrap"><Header logo={logo} />
      <form className="card login" onSubmit={go} style={{ marginTop: 20 }}>
        <h2>Sign in</h2>
        <label className="kl">Username</label><input value={u} onChange={e => setU(e.target.value)} autoComplete="username" />
        <label className="kl">Password</label><input type="password" value={p} onChange={e => setP(e.target.value)} autoComplete="current-password" />
        {err && <div className="err">{err}</div>}
        <button type="submit">Sign in</button>
        <div className="demo"><b>Demo accounts</b><br />Director / Admin: admin1 / admin123<br />DEO Quetta: deo.quetta / deo123<br />Entry operator Quetta: entry.quetta / entry123<br />Assistant Director: ad1 / ad123</div>
      </form></div>
  )
}

function Team({ user, users, setUsers }) {
  const role = user.role
  const [f, setF] = useState({ u: '', p: '', district: '', kind: 'deo' }); const [err, setErr] = useState('')
  const list = users.filter(x => role === 'dir' ? (x.role === 'deo' || x.role === 'ad') : role === 'deo' ? (x.role === 'entry' && x.district === user.district) : (x.role === 'ops' && x.owner === user.u))
  const title = role === 'dir' ? 'District Education Officers and Assistant Directors' : role === 'deo' ? 'Entry level operators' : 'Office entry operators'
  const kind = role === 'dir' ? f.kind : role === 'deo' ? 'entry' : 'ops'
  const add = () => {
    const u = f.u.trim().toLowerCase(), d = f.district.trim()
    if (!u || f.p.length < 6 || (kind === 'deo' && !d)) return setErr(kind === 'deo' ? 'Enter a district, a username and a password of 6 or more characters.' : 'Enter a username and a password of 6 or more characters.')
    if (users.some(x => x.u === u)) return setErr('That username is taken. Choose another.')
    setUsers([...users, { u, p: f.p, role: kind, ...(kind === 'deo' ? { district: d } : {}), ...(kind === 'entry' ? { district: user.district } : {}), ...(kind === 'ops' ? { owner: user.u } : {}) }])
    setF({ ...f, u: '', p: '', district: '' }); setErr('')
  }
  return (
    <details className="card"><summary>{title} ({list.length})</summary>
      <div className="f" style={{ marginTop: 10 }}>
        {role === 'dir' && <select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="deo">District Education Officer</option><option value="ad">Assistant Director</option></select>}
        {kind === 'deo' && <><input list="dl" placeholder="District" value={f.district} onChange={e => setF({ ...f, district: e.target.value })} /><datalist id="dl">{DISTRICTS.map(d => <option key={d} value={d} />)}</datalist></>}
        <input placeholder="Username" value={f.u} onChange={e => setF({ ...f, u: e.target.value })} />
        <input type="password" placeholder="Password (6+ characters)" value={f.p} onChange={e => setF({ ...f, p: e.target.value })} />
        <button onClick={add}>Add {ROLE_NAME[kind]}</button>
      </div>
      {err && <div className="err" style={{ marginTop: 6 }}>{err}</div>}
      {list.length > 0 && <div className="tw"><table><thead><tr><th>Username</th><th>Level</th><th>District</th><th /></tr></thead>
        <tbody>{list.map(x => <tr key={x.u}><td>{x.u}</td><td>{ROLE_NAME[x.role]}</td><td>{x.district || '—'}</td><td><button className="sm g" onClick={() => setUsers(users.filter(y => y.u !== x.u))}>Remove</button></td></tr>)}</tbody></table></div>}
    </details>
  )
}

function Review({ e, role, real, onSave, onClose }) {
  const [t, setT] = useState(role === 'entry' ? (e.grv || '') : role === 'deo' ? (e.deo || '') : (e.dir || ''))
  const [dec, setDec] = useState(e.dec || DECS[0])
  const [gv, setGv] = useState(e.grv || '')
  useEffect(() => { const h = ev => ev.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])
  const [v, setV] = useState({ matric: e.matric, fsc: e.fsc, ba: e.ba, prof: e.prof })
  const [s, setS] = useState({ matricS: e.matricS, fscS: e.fscS, baS: e.baS, profS: e.profS })
  const ro = (l, x) => <p className="kl"><b>{l}:</b> {x || '—'}</p>
  const [pf, setPf] = useState({}); const [rm, setRm] = useState({}); const [ferr, setFerr] = useState(''); const [busy, setBusy] = useState(false)
  const pickDeg = (k, ev) => {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return
    if (!DEG_TYPES.includes(f.type)) return setFerr(`${f.name}: attach a PDF, JPG or PNG file.`)
    if (f.size > DEG_MAX) return setFerr(`${f.name} is over 10 MB. Attach a smaller file.`)
    setFerr(''); setPf({ ...pf, [k]: f }); setRm({ ...rm, [k]: false })
  }
  const dropDeg = k => { const n = { ...pf }; delete n[k]; setPf(n); setRm({ ...rm, [k]: true }) }
  const viewDeg = async f => { setFerr(''); try { if (!(await openStored(f))) setFerr(`${f.name} is not stored in this browser.`) } catch { setFerr('The file could not be opened.') } }
  const saveDir = async () => {
    setBusy(true); setFerr('')
    const next = { ...(e.degFiles || {}) }; const added = []; const drop = []
    try {
      for (const [k] of DEG) {
        if (pf[k]) { const id = uid() + uid(); await idbPut(id, pf[k]); added.push(id); if (next[k]) drop.push(next[k].id); next[k] = { id, name: pf[k].name, size: pf[k].size, type: pf[k].type, at: Date.now() } }
        else if (rm[k] && next[k]) { drop.push(next[k].id); delete next[k] }
      }
    } catch { await Promise.all(added.map(idbDel)); setBusy(false); return setFerr('The files could not be saved. Browser storage may be full or blocked.') }
    drop.forEach(idbDel); setBusy(false)
    onSave({ ...s, grv: gv, dir: t, dec, degFiles: next })
  }
  const save = () => {
    if (role === 'entry') {
      const p = { grv: t }
      DEG.forEach(([k]) => { p[k] = v[k]; if (v[k] !== e[k]) p[k + 'S'] = auto(v[k]) })
      return onSave(p)
    }
    if (role === 'dir') return saveDir()
    onSave({ deo: t })
  }
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h2>{e.name} (s/o {e.father || '—'}), {e.district}</h2>
      <div className="kl" style={{ marginBottom: 6 }}>{e.desig || '—'} · {e.gender || '—'}</div>
      <div className="f" style={{ marginBottom: 8 }}>
        {DEG.map(([k, l]) => <label key={k} className="kl">{l}<br />
          {role === 'entry' ? <input value={v[k]} onChange={ev => setV({ ...v, [k]: an(ev.target.value) })} placeholder="Number or blank" /> : <span>{e[k] || '—'} </span>}
          {role === 'dir' ? <select value={s[k + 'S']} onChange={ev => setS({ ...s, [k + 'S']: ev.target.value })}>{ST.map(x => <option key={x}>{x}</option>)}</select> : <Pill s={e[k + 'S']} />}</label>)}
      </div>
      {real === 'ad' && <div style={{ marginBottom: 8 }}>
        <label className="kl"><b>Verified degree documents</b> (PDF, JPG or PNG, up to 10 MB each)</label>
        {DEG.map(([k, l]) => { const cur = rm[k] ? null : e.degFiles?.[k]; const nf = pf[k]
          return <div className="f" key={k} style={{ margin: '4px 0' }}>
            <span className="kl" style={{ width: 120 }}>{l}</span>
            {nf ? <span className="kl">{nf.name} ({sizeTxt(nf.size)}) will be saved</span>
              : cur ? <a href="#" onClick={ev => { ev.preventDefault(); viewDeg(cur) }}>{cur.name} ({sizeTxt(cur.size)})</a> : <span className="kl">No file uploaded</span>}
            <label className="btnl" style={{ padding: '3px 8px', fontSize: 12 }}>{cur || nf ? 'Replace' : 'Upload'}<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden onChange={ev => pickDeg(k, ev)} /></label>
            {(cur || nf) && <button type="button" className="sm g" onClick={() => dropDeg(k)}>Remove</button>}
            {(cur || nf) && s[k + 'S'] !== V && <button type="button" className="sm g" onClick={() => setS({ ...s, [k + 'S']: V })}>Mark as Verified</button>}
          </div> })}
        {ferr && <div className="err" style={{ marginTop: 6 }}>{ferr}</div>}</div>}
      {(role === 'deo' || real === 'dir') && DEG.some(([k]) => e.degFiles?.[k]) && <div style={{ marginBottom: 8 }}>
        <label className="kl"><b>Verified degree documents</b> (uploaded by the Assistant Director)</label>
        {DEG.filter(([k]) => e.degFiles?.[k]).map(([k, l]) => <div className="f" key={k} style={{ margin: '4px 0' }}>
          <span className="kl" style={{ width: 120 }}>{l}</span>
          <a href="#" onClick={ev => { ev.preventDefault(); viewDeg(e.degFiles[k]) }}>{e.degFiles[k].name} ({sizeTxt(e.degFiles[k].size)})</a></div>)}
        {ferr && <div className="err" style={{ marginTop: 6 }}>{ferr}</div>}</div>}
      {role === 'deo' && ro('Grievance', e.grv)}
      {role === 'dir' && <><label className="kl">Grievance</label><textarea value={gv} onChange={ev => setGv(ev.target.value)} /></>}
      {role === 'dir' && ro('DEO comments', e.deo)}
      {role === 'dir' && <label className="kl">Decision <select value={dec} onChange={ev => setDec(ev.target.value)}>{DECS.map(d => <option key={d}>{d}</option>)}</select></label>}
      <div style={role === 'deo' ? { marginTop: 8, padding: 10, border: '2px solid var(--ac)', borderRadius: 8 } : undefined}>
        <label className="kl" style={{ display: 'block', marginTop: role === 'deo' ? 0 : 6 }}>{role === 'entry' ? 'Grievance (if any)' : role === 'deo' ? <><b>DEO comments</b> on this candidate’s data</> : 'Div: Director comments'}</label>
        <textarea value={t} onChange={ev => setT(ev.target.value)} placeholder={role === 'entry' ? '' : role === 'deo' ? 'Write your comments on the degrees, documents and grievance of this candidate' : 'Write the Div: Director comments for this employee'} /></div>
      <div className="f" style={{ marginTop: 8 }}><button disabled={busy} onClick={save}>{busy ? 'Saving…' : role === 'deo' ? 'Save DEO comments' : 'Save'}</button><button className="g" onClick={onClose}>Close</button></div>
    </div>
  )
}

function AddForm({ onAdd }) {
  const blank = { name: '', father: '', gender: 'Male', desig: '', matric: '', fsc: '', ba: '', prof: '' }
  const [f, setF] = useState(blank)
  const s = (k, clean) => ev => setF({ ...f, [k]: clean ? an(ev.target.value) : ev.target.value })
  const go = () => {
    if (!f.name.trim()) return
    const r = { ...f, id: uid(), name: f.name.trim(), desig: f.desig || '—' }
    DEG.forEach(([k]) => { r[k + 'S'] = auto(f[k]) })
    onAdd([r]); setF(blank)
  }
  return (
    <details className="card" open><summary>Add employee</summary>
      <div className="f" style={{ marginTop: 10 }}>
        <input placeholder="Name" value={f.name} onChange={s('name')} />
        <input placeholder="Father name" value={f.father} onChange={s('father')} />
        <select value={f.gender} onChange={s('gender')}><option>Male</option><option>Female</option></select>
        <input placeholder="Designation" value={f.desig} onChange={s('desig')} />
        {DEG.map(([k, l]) => <input key={k} placeholder={`${l} number`} value={f[k]} onChange={s(k, 1)} />)}
        <button onClick={go}>Add employee</button>
      </div>
      <p className="sub">Degree numbers use letters and digits. The Director / Admin level marks each one Verified, Not verified, Pending or N/A.</p>
    </details>
  )
}

// ---- Smart import: reads an Excel or CSV sheet and matches its column headings to our own fields
const sNorm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
const hSim = (h, t) => {
  const a = sNorm(h), b = sNorm(t); if (!a || !b) return 0; if (a === b) return 1
  const ta = a.split(' '), tb = b.split(' '); const jac = ta.filter(x => tb.includes(x)).length / new Set([...ta, ...tb]).size
  const sub = Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a)) ? 0.7 : 0
  return Math.max(jac * 0.9, sub, (1 - lev(a, b) / Math.max(a.length, b.length)) * 0.85)
}
const toDate = v => {
  const pad = n => String(n).padStart(2, '0'); const mk = (y, m, d) => +m >= 1 && +m <= 12 && +d >= 1 && +d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : ''
  if (v instanceof Date) { if (isNaN(v)) return ''; const t = new Date(v.getTime() + 12 * 36e5); return mk(t.getFullYear(), t.getMonth() + 1, t.getDate()) }
  const s = String(v ?? '').trim(); if (!s) return ''
  if (isFinite(s) && +s > 20000 && +s < 80000) return new Date(Math.round((+s - 25569) * 864e5)).toISOString().slice(0, 10)
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/); if (m) return mk(m[1], m[2], m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); if (m) return mk(m[3], m[2], m[1])
  const d = new Date(s); return isNaN(d) ? '' : toDate(d)
}
const cell = v => v instanceof Date ? toDate(v) : String(v ?? '').trim()
const contentScore = (f, vals) => {
  const v = vals.map(cell).filter(Boolean); if (!v.length) return 0
  const frac = fn => v.filter(fn).length / v.length
  if (f.k === 'gender') return frac(x => /^(m|f|male|female|man|woman)$/i.test(x)) > 0.8 ? 0.75 : 0
  if (f.k === 'aRel') return frac(x => FQ_REL.some(r => r.toLowerCase() === x.toLowerCase())) > 0.8 ? 0.75 : 0
  if (f.k === 'dBps') return frac(x => /^\d{1,2}$/.test(x) && +x >= 1 && +x <= 22) > 0.8 ? 0.5 : 0
  return 0
}
const smartMatch = (headers, rows, fields) => {
  const cand = []
  fields.forEach(f => headers.forEach((h, c) => {
    if (!String(h).trim()) return
    const head = Math.max(...[f.l, ...f.syn].map(t => hSim(h, t))); const sc = Math.max(head, contentScore(f, rows.slice(0, 50).map(r => r[c])))
    if (sc >= 0.55) cand.push({ k: f.k, c, sc })
  }))
  cand.sort((a, b) => b.sc - a.sc); const map = {}, conf = {}, used = new Set()
  cand.forEach(x => { if (map[x.k] === undefined && !used.has(x.c)) { map[x.k] = x.c; conf[x.k] = x.sc; used.add(x.c) } })
  return { map, conf }
}
const readSheet = async file => {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]; if (!ws) throw new Error('The file has no sheets.')
  const all = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false })
  const top = all.slice(0, 15); const cnt = r => r.filter(x => String(x).trim()).length
  let hi = top.findIndex(r => cnt(r) >= 3); if (hi < 0) hi = top.reduce((b, r, i) => cnt(r) > cnt(top[b]) ? i : b, 0)
  if (!top[hi]) throw new Error('No data found in the first sheet.')
  return { name: wb.SheetNames[0], headers: top[hi].map(x => cell(x)), rows: all.slice(hi + 1).filter(r => cnt(r) > 0) }
}
const EMP_FIELDS = [
  { k: 'name', l: 'Name', req: true, syn: ['employee name', 'full name', 'name of employee', 'emp name', 'staff name'] },
  { k: 'father', l: 'Father name', syn: ['father', 'fathers name', 'father s name', 's o', 'son of', 'guardian', 'father husband name'] },
  { k: 'gender', l: 'Gender', note: 'Imported as Male', syn: ['sex', 'male female', 'm f'] },
  { k: 'desig', l: 'Designation', req: true, syn: ['post', 'position', 'job title', 'rank', 'title', 'post held', 'current post', 'designation of employee'] },
  { k: 'matric', l: 'Matric degree no.', syn: ['matric', 'matriculation', 'ssc', 'secondary school certificate', 'matric degree', 'matric certificate no', '10th', 'matric roll no'] },
  { k: 'fsc', l: 'FA/FSc degree no.', syn: ['fa', 'fsc', 'f sc', 'fa fsc', 'hssc', 'intermediate', 'inter', 'higher secondary', '12th', 'intermediate certificate no'] },
  { k: 'ba', l: 'BA/BSc/BS degree no.', syn: ['ba', 'bsc', 'bs', 'b a', 'b sc', 'ba bsc bs', 'bachelor', 'bachelors', 'graduation', 'graduate degree', 'bachelor degree no'] },
  { k: 'prof', l: 'Professional degree no.', syn: ['professional', 'prof degree', 'master', 'masters', 'ma msc', 'mba', 'bed', 'm ed', 'mphil', 'engineering degree', 'technical qualification'] },
]
const FQ_FIELDS = [
  { k: 'dName', l: 'Deceased employee name', req: true, syn: ['deceased name', 'deceased employee', 'name of deceased', 'late employee', 'deceased', 'name of deceased employee', 'late'] },
  { k: 'dPno', l: 'Deceased employee personal No.', syn: ['personal no', 'personal number', 'p no', 'pno', 'personnel no', 'personnel number', 'employee no', 'employee number', 'emp no', 'service no', 'p.no'] },
  { k: 'dDesig', l: 'Deceased employee designation', req: true, syn: ['deceased designation', 'designation', 'post of deceased', 'designation of deceased', 'last post held'] },
  { k: 'dBps', l: 'BPS', syn: ['bps', 'pay scale', 'scale', 'grade', 'bps scale'] },
  { k: 'dDeath', l: 'Date of death', req: true, syn: ['death date', 'died on', 'dod', 'death', 'date of demise', 'demise date'] },
  { k: 'aName', l: 'Applicant name', req: true, syn: ['applicant', 'name of applicant', 'candidate', 'candidate name', 'dependent', 'legal heir', 'heir name', 'name'] },
  { k: 'aRel', l: 'Relation to deceased', syn: ['relation', 'relationship', 'relation with deceased', 'rel'] },
  { k: 'aDob', l: 'Applicant date of birth', req: true, syn: ['date of birth', 'dob', 'birth date', 'applicant dob', 'd o b'] },
  { k: 'aQual', l: 'Applicant qualification', req: true, syn: ['qualification', 'education', 'educational qualification', 'academic qualification'] },
  { k: 'post', l: 'Post applied for', req: true, syn: ['post applied', 'applied post', 'post', 'applied for', 'desired post', 'post sought', 'position applied'] },
]
const empConvert = g => {
  if (!g('name')) return 'missing name'; if (!g('desig')) return 'missing designation'
  const o = { id: uid(), name: g('name'), father: g('father'), gender: /^(f|female|woman|girl)/i.test(g('gender')) ? 'Female' : 'Male', desig: g('desig'), matric: an(g('matric')), fsc: an(g('fsc')), ba: an(g('ba')), prof: an(g('prof')) }
  DEG.forEach(([k]) => { o[k + 'S'] = auto(o[k]) }); return o
}
const relOf = v => FQ_REL.find(r => r.toLowerCase() === v.toLowerCase()) || FQ_REL.find(r => v.toLowerCase().startsWith(r.toLowerCase())) || ''
const fqConvert = g => {
  const o = { dName: g('dName'), dPno: g('dPno'), dDesig: g('dDesig'), dBps: /^\d{1,2}$/.test(g('dBps')) && +g('dBps') >= 1 && +g('dBps') <= 22 ? g('dBps') : '', dDeath: toDate(g('dDeath')), aName: g('aName'), aRel: relOf(g('aRel')), aDob: toDate(g('aDob')), aQual: g('aQual'), post: g('post') }
  const miss = [['dName', 'deceased employee name'], ['dDesig', 'deceased designation'], ['dDeath', 'a valid date of death'], ['aName', 'applicant name'], ['aRel', 'a recognised relation (son, daughter, wife, husband, brother, sister)'], ['aDob', 'a valid date of birth'], ['aQual', 'qualification'], ['post', 'post applied for']].find(([k]) => !o[k])
  return miss ? `missing ${miss[1]}` : o
}

function SmartImport({ fields, convert, noun, onRows }) {
  const [sh, setSh] = useState(null); const [map, setMap] = useState({}); const [conf, setConf] = useState({}); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const pick = async ev => {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return
    setErr(''); setBusy(true)
    try { const s = await readSheet(f); if (!s.rows.length) throw new Error('No data rows were found under the column headings.'); const m = smartMatch(s.headers, s.rows, fields); setSh({ ...s, file: f.name }); setMap(m.map); setConf(m.conf) }
    catch (e) { setSh(null); setErr(e?.message || 'That file could not be read. Use an .xlsx, .xls or .csv file.') }
    setBusy(false)
  }
  const reset = () => { setSh(null); setMap({}); setConf({}); setErr('') }
  const get = (r, k) => map[k] === undefined ? '' : cell(r[map[k]])
  const built = sh ? sh.rows.map(r => convert(k => get(r, k))) : []
  const good = built.filter(x => x && typeof x === 'object'); const bad = built.filter(x => !x || typeof x === 'string')
  const miss = fields.filter(f => f.req && map[f.k] === undefined)
  const setCol = (k, v) => { const m = { ...map }; if (v < 0) delete m[k]; else { Object.keys(m).forEach(x => { if (m[x] === v) delete m[x] }); m[k] = v } setMap(m); setConf({ ...conf, [k]: 2 }) }
  const badge = k => map[k] === undefined ? <span className="kl">Not matched</span> : conf[k] > 1 ? <span className="kl">Set by you</span> : <span className="ok">{conf[k] >= 0.9 ? 'Matched' : `Likely (${Math.round(conf[k] * 100)}%)`}</span>
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="f"><label className="btnl">{busy ? 'Reading…' : `Upload Excel or CSV with smart column matching`}<input type="file" hidden accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={pick} /></label>
        {sh && <button className="g" onClick={reset}>Cancel</button>}</div>
      <p className="sub" style={{ margin: '4px 0' }}>Your column headings can be in any order and wording. They are matched to our columns automatically and you can adjust each match before importing. Nothing leaves your browser.</p>
      {err && <div className="err">{err}</div>}
      {sh && <div className="card" style={{ marginTop: 6 }}>
        <div className="kl"><b>{sh.file}</b> · sheet “{sh.name}” · {sh.rows.length} data rows · {sh.headers.filter(Boolean).length} columns</div>
        <div className="tw"><table><thead><tr><th>Our column</th><th>Column in your file</th><th>Match</th><th>Example</th></tr></thead>
          <tbody>{fields.map(f => <tr key={f.k}><td>{f.l}{f.req && ' *'}</td>
            <td><select value={map[f.k] ?? -1} onChange={e => setCol(f.k, +e.target.value)}><option value={-1}>Not in my file</option>{sh.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}</select></td>
            <td>{badge(f.k)}{map[f.k] === undefined && f.note && !f.req && <div className="kl">{f.note}</div>}</td>
            <td className="cm">{map[f.k] !== undefined ? (sh.rows.map(r => cell(r[map[f.k]])).find(Boolean) || '—') : '—'}</td></tr>)}</tbody></table></div>
        {miss.length > 0 && <div className="err" style={{ marginTop: 6 }}>Choose a column for: {miss.map(f => f.l).join(', ')}.</div>}
        {good.length > 0 && <div className="tw" style={{ marginTop: 6 }}><div className="kl">Preview of the first {Math.min(3, good.length)} {noun} rows</div><table><thead><tr>{fields.map(f => <th key={f.k}>{f.l}</th>)}</tr></thead>
          <tbody>{good.slice(0, 3).map((r, i) => <tr key={i}>{fields.map(f => <td key={f.k}>{r[f.k] || '—'}</td>)}</tr>)}</tbody></table></div>}
        {bad.length > 0 && <div className="kl" style={{ marginTop: 6 }}>{bad.length} row{bad.length > 1 ? 's' : ''} will be skipped{typeof bad.find(x => typeof x === 'string') === 'string' ? ` (for example: ${bad.find(x => typeof x === 'string')})` : ''}.</div>}
        <div className="f" style={{ marginTop: 8 }}><button disabled={miss.length > 0 || !good.length} onClick={() => { onRows(good); reset() }}>Import {good.length} {noun} row{good.length === 1 ? '' : 's'}</button><button className="g" onClick={reset}>Cancel</button></div>
      </div>}
    </div>
  )
}

function Import({ district, onAdd, onClear }) {
  const [t, setT] = useState('')
  const go = () => {
    const r = t.split('\n').map(l => l.split(',').map(c => c.trim())).filter(c => c.length >= 8 && c[0])
      .map(c => { const o = { id: uid(), name: c[0], father: c[1], gender: /^f/i.test(c[2]) ? 'Female' : 'Male', desig: c[3], district, matric: an(c[4]), fsc: an(c[5]), ba: an(c[6]), prof: an(c[7]) }
        DEG.forEach(([k]) => { o[k + 'S'] = auto(o[k]) }); return o })
    if (r.length) { onAdd(r); setT('') }
  }
  return (
    <details className="card"><summary>Import Excel, CSV or clear data</summary>
      <SmartImport fields={EMP_FIELDS} convert={empConvert} noun="employee" onRows={r => onAdd(r.map(x => ({ ...x, district })))} />
      <p className="sub">Or paste rows with no header: name, father name, gender, designation, matric, fa/fsc, ba/bsc/bs, professional degree.</p>
      <textarea value={t} onChange={e => setT(e.target.value)} placeholder="Ali Raza,Muhammad Aslam,Male,Procurement Officer,QTA10231,QTA20877,UOB30412," />
      <div className="f" style={{ marginTop: 8 }}><button onClick={go}>Import rows</button>{onClear && <button className="g" onClick={onClear}>Clear all data</button>}</div>
    </details>
  )
}

const AUD = { all:'Everyone', deo:'District Education Officers', entry:'Entry level operators', ad:'Assistant Directors' }
const inAud = (x, a) => a === 'all' || (a === 'deo' && x.role === 'deo') || (a === 'entry' && (x.role === 'entry' || x.role === 'ops')) || (a === 'ad' && x.role === 'ad')

function Inbox({ user, users, setUsers, notes, setNotes }) {
  const mine = notes.filter(n => n.to === user.u && !n.delTo).sort((a, b) => b.at - a.at)
  const sent = notes.filter(n => n.from === user.u && !n.sys && !n.delFrom).sort((a, b) => b.at - a.at)
  const [tab, setTab] = useState('in')
  const mark = (id, key) => setNotes(a => a.map(x => x.id === id ? { ...x, [key]: true } : x).filter(x => !(x.delTo && (x.delFrom || x.sys))))
  const rule = x => user.role === 'dir' ? (x.role === 'deo' || x.role === 'ad')
    : user.role === 'ad' ? (x.role === 'dir' || x.role === 'deo' || (x.role === 'ops' && x.owner === user.u))
    : user.role === 'deo' ? (x.role === 'dir' || x.role === 'ad' || (x.role === 'entry' && x.district === user.district))
    : user.role === 'entry' ? (x.role === 'deo' && x.district === user.district) : x.u === user.owner
  const senders = mine.map(n => n.from)
  const targets = users.filter(x => x.u !== user.u && (rule(x) || senders.includes(x.u)))
  const [to, setTo] = useState(''); const [text, setText] = useState(''); const [re, setRe] = useState(null)
  const [pw, setPw] = useState({ cur: '', nw: '', cf: '' }); const [pm, setPm] = useState('')
  const label = x => `${x.u} (${ROLE_NAME[x.role]}${x.district ? ' ' + x.district : ''})`
  const send = () => {
    const r = to || targets[0]?.u
    if (!r || !text.trim()) return
    setNotes(n => [...n, { id: uid(), to: r, from: user.u, text: text.trim(), quote: re ? re.text.slice(0, 80) : undefined, at: Date.now(), read: false }]); setText(''); setRe(null)
  }
  const reply = n => { setTo(n.from); setRe(n); setNotes(a => a.map(x => x.id === n.id ? { ...x, read: true } : x)) }
  const changePw = () => {
    const me = users.find(x => x.u === user.u)
    if (pw.cur !== me.p) return setPm('Current password is wrong.')
    if (pw.nw.length < 6) return setPm('New password must be 6 or more characters.')
    if (pw.nw !== pw.cf) return setPm('The two new passwords do not match.')
    setUsers(users.map(x => x.u === me.u ? { ...x, p: pw.nw } : x)); setPw({ cur: '', nw: '', cf: '' }); setPm('Password changed.')
  }
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="f" style={{ justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>Messages and notifications</h2>
        <button className="sm g" onClick={() => setNotes(n => n.map(x => x.to === user.u ? { ...x, read: true } : x))}>Mark all read</button></div>
      <div className="f" style={{ marginTop: 8 }}>
        <button className={tab === 'in' ? 'sm' : 'sm g'} onClick={() => setTab('in')}>Inbox ({mine.length})</button>
        <button className={tab === 'out' ? 'sm' : 'sm g'} onClick={() => setTab('out')}>Sent ({sent.length})</button></div>
      <div className="inb">
        {tab === 'in' && mine.length === 0 && <p className="sub">Your inbox is empty.</p>}
        {tab === 'out' && sent.length === 0 && <p className="sub">You have not sent any messages.</p>}
        {tab === 'in' && mine.map(n => <div key={n.id} className={n.read ? 'msg' : 'msg new'}>
          {n.quote && <div className="kl"><i>In reply to: {n.quote}</i></div>}<div>{n.text}</div>
          <div className="kl">From {n.from} · {new Date(n.at).toLocaleString()} <button className="sm g" onClick={() => reply(n)}>Reply</button> <button className="sm g" onClick={() => mark(n.id, 'delTo')}>Delete</button></div></div>)}
        {tab === 'out' && sent.map(n => <div key={n.id} className="msg">
          {n.quote && <div className="kl"><i>In reply to: {n.quote}</i></div>}<div>{n.text}</div>
          <div className="kl">To {n.to} · {new Date(n.at).toLocaleString()} <button className="sm g" onClick={() => mark(n.id, 'delFrom')}>Delete</button></div></div>)}</div>
      {targets.length > 0 && <>
        {re && <div className="kl" style={{ marginTop: 8 }}>Replying to {re.from}: “{re.text.slice(0, 60)}” <button className="sm g" onClick={() => setRe(null)}>Cancel</button></div>}
        <div className="f" style={{ marginTop: 8 }}>
          <select value={to || targets[0].u} onChange={e => setTo(e.target.value)}>{targets.map(x => <option key={x.u} value={x.u}>{label(x)}</option>)}</select>
          <input style={{ flex: 1, minWidth: 180 }} placeholder="Write a message" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
          <button onClick={send}>Send</button></div></>}
      <details style={{ marginTop: 12 }}><summary>Change password</summary>
        <div className="f" style={{ marginTop: 8 }}>
          <input type="password" placeholder="Current password" value={pw.cur} onChange={e => setPw({ ...pw, cur: e.target.value })} />
          <input type="password" placeholder="New password (6+ characters)" value={pw.nw} onChange={e => setPw({ ...pw, nw: e.target.value })} />
          <input type="password" placeholder="Confirm new password" value={pw.cf} onChange={e => setPw({ ...pw, cf: e.target.value })} />
          <button onClick={changePw}>Change password</button></div>
        {pm && <div className={pm === 'Password changed.' ? 'ok' : 'err'} style={{ marginTop: 6 }}>{pm}</div>}</details>
    </div>
  )
}

function Notices({ user, users, notices, setNotices, setNotes }) {
  const canPost = user.role === 'dir' || user.role === 'ad'
  const [f, setF] = useState({ title: '', body: '', aud: 'all' }); const [files, setFiles] = useState([]); const [err, setErr] = useState('')
  const visible = notices.filter(n => user.role === 'dir' || n.from === user.u || inAud(user, n.aud))
  const pick = async ev => {
    const list = [...ev.target.files]; ev.target.value = ''
    if (files.length + list.length > 5) return setErr('You can attach up to 5 documents.')
    const big = list.find(x => x.size > 800000)
    if (big) return setErr(`${big.name} is over 800 KB. Attach a smaller file.`)
    const read = x => new Promise(res => { const r = new FileReader(); r.onload = () => res({ name: x.name, data: r.result }); r.readAsDataURL(x) })
    setFiles([...files, ...await Promise.all(list.map(read))]); setErr('')
  }
  const post = () => {
    if (!f.title.trim()) return setErr('Add a title for the notice.')
    const title = f.title.trim()
    setNotices(n => [{ id: uid(), ...f, title, from: user.u, at: Date.now(), files }, ...n])
    setNotes(n => [...n, ...users.filter(x => x.u !== user.u && inAud(x, f.aud)).map(x => ({ id: uid(), to: x.u, from: user.u, text: `New notice: ${title}`, sys: true, at: Date.now(), read: false }))])
    setF({ title: '', body: '', aud: 'all' }); setFiles([]); setErr('')
  }
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h2>Notices</h2>
      {canPost && <div style={{ marginBottom: 12 }}>
        <div className="f"><input style={{ flex: 1, minWidth: 200 }} placeholder="Notice title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
          <select value={f.aud} onChange={e => setF({ ...f, aud: e.target.value })}>{Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <textarea style={{ marginTop: 8 }} placeholder="Notice text" value={f.body} onChange={e => setF({ ...f, body: e.target.value })} />
        <div className="f" style={{ marginTop: 6 }}><label className="btnl">Attach documents<input type="file" multiple hidden onChange={pick} /></label>
          {files.map((d, i) => <span key={i} className="kl">{d.name} <button className="sm g" onClick={() => setFiles(files.filter((_, j) => j !== i))}>x</button></span>)}
          <button onClick={post}>Broadcast notice</button></div>
        {err && <div className="err" style={{ marginTop: 6 }}>{err}</div>}
        <p className="sub">Up to 5 documents, 800 KB each. Recipients also get a message alert.</p></div>}
      {visible.length === 0 && <p className="sub">No notices yet.</p>}
      {visible.map(n => <div key={n.id} className="msg"><b>{n.title}</b> <span className="kl">to {AUD[n.aud]} · from {n.from} · {new Date(n.at).toLocaleString()}</span>
        {n.body && <div style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>}
        {n.files && n.files.length > 0 && <div className="f" style={{ marginTop: 4 }}>{n.files.map((d, i) => <a key={i} href={d.data} download={d.name}>{d.name}</a>)}</div>}
        {n.from === user.u && <button className="sm g" onClick={() => setNotices(notices.filter(x => x.id !== n.id))}>Delete</button>}</div>)}
    </div>
  )
}

const CATS = ['Meeting minutes', 'Other documents']
const MB = 1048576
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('empdash-files', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
const idbPut = async (k, blob) => { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('f', 'readwrite'); t.objectStore('f').put(blob, k); t.oncomplete = res; t.onerror = () => rej(t.error) }) }
const idbGet = async k => { const db = await idb(); return new Promise((res, rej) => { const q = db.transaction('f').objectStore('f').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) }) }
const idbDel = async k => { try { const db = await idb(); return await new Promise(res => { const t = db.transaction('f', 'readwrite'); t.objectStore('f').delete(k); t.oncomplete = res; t.onerror = res }) } catch {} }
const sizeTxt = n => n >= MB ? `${(n / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
const DEG_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const DEG_MAX = 10 * MB
// Opens a stored degree scan in a new tab (falls back to a download if pop-ups are blocked).
const openStored = async f => {
  const b = await idbGet(f.id); if (!b) return false
  const u = URL.createObjectURL(b); const w = window.open(u, '_blank')
  if (!w) { const a = document.createElement('a'); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove() }
  setTimeout(() => URL.revokeObjectURL(u), 60000); return true
}

function Documents({ user, users, docs, setDocs, setNotes }) {
  const high = user.role === 'dir' || user.role === 'ad'
  const dists = [...new Set(users.filter(x => x.role === 'deo').map(x => x.district))].sort()
  const [f, setF] = useState({ title: '', cat: CATS[0], date: '', note: '', share: 'deos' })
  const [files, setFiles] = useState([]); const [err, setErr] = useState(''); const [tab, setTab] = useState('all'); const [busy, setBusy] = useState(false)
  const seen = d => d.byRole !== 'deo' && (d.share === 'deos' || d.share === 'district:' + user.district)
  const visible = docs.filter(d => (high || d.by === user.u || seen(d)) && (tab === 'all' || d.cat === tab))
  const shareTxt = d => d.byRole === 'deo' ? 'Director level' : d.share === 'deos' ? 'All DEOs' : d.share.startsWith('district:') ? `DEOs of ${d.share.slice(9)}` : 'Director level only'
  const pick = ev => {
    const list = [...ev.target.files]; ev.target.value = ''
    if (files.length + list.length > 10) return setErr('You can attach up to 10 files per upload.')
    const big = list.find(x => x.size > 25 * MB)
    if (big) return setErr(`${big.name} is over 25 MB. Attach a smaller file.`)
    setFiles([...files, ...list]); setErr('')
  }
  const post = async () => {
    const title = f.title.trim()
    if (!title) return setErr('Add a title for the document.')
    if (!files.length) return setErr('Attach at least one file.')
    setBusy(true); const meta = []
    try { for (const x of files) { const id = uid() + uid(); await idbPut(id, x); meta.push({ id, name: x.name, size: x.size }) } }
    catch { await Promise.all(meta.map(m => idbDel(m.id))); setBusy(false); return setErr('The files could not be saved. Browser storage may be full or blocked. Try fewer or smaller files.') }
    const share = user.role === 'deo' ? 'dir' : f.share
    setDocs(d => [{ id: uid(), ...f, share, title, by: user.u, byRole: user.role, district: user.district, at: Date.now(), files: meta }, ...d])
    const to = user.role === 'deo' ? users.filter(x => x.role === 'dir' || x.role === 'ad') : share === 'deos' ? users.filter(x => x.role === 'deo') : share.startsWith('district:') ? users.filter(x => x.role === 'deo' && x.district === share.slice(9)) : []
    const text = user.role === 'deo' ? `DEO ${user.district} uploaded ${f.cat.toLowerCase()}: ${title}` : `New ${f.cat.toLowerCase()} shared: ${title}`
    setNotes(n => [...n, ...to.filter(x => x.u !== user.u).map(x => ({ id: uid(), to: x.u, from: user.u, text, sys: true, at: Date.now(), read: false }))])
    setF({ title: '', cat: CATS[0], date: '', note: '', share: 'deos' }); setFiles([]); setErr(''); setBusy(false)
  }
  const get = async x => {
    setErr('')
    try {
      const b = await idbGet(x.id)
      if (!b) return setErr(`${x.name} is not stored in this browser.`)
      const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = x.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000)
    } catch { setErr('The download failed. Try again.') }
  }
  const remove = d => { (d.files || []).forEach(x => x.id && idbDel(x.id)); setDocs(a => a.filter(y => y.id !== d.id)) }
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h2>Documents and meeting minutes</h2>
      <div style={{ marginBottom: 12 }}>
        <div className="f"><input style={{ flex: 1, minWidth: 200 }} placeholder="Title (for example: Monthly review meeting)" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
          <select value={f.cat} onChange={e => setF({ ...f, cat: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
          <label className="kl">Meeting date <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
          {high && <select value={f.share} onChange={e => setF({ ...f, share: e.target.value })}><option value="deos">Share with all DEOs</option>{dists.map(d => <option key={d} value={'district:' + d}>Share with DEO {d} only</option>)}<option value="private">Director level only</option></select>}</div>
        <textarea style={{ marginTop: 8 }} placeholder="Note (optional)" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
        <div className="f" style={{ marginTop: 6 }}><label className="btnl">Choose files<input type="file" multiple hidden onChange={pick} /></label>
          {files.map((d, i) => <span key={i} className="kl">{d.name} ({sizeTxt(d.size)}) <button className="sm g" onClick={() => setFiles(files.filter((_, j) => j !== i))}>x</button></span>)}
          <button disabled={busy} onClick={post}>{busy ? 'Uploading…' : 'Upload'}</button></div>
        {err && <div className="err" style={{ marginTop: 6 }}>{err}</div>}
        <p className="sub">Up to 10 files per upload, 25 MB each. {high ? 'DEO uploads are visible to the uploader and the Director level.' : 'Your uploads are visible to you and the Director level.'}</p></div>
      <div className="f">{['all', ...CATS].map(c => <button key={c} className={tab === c ? 'sm' : 'sm g'} onClick={() => setTab(c)}>{c === 'all' ? 'All' : c}</button>)}</div>
      <div className="inb" style={{ maxHeight: 360 }}>
        {visible.length === 0 && <p className="sub">No documents yet.</p>}
        {visible.map(d => <div key={d.id} className="msg"><b>{d.title}</b> <span className="pill" style={{ background: 'var(--ac)' }}>{d.cat}</span>
          <div className="kl">{d.date ? `Meeting date ${d.date} · ` : ''}Uploaded by {d.by}{d.district ? ` (${d.district})` : ''} · {new Date(d.at).toLocaleString()} · Visible to: {shareTxt(d)}</div>
          {d.note && <div style={{ whiteSpace: 'pre-wrap' }}>{d.note}</div>}
          <div className="f" style={{ marginTop: 4 }}>{d.files.map((x, i) => x.data ? <a key={i} href={x.data} download={x.name}>{x.name}</a> : <a key={i} href="#" onClick={e => { e.preventDefault(); get(x) }}>{x.name} ({sizeTxt(x.size)})</a>)}</div>
          {(d.by === user.u || user.role === 'dir') && <button className="sm g" onClick={() => remove(d)}>Delete</button>}</div>)}</div>
    </div>
  )
}

const STC = { Verified: '#1f9d55', 'Not verified': '#d64545', Pending: '#d99a00', 'N/A': '#94a39a' }
const SBar = ({ parts }) => {
  const tot = parts.reduce((a, p) => a + p.n, 0); let at = 0
  return <svg viewBox="0 0 300 14" preserveAspectRatio="none" role="img" aria-label={parts.map(p => `${p.l}: ${p.n}`).join(', ')}>
    <rect width="300" height="14" fill="#e3e8e5" />
    {tot > 0 && parts.map((p, i) => { const w = p.n / tot * 300; const r = <rect key={i} x={at} width={w} height="14" fill={p.c} />; at += w; return r })}</svg>
}
const Donut = ({ parts }) => {
  const tot = parts.reduce((a, p) => a + p.n, 0); const C = 2 * Math.PI * 40; let at = 0
  return <svg viewBox="0 0 100 100" width="110" height="110" role="img" aria-label={parts.map(p => `${p.l}: ${p.n}`).join(', ')}>
    <circle cx="50" cy="50" r="40" fill="none" stroke="#e3e8e5" strokeWidth="18" />
    {tot > 0 && parts.filter(p => p.n > 0).map((p, i) => { const len = p.n / tot * C; const c = <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={p.c} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-at} transform="rotate(-90 50 50)" />; at += len; return c })}
    <text x="50" y="55" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">{tot}</text></svg>
}
const Legend = ({ parts }) => <div className="rleg">{parts.map(p => <span key={p.l}><i style={{ background: p.c }} />{p.l}{p.n !== undefined && <>: <b>{p.n}</b></>}</span>)}</div>

const Stamp = () => <div className="stamp"><div>DIVISIONAL DIRECTOR OF EDUCATION (S)</div><div>QUETTA DIVISION</div><div>QUETTA</div></div>

// Printable list of all entries (portal to the page body so the print layout is clean). The stamp closes the last page.
function PrintList({ title, sub, head, rows, who, onClose }) {
  useEffect(() => { document.body.classList.add('printing'); const h = ev => ev.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => { document.body.classList.remove('printing'); window.removeEventListener('keydown', h) } }, [onClose])
  const print = () => {
    const old = document.title; document.title = `${title.replace(/[^A-Za-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}`
    const back = () => { document.title = old; window.removeEventListener('afterprint', back) }
    window.addEventListener('afterprint', back); window.print()
  }
  const today = new Date()
  return createPortal(
    <div className="modal"><div className="mbox rw" role="dialog" aria-modal="true" aria-label="PDF view">
      <div className="card noprint" style={{ marginBottom: 10 }}>
        <div className="f"><b>PDF view</b><span className="kl">{rows.length} entr{rows.length === 1 ? 'y' : 'ies'}</span><button onClick={print}>Print / Save as PDF</button><button className="g" onClick={onClose}>Close</button></div>
        <p className="sub" style={{ margin: '6px 0 0' }}>In the print window, choose “Save as PDF” as the destination. The stamp is on the last page.</p></div>
      <div className="report plist">
        <style>{'@media print{@page{size:A4 landscape;margin:10mm}}'}</style>
        <div className="rhead"><img src={logoUrl} alt="" width="56" height="56" />
          <div><div className="gov">Government of Balochistan</div><div style={{ fontSize: 17, fontWeight: 700 }}>Directorate of Education (Schools) Quetta Division</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
            <div className="kl">{sub}{sub ? ' · ' : ''}Prepared for {who} · {today.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</div></div></div>
        <div className="tw"><table><thead><tr><th>S.No</th>{head.map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td>{i + 1}</td>{r.map((c, j) => <td key={j}>{c === '' || c == null ? '—' : c}</td>)}</tr>)}
            {rows.length === 0 && <tr><td colSpan={head.length + 1}>No entries.</td></tr>}</tbody></table></div>
        <div className="stampwrap"><Stamp /></div>
      </div></div></div>, document.body)
}

function Report({ all, who, phase, onClose }) {
  const dists = [...new Set(all.map(x => x.district))].sort()
  const [dist, setDist] = useState(''); const [tbl, setTbl] = useState(true)
  useEffect(() => { const h = ev => ev.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])
  const rows = all.filter(x => !dist || x.district === dist)
  const sts = x => DEG.map(([k]) => x[k + 'S'])
  const grade = x => { const a = sts(x); return a.includes(X) ? 'bad' : a.includes(P) ? 'pend' : 'full' }
  const total = rows.length
  const nFull = rows.filter(x => grade(x) === 'full').length, nPend = rows.filter(x => grade(x) === 'pend').length, nBad = rows.filter(x => grade(x) === 'bad').length
  const nM = rows.filter(x => x.gender === 'Male').length, nF = total - nM
  const nScan = rows.reduce((a, x) => a + DEG.filter(([k]) => x.degFiles?.[k]).length, 0)
  const nGrv = rows.filter(x => x.grv).length, nOpen = rows.filter(x => x.grv && (!x.dec || x.dec === 'Under review')).length
  const nNoDeo = rows.filter(x => !x.deo).length
  const gradeParts = [{ l: 'Fully verified', n: nFull, c: STC.Verified }, { l: 'Has pending', n: nPend, c: STC.Pending }, { l: 'Has not verified', n: nBad, c: STC['Not verified'] }]
  const des = {}; rows.forEach(x => { des[x.desig] = (des[x.desig] || 0) + 1 })
  const desList = Object.entries(des).sort((a, b) => b[1] - a[1]).slice(0, 8); const mx = Math.max(1, ...desList.map(d => d[1]))
  const today = new Date()
  const print = () => {
    const old = document.title; document.title = `Degree-Verification-Report-${today.toISOString().slice(0, 10)}`
    const back = () => { document.title = old; window.removeEventListener('afterprint', back) }
    window.addEventListener('afterprint', back); window.print()
  }
  return (
    <div className="modal"><div className="mbox rw" role="dialog" aria-modal="true" aria-label="PDF report">
      <div className="card noprint" style={{ marginBottom: 10 }}>
        <div className="f">
          <b>PDF report</b>
          <select value={dist} onChange={e => setDist(e.target.value)}><option value="">All districts</option>{dists.map(d => <option key={d}>{d}</option>)}</select>
          <label><input type="checkbox" checked={tbl} onChange={e => setTbl(e.target.checked)} /> Include employee data table</label>
          <button onClick={print}>Print / Save as PDF</button><button className="g" onClick={onClose}>Close</button></div>
        <p className="sub" style={{ margin: '6px 0 0' }}>In the print window, choose “Save as PDF” as the destination.</p></div>
      <div className="report">
        <div className="rhead"><img src={logoUrl} alt="" width="56" height="56" />
          <div><div className="gov">Government of Balochistan</div><div style={{ fontSize: 17, fontWeight: 700 }}>Directorate of Education (Schools) Quetta Division</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Degree Verification Report: {dist || 'All districts'}</div>
            {phase && <div style={{ fontSize: 13, fontWeight: 600 }}>Appointment phase: {phase.name} · {distTxt(phase)} ({phase.status === 'Completed' ? `completed ${new Date(phase.doneAt).toLocaleDateString()}` : 'in progress'})</div>}
            <div className="kl">Prepared for {who} · {today.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</div></div></div>
        <div className="rk">
          {[[total, 'Total appointed'], [nFull, 'Fully verified'], [nPend, 'With pending'], [nBad, 'Not verified'], [`${nM} : ${nF}`, 'Male : Female'], [nOpen + ' / ' + nGrv, 'Open / total grievances'], [nNoDeo, 'Awaiting DEO comment'], [nScan, 'Verified degree files uploaded']]
            .map(([v, l]) => <div key={l}><div className="kv">{v}</div><div className="kl">{l}</div></div>)}</div>
        <div className="rg">
          <div className="rsec"><h2>Degree verification status</h2>
            {DEG.map(([k, l]) => <div className="rrow" key={k}><b>{l}</b><SBar parts={ST.map(st => ({ l: st, n: rows.filter(x => x[k + 'S'] === st).length, c: STC[st] }))} />
              <span>{rows.filter(x => x[k + 'S'] === V).length}/{total}</span></div>)}
            <Legend parts={ST.map(st => ({ l: st, c: STC[st], n: DEG.reduce((a, [k]) => a + rows.filter(x => x[k + 'S'] === st).length, 0) }))} />
            <div className="kl">Counts in the legend are across all four degrees.</div></div>
          <div className="rsec"><h2>Overall employee verification</h2><div className="f" style={{ gap: 14 }}><Donut parts={gradeParts} /><Legend parts={gradeParts} /></div></div>
          <div className="rsec"><h2>Male / female ratio</h2>{(() => { const gp = [{ l: 'Male', n: nM, c: '#0f6b57' }, { l: 'Female', n: nF, c: '#c2417f' }]
            return <div className="f" style={{ gap: 14 }}><Donut parts={gp} /><Legend parts={gp} /></div> })()}</div>
          <div className="rsec"><h2>Top designations</h2>
            {desList.length === 0 && <div className="kl">No data.</div>}
            {desList.map(([k, n]) => <div className="rrow" key={k}><b>{k}</b><SBar parts={[{ l: k, n, c: '#0f6b57' }, { l: 'rest', n: mx - n, c: '#e3e8e5' }]} /><span>{n}</span></div>)}</div>
        </div>
        {!dist && <div className="rsec" style={{ marginTop: 14 }}><h2>District-wise verification (employees)</h2>
          {dists.map(d => { const r = all.filter(x => x.district === d); const gp = [{ l: 'Fully verified', n: r.filter(x => grade(x) === 'full').length, c: STC.Verified }, { l: 'Has pending', n: r.filter(x => grade(x) === 'pend').length, c: STC.Pending }, { l: 'Has not verified', n: r.filter(x => grade(x) === 'bad').length, c: STC['Not verified'] }]
            return <div className="rrow" key={d}><b>{d}</b><SBar parts={gp} /><span>{gp[0].n}/{r.length}</span></div> })}
          <Legend parts={gradeParts.map(g => ({ ...g, n: undefined }))} /></div>}
        {tbl && <div style={{ marginTop: 14 }}><h2>Employee data ({total})</h2>
          <table><thead><tr><th>#</th><th>Name / father</th><th>Designation</th><th>District</th>{DEG.map(([k, l]) => <th key={k}>{l}</th>)}<th>Div: Director comments</th></tr></thead>
            <tbody>{rows.map((x, i) => <tr key={x.id}><td>{i + 1}</td><td><b>{x.name}</b><br />{x.father || '—'}</td><td>{x.desig}</td><td>{x.district}</td>
              {DEG.map(([k]) => <td key={k}>{x[k] || '—'}<br /><span className="pill" style={{ background: STC[x[k + 'S']] }}>{x[k + 'S']}</span>{x.degFiles?.[k] ? ' ✓ file' : ''}</td>)}
              <td>{x.dec && <b>{x.dec}</b>}{x.dec && x.dir && <br />}{x.dir || (x.dec ? '' : '—')}</td></tr>)}</tbody></table></div>}
        <div className="kl" style={{ marginTop: 12, borderTop: '1px solid var(--bd)', paddingTop: 6 }}>“✓ file” means a verified degree document has been uploaded for that degree.</div>
        <div className="stampwrap"><Stamp /></div>
      </div></div></div>
  )
}
// ---- New appointments: deceased employees' family quota
const FQ_REL = ['Son', 'Daughter', 'Wife', 'Husband', 'Brother', 'Sister']
const FQ_DOCS = [['death', 'Death certificate'], ['heir', 'Family / heirship certificate']]
const FQ_COL = { Applied: '#d99a00', 'Recommended by DEO': '#2a6fdb', 'Not recommended by DEO': '#8a5a00', Recommend: '#0f6b57', 'In process': '#3d7fc4', 'On held': '#7d8a83', Objection: '#d64545', Approved: '#0f6b57', 'On hold': '#7d8a83', Rejected: '#d64545', Appointed: '#1f9d55' }
// Statuses the Director can set. The last four keys of FQ_COL are older statuses, shown only if records still carry them.
const FQ_DIR = ['Recommend', 'In process', 'On held', 'Objection']
const FQ_ACTIVE = ['Applied', 'Recommended by DEO', 'Not recommended by DEO', ...FQ_DIR]
const fqDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fqAge = d => { if (!d) return ''; const b = new Date(d + 'T00:00:00'), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a }
// The applicant's gender follows from the stated relation to the deceased
const fqGender = rel => ['Son', 'Husband', 'Brother'].includes(rel) ? 'Male' : 'Female'
const FQ_KEYS = ['dName', 'dPno', 'dDesig', 'dBps', 'dDeath', 'aName', 'aRel', 'aDob', 'aQual', 'post']
const fqChanged = (r, v, pf, rm) => FQ_KEYS.some(k => String(v[k] ?? '') !== String(r[k] ?? '')) || Object.keys(pf).length > 0 || Object.values(rm).some(Boolean)
const FqPill = ({ s }) => <span className="pill" style={{ background: FQ_COL[s] }}>{s}</span>
const todayStr = () => new Date().toISOString().slice(0, 10)

function FqDocs({ cur, pf, setPf, rm, setRm, edit, setErr }) {
  const pick = (k, ev) => {
    const f = ev.target.files[0]; ev.target.value = ''; if (!f) return
    if (!DEG_TYPES.includes(f.type)) return setErr(`${f.name}: attach a PDF, JPG or PNG file.`)
    if (f.size > DEG_MAX) return setErr(`${f.name} is over 10 MB. Attach a smaller file.`)
    setErr(''); setPf({ ...pf, [k]: f }); setRm({ ...rm, [k]: false })
  }
  const view = async f => { setErr(''); try { if (!(await openStored(f))) setErr(`${f.name} is not stored in this browser.`) } catch { setErr('The file could not be opened.') } }
  return <div>{FQ_DOCS.map(([k, l]) => {
    const c = rm[k] ? null : cur?.[k]; const n = pf[k]
    return <div className="f" key={k} style={{ margin: '4px 0' }}>
      <span className="kl" style={{ width: 190 }}>{l}</span>
      {n ? <span className="kl">{n.name} ({sizeTxt(n.size)}) will be saved</span>
        : c ? <a href="#" onClick={ev => { ev.preventDefault(); view(c) }}>{c.name} ({sizeTxt(c.size)})</a> : <span className="kl">No file</span>}
      {edit && <label className="btnl" style={{ padding: '3px 8px', fontSize: 12 }}>{c || n ? 'Replace' : 'Attach'}<input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={ev => pick(k, ev)} /></label>}
      {edit && (c || n) && <button type="button" className="sm g" onClick={() => { const x = { ...pf }; delete x[k]; setPf(x); setRm({ ...rm, [k]: true }) }}>Remove</button>}
    </div>
  })}</div>
}

function FqForm({ init, district, onSubmit, onCancel, busy, label, validate, children }) {
  const blank = { dName: '', dPno: '', dDesig: '', dBps: '', dDeath: '', aName: '', aRel: FQ_REL[0], aDob: '', aQual: '', post: '' }
  const [v, setV] = useState({ ...blank, ...(init || {}) }); const [pf, setPf] = useState({}); const [rm, setRm] = useState({}); const [err, setErr] = useState('')
  const set = k => ev => setV({ ...v, [k]: ev.target.value })
  const go = () => {
    const need = [['dName', 'deceased employee’s name'], ['dDesig', 'deceased employee’s designation'], ['dDeath', 'date of death'], ['aName', 'applicant’s name'], ['aDob', 'applicant’s date of birth'], ['aQual', 'applicant’s qualification'], ['post', 'post applied for']]
    const miss = need.find(([k]) => !String(v[k]).trim()); if (miss) return setErr(`Enter the ${miss[1]}.`)
    if (v.dBps && !(+v.dBps >= 1 && +v.dBps <= 22)) return setErr('BPS must be between 1 and 22.')
    const v2 = { ...v, dName: v.dName.trim(), dDesig: v.dDesig.trim(), aName: v.aName.trim(), aQual: v.aQual.trim(), post: v.post.trim() }
    const bad = validate && validate(v2, pf, rm); if (bad) return setErr(bad)
    setErr(''); onSubmit(v2, pf, rm)
  }
  return <div>
    <div className="kl"><b>Deceased employee</b> ({district})</div>
    <div className="fqg">
      <label className="kl">Name<input value={v.dName} onChange={set('dName')} /></label>
      <label className="kl">Personal No.<input value={v.dPno} onChange={set('dPno')} /></label>
      <label className="kl">Designation<input value={v.dDesig} onChange={set('dDesig')} /></label>
      <label className="kl">BPS (optional)<input type="number" min="1" max="22" value={v.dBps} onChange={set('dBps')} /></label>
      <label className="kl">Date of death<input type="date" max={todayStr()} value={v.dDeath} onChange={set('dDeath')} /></label></div>
    <div className="kl" style={{ marginTop: 8 }}><b>Applicant (family member)</b></div>
    <div className="fqg">
      <label className="kl">Name<input value={v.aName} onChange={set('aName')} /></label>
      <label className="kl">Relation to deceased<select value={v.aRel} onChange={set('aRel')}>{FQ_REL.map(r => <option key={r}>{r}</option>)}</select></label>
      <label className="kl">Date of birth<input type="date" max={todayStr()} value={v.aDob} onChange={set('aDob')} /></label>
      <label className="kl">Qualification<input value={v.aQual} onChange={set('aQual')} placeholder="e.g. Matric, FA, BA" /></label>
      <label className="kl">Post applied for<input value={v.post} onChange={set('post')} /></label></div>
    <div className="kl" style={{ marginTop: 8 }}><b>Supporting documents</b> (PDF, JPG or PNG, up to 10 MB each)</div>
    <FqDocs cur={init?.docs} pf={pf} setPf={setPf} rm={rm} setRm={setRm} edit setErr={setErr} />
    {children}
    {err && <div className="err" style={{ marginTop: 6 }}>{err}</div>}
    <div className="f" style={{ marginTop: 8 }}><button disabled={busy} onClick={go}>{busy ? 'Saving…' : label}</button><button className="g" onClick={onCancel}>Cancel</button></div>
  </div>
}

function FqDetails({ r }) {
  const [err, setErr] = useState('')
  const ro = (l, x) => <p className="kl" style={{ margin: '2px 0' }}><b>{l}:</b> {x || '—'}</p>
  return <div>
    <div className="fqg2">
      <div>{ro('Deceased employee', r.dName)}{ro('Personal No.', r.dPno)}{ro('Designation', r.dDesig + (r.dBps ? `, BPS ${r.dBps}` : ''))}{ro('Date of death', fqDate(r.dDeath))}{ro('District', r.district)}</div>
      <div>{ro('Applicant', `${r.aName} (${r.aRel}, ${fqGender(r.aRel).toLowerCase()})`)}{ro('Date of birth', `${fqDate(r.aDob)}${r.aDob ? `, age ${fqAge(r.aDob)}` : ''}`)}{ro('Qualification', r.aQual)}{ro('Post applied for', r.post)}</div></div>
    <FqDocs cur={r.docs} pf={{}} setPf={() => {}} rm={{}} setRm={() => {}} edit={false} setErr={setErr} />
    {err && <div className="err">{err}</div>}
    {r.deoEdited && ro('Note', 'The DEO edited the details of this application')}
    {(r.deoRec || r.deoNote) && ro('DEO', `${r.deoRec || ''}${r.deoNote ? ` – ${r.deoNote}` : ''}`)}
    {(r.dirNote || r.orderNo) && ro('Div: Director comments', r.dirNote)}
    {r.orderNo && ro('Appointment order', `${r.orderNo}, ${fqDate(r.orderDate)}`)}
  </div>
}

const FQ_SAMPLE = [
  { id: 'fq1', district: 'Quetta', dName: 'Abdul Ghani', dPno: 'P-10421', dDesig: 'Senior Clerk', dBps: '16', dDeath: '2026-08-14', aName: 'Bilal Ahmed', aRel: 'Son', aDob: '2004-03-12', aQual: 'FA', post: 'Junior Clerk', docs: {}, status: 'Applied', at: 1, by: 'entry.quetta' },
  { id: 'fq2', district: 'Quetta', dName: 'Noor Muhammad', dPno: 'P-08877', dDesig: 'Naib Qasid', dBps: '4', dDeath: '2026-06-02', aName: 'Sana Bibi', aRel: 'Wife', aDob: '1992-07-21', aQual: 'Matric', post: 'Naib Qasid', docs: {}, status: 'Recommended by DEO', deoRec: 'Recommended', deoNote: 'Documents verified.', at: 2, by: 'entry.quetta' },
  { id: 'fq3', district: 'Pishin', dName: 'Gul Khan', dPno: 'P-07310', dDesig: 'Driver', dBps: '5', dDeath: '2026-05-19', aName: 'Hamid Khan', aRel: 'Son', aDob: '2003-11-02', aQual: 'Matric', post: 'Driver', docs: {}, status: 'Recommend', deoRec: 'Recommended', deoNote: 'Family is eligible.', dirNote: 'Recommended. Proceed after heirship verification.', at: 3, by: 'entry.pishin' },
]
function FamilyQuota({ user, role, scope, tell, recip }) {
  const [list, setList] = usePersist('empdash-fq-v1', FQ_SAMPLE)
  const [pl, setPl] = useState(false)
  const [q, setQ] = useState(''); const [fs, setFs] = useState(''); const [fd, setFd] = useState(''); const [adding, setAdding] = useState(false)
  const [sid, setSid] = useState(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [del, setDel] = useState(null)
  const [imp, setImp] = useState(false)
  const [rec, setRec] = useState('Recommended'); const [note, setNote] = useState(''); const [dec, setDec] = useState('In process')
  const canAdd = (role === 'entry' || role === 'ops') && !!scope
  const vis = list.filter(r => !scope || r.district === scope)
  const sel = list.find(r => r.id === sid)
  const rows = vis.filter(r => (!fs || r.status === fs) && (!fd || r.district === fd) && (!q.trim() || [r.aName, r.dName, r.dPno, r.post, r.aQual, r.dDesig].join(' ').toLowerCase().includes(q.trim().toLowerCase())))
  const cnt = (...ss) => vis.filter(r => ss.includes(r.status)).length
  const stKeys = [...FQ_ACTIVE, ...Object.keys(FQ_COL).filter(k => !FQ_ACTIVE.includes(k) && vis.some(r => r.status === k))]
  const distOpts = [...new Set([...DISTRICTS, ...list.map(r => r.district)])].sort()
  const upd = (id, patch) => setList(list.map(r => r.id === id ? { ...r, ...patch } : r))
  const storeDocs = async (cur, pf, rm) => {
    const docs = { ...cur }; const added = []; const drop = []
    try {
      for (const [k] of FQ_DOCS) {
        if (pf[k]) { const id = uid() + uid(); await idbPut(id, pf[k]); added.push(id); if (docs[k]) drop.push(docs[k].id); docs[k] = { id, name: pf[k].name, size: pf[k].size, type: pf[k].type } }
        else if (rm[k] && docs[k]) { drop.push(docs[k].id); delete docs[k] }
      }
    } catch { await Promise.all(added.map(idbDel)); return null }
    drop.forEach(idbDel); return docs
  }
  const saveNew = async (v, pf, rm) => {
    setBusy(true); const docs = await storeDocs({}, pf, rm); setBusy(false)
    if (!docs) return setMsg('The files could not be saved. Browser storage may be full or blocked.')
    setList([...list, { id: uid(), ...v, district: scope, docs, status: 'Applied', at: Date.now(), by: user.u }])
    setAdding(false); setMsg('Application added.')
    tell(recip(scope, ['deo']), `New family quota application: ${v.aName} (${v.aRel} of ${v.dName}), ${scope}.`)
  }
  const saveEdit = async (v, pf, rm) => {
    setBusy(true); const docs = await storeDocs(sel.docs || {}, pf, rm); setBusy(false)
    if (!docs) return setMsg('The files could not be saved. Browser storage may be full or blocked.')
    upd(sel.id, { ...v, docs }); setSid(null); setMsg('Application updated.')
  }
  const open = r => { setSid(r.id); setRec(r.deoRec || 'Recommended'); setNote(role === 'deo' ? (r.deoNote || '') : (r.dirNote || '')); setDec(FQ_DIR.includes(r.status) ? r.status : r.status === 'Recommended by DEO' ? 'Recommend' : 'In process'); setDel(null); setAdding(false) }
  const deoCheck = (v, pf, rm) => fqChanged(sel, v, pf, rm) && !note.trim() ? 'You changed the details. Add DEO comments explaining the changes.' : ''
  const saveDeo = async (v, pf, rm) => {
    setBusy(true); const docs = await storeDocs(sel.docs || {}, pf, rm); setBusy(false)
    if (!docs) return setMsg('The files could not be saved. Browser storage may be full or blocked.')
    const changed = fqChanged(sel, v, pf, rm); const status = rec === 'Recommended' ? 'Recommended by DEO' : 'Not recommended by DEO'
    upd(sel.id, { ...v, docs, deoRec: rec, deoNote: note.trim(), status, ...(changed ? { deoEdited: true } : {}) }); setSid(null); setMsg(changed ? 'Changes and recommendation saved.' : 'Recommendation saved.')
    tell(recip(sel.district, ['entry', 'dir']), `DEO ${rec === 'Recommended' ? 'recommended' : 'did not recommend'} the family quota application of ${sel.aName} (${sel.district})${changed ? ' after editing its details' : ''}.`)
  }
  const saveDir = () => {
    upd(sel.id, { status: dec, dirNote: note.trim() })
    tell([...recip(sel.district, ['deo']), ...recip(sel.district, ['entry'])], `Family quota application of ${sel.aName} (${sel.district}): ${dec}.`)
    setSid(null); setMsg(`Status changed to ${dec}.`)
  }
  const remove = r => { Object.values(r.docs || {}).forEach(f => f?.id && idbDel(f.id)); setList(list.filter(x => x.id !== r.id)); setDel(null); setSid(null); setMsg('Application deleted.') }
  const exportX = () => {
    const out = rows.map((r, i) => ({ 'S.No': i + 1, Applicant: r.aName, Relation: r.aRel, Gender: fqGender(r.aRel), 'Date of birth': r.aDob, Qualification: r.aQual, 'Post applied': r.post, 'Deceased employee': r.dName, 'Personal No.': r.dPno || '', Designation: r.dDesig, BPS: r.dBps, 'Date of death': r.dDeath, District: r.district, 'DEO recommendation': r.deoRec || '', 'DEO comments': r.deoNote || '', 'Div: Director comments': r.dirNote || '', 'Order no.': r.orderNo || '', 'Order date': r.orderDate || '', Status: r.status }))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(out), 'Family quota'); XLSX.writeFile(wb, 'Family-quota-appointments.xlsx')
  }
  const nM = vis.filter(r => fqGender(r.aRel) === 'Male').length, nF = vis.length - nM
  const gp = [{ l: 'Male', n: nM, c: '#0f6b57' }, { l: 'Female', n: nF, c: '#c2417f' }]
  const stParts = stKeys.map(x => ({ l: x, n: cnt(x), c: FQ_COL[x] }))
  const tally = f => { const o = {}; vis.forEach(r => { const k = f(r); o[k] = (o[k] || 0) + 1 }); return Object.entries(o).sort((a, b) => b[1] - a[1]) }
  const byPost = tally(r => r.post).slice(0, 6)
  const dists = [...new Set(vis.map(r => r.district))].sort()
  const bars = (data, color) => { const mx = Math.max(1, ...data.map(d => d[1])); return data.length ? data.map(([k, n]) => <div className="rrow" key={k}><b>{k}</b><SBar parts={[{ l: k, n, c: typeof color === 'function' ? color(k) : color }, { l: 'rest', n: mx - n, c: '#e3e8e5' }]} /><span>{n}</span></div>) : <div className="kl">No data.</div> }
  const editable = sel && canAdd && sel.status === 'Applied'
  const deoOpen = sel && role === 'deo' && ['Applied', 'Recommended by DEO', 'Not recommended by DEO'].includes(sel.status)
  const dirOpen = sel && role === 'dir'
  const act = r => role === 'dir' ? 'View' : role === 'deo' ? (['Applied', 'Recommended by DEO', 'Not recommended by DEO'].includes(r.status) ? 'Review' : 'View') : canAdd && r.status === 'Applied' ? 'Edit' : 'View'
  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}><h2>New appointments: deceased employees’ family quota</h2>
        <div className="kl">Applications from family members of employees who died in service. The entry operator records the application, the DEO recommends, and the Director sets the status.{scope ? ` Showing ${scope}.` : ''} {msg && <span className="ok">{msg}</span>}</div></div>
      <div className="fqk">{[[vis.length, 'Applications'], [cnt('Applied'), 'Applied'], [cnt('Recommended by DEO') + cnt('Not recommended by DEO'), 'With DEO view'], [cnt('Recommend', 'Approved', 'Appointed'), 'Recommend'], [cnt('In process'), 'In process'], [cnt('On held', 'On hold') + cnt('Objection', 'Rejected'), 'On held / objection'], [`${nM} : ${nF}`, 'Male : Female']]
        .map(([v, l]) => <div className="card" key={l}><div className="kv">{v}</div><div className="kl">{l}</div></div>)}</div>
      <div className="card" style={{ marginTop: 12 }}><h2>Statistics</h2>
        <div className="rg" style={{ marginTop: 0 }}>
          <div className="rsec"><h2>Male / female ratio</h2><div className="f" style={{ gap: 14 }}><Donut parts={gp} /><div><Legend parts={gp} /><div className="kl" style={{ marginTop: 6 }}>Ratio {nM} : {nF}{vis.length ? ` (${Math.round(nM / vis.length * 100)}% male, ${Math.round(nF / vis.length * 100)}% female)` : ''}</div></div></div></div>
          <div className="rsec"><h2>Top posts applied for</h2>{bars(byPost, '#2a6fdb')}</div>
        </div>
        {!scope && <div className="rsec" style={{ marginTop: 12 }}><h2>District-wise applications by status</h2>
          {dists.length === 0 && <div className="kl">No data.</div>}
          {dists.map(d => <div className="rrow" key={d}><b>{d}</b><SBar parts={stKeys.map(x => ({ l: x, n: vis.filter(r => r.district === d && r.status === x).length, c: FQ_COL[x] }))} /><span>{vis.filter(r => r.district === d).length}</span></div>)}
          <Legend parts={stParts.map(x => ({ ...x, n: undefined }))} /></div>}
      </div>
      {canAdd && !adding && !sid && <div className="f" style={{ marginTop: 12 }}><button onClick={() => setAdding(true)}>New application</button><button className="g" onClick={() => setImp(!imp)}>{imp ? 'Hide Excel import' : 'Import from Excel'}</button></div>}
      {canAdd && imp && <div className="card" style={{ marginTop: 12 }}><h2>Import applications from Excel or CSV</h2>
        <SmartImport fields={FQ_FIELDS} convert={fqConvert} noun="application" onRows={r => { setList([...list, ...r.map(x => ({ id: uid(), ...x, district: scope, docs: {}, status: 'Applied', at: Date.now(), by: user.u }))]); setImp(false); setMsg(`${r.length} application${r.length > 1 ? 's' : ''} imported.`); tell(recip(scope, ['deo']), `${r.length} new family quota application${r.length > 1 ? 's' : ''} imported in ${scope}.`) }} /></div>}
      {adding && <div className="card" style={{ marginTop: 12 }}><h2>New application</h2><FqForm district={scope} onSubmit={saveNew} onCancel={() => setAdding(false)} busy={busy} label="Save application" /></div>}
      {pl && <PrintList title="Family quota appointments: all entries" sub={scope || 'All districts'} who={user.u} onClose={() => setPl(false)}
        head={['Applicant', 'Relation', 'Deceased employee', 'Personal No.', 'Designation', 'Date of death', 'Qualification', 'Post applied', 'District', 'DEO', 'Div: Director comments', 'Status']}
        rows={rows.map(r => [r.aName, `${r.aRel} (${fqGender(r.aRel)})`, r.dName, r.dPno, r.dDesig + (r.dBps ? `, BPS ${r.dBps}` : ''), fqDate(r.dDeath), r.aQual, r.post, r.district, [r.deoRec, r.deoNote].filter(Boolean).join(': '), r.dirNote, r.status])} />}
      {sel && <div className="modal" onClick={() => setSid(null)}><div className="mbox" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="card"><h2>{sel.aName} ({sel.aRel} of {sel.dName}) <FqPill s={sel.status} /></h2>
          {editable ? <FqForm init={sel} district={sel.district} onSubmit={saveEdit} onCancel={() => setSid(null)} busy={busy} label="Save changes" />
            : deoOpen ? <FqForm init={sel} district={sel.district} onSubmit={saveDeo} onCancel={() => setSid(null)} busy={busy} label="Save" validate={deoCheck}>
              <div style={{ marginTop: 8 }}>
                <label className="kl">DEO recommendation <select value={rec} onChange={e => setRec(e.target.value)}><option>Recommended</option><option>Not recommended</option></select></label>
                <label className="kl" style={{ display: 'block', marginTop: 6 }}>DEO comments</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Write your comments. Required if you change any details." /></div></FqForm>
            : <FqDetails r={sel} />}
          {dirOpen && <div style={{ marginTop: 8 }}>
            <label className="kl">Status <select value={dec} onChange={e => setDec(e.target.value)}>{FQ_DIR.map(x => <option key={x}>{x}</option>)}</select></label>
            <label className="kl" style={{ display: 'block', marginTop: 6 }}>Div: Director comments</label><textarea value={note} onChange={e => setNote(e.target.value)} />
            <div className="f" style={{ marginTop: 8 }}><button onClick={saveDir}>Save</button><button className="g" onClick={() => setSid(null)}>Close</button>{!del && <button className="g" onClick={() => setDel(sel)}>Delete record</button>}</div>
            {del && <div style={{ marginTop: 8 }}><div className="kl">Delete the application of {sel.aName}? The record and its attached documents will be removed permanently.</div>
              <div className="f" style={{ marginTop: 6 }}><button onClick={() => remove(sel)}>Yes, delete</button><button className="g" onClick={() => setDel(null)}>Cancel</button></div></div>}</div>}
          {!editable && !deoOpen && !dirOpen && <div className="f" style={{ marginTop: 8 }}><button className="g" onClick={() => setSid(null)}>Close</button></div>}
          {sel.status === 'Appointed' && <div className="kl" style={{ marginTop: 6 }}>🔒 Appointed: this record is closed.</div>}
        </div></div></div>}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="f"><input type="search" placeholder="Search applicant, deceased employee, post" value={q} onChange={e => setQ(e.target.value)} />
          <select value={fs} onChange={e => setFs(e.target.value)}><option value="">Any status</option>{stKeys.map(s => <option key={s}>{s}</option>)}</select>
          {!scope && <select value={fd} onChange={e => setFd(e.target.value)}><option value="">All districts</option>{distOpts.map(d => <option key={d}>{d}</option>)}</select>}
          <button className="g" onClick={exportX}>Export Excel</button><button className="g" onClick={() => setPl(true)}>PDF view</button></div>
        <div className="tw vs"><table><thead><tr><th className="frz1">S.No</th><th className="frz2">Applicant</th><th>Deceased employee</th><th>Personal No.</th><th>Qualification</th><th>Post applied</th><th>District</th><th>Docs</th><th>DEO</th><th>Div: Director comments</th><th>Status</th><th /></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={r.id}><td className="frz1">{i + 1}</td>
            <td className="frz2"><b>{r.aName}</b><br /><span className="kl">{r.aRel} ({fqGender(r.aRel)}){r.aDob ? `, age ${fqAge(r.aDob)}` : ''}</span></td>
            <td>{r.dName}<br /><span className="kl">{r.dDesig}{r.dBps ? `, BPS ${r.dBps}` : ''} · d. {fqDate(r.dDeath)}</span></td>
            <td>{r.dPno || '—'}</td><td>{r.aQual}</td><td>{r.post}</td><td>{r.district}</td>
            <td>{FQ_DOCS.filter(([k]) => r.docs?.[k]).length}/{FQ_DOCS.length}</td>
            <td className="cm">{r.deoRec && <b>{r.deoRec}<br /></b>}{r.deoNote || (r.deoRec ? '' : '—')}{r.deoEdited && <><br /><span className="kl">(details edited by DEO)</span></>}</td>
            <td className="cm">{r.dirNote || '—'}{r.orderNo && <><br /><span className="kl">Order {r.orderNo}, {fqDate(r.orderDate)}</span></>}</td>
            <td><FqPill s={r.status} /></td>
            <td><div className="f"><button className="sm" onClick={() => open(r)}>{act(r)}</button></div></td></tr>)}
            {rows.length === 0 && <tr><td colSpan="12" className="kl">No applications yet.</td></tr>}</tbody></table></div>
      </div>
    </div>
  )
}

function Dashboard({ user, users, setUsers, logo, notes, setNotes, notices, setNotices, docs, setDocs, settings, setSettings, onLogout }) {
  const [db, setDb] = usePersist('empdash-react-v2', { rows: SAMPLE, sample: true })
  const role = user.role
  const eff = role === 'ad' ? 'dir' : role === 'ops' ? 'entry' : role
  const scopeAll = role !== 'deo' && role !== 'entry'
  const canReview = eff === 'dir' || settings[eff] !== false
  const [phases, setPhases] = usePersist('empdash-phases-v1', SAMPLE_PHASES); const [vid, setVid] = useState(null)
  const [pn, setPn] = useState(''); const [cp, setCp] = useState(null); const [dp, setDp] = useState(null); const [ep, setEp] = useState(null); const [opDist, setOpDist] = useState(DISTRICTS[0]); const [pAll, setPAll] = useState(true); const [pSel, setPSel] = useState([])
  const entryDist = role === 'ops' ? opDist : user.district
  const phOf = x => x.phase || phases[0]?.id || null
  const myPhases = role === 'dir' || role === 'ad' ? phases : phases.filter(p => inPhase(p, entryDist))
  const actives = myPhases.filter(p => p.status === 'Active'); const tgt = actives.find(p => p.id === ep) || actives[actives.length - 1] || null
  const vp = myPhases.find(p => p.id === vid) || tgt || [...myPhases].reverse().find(p => p.status === 'Completed') || null
  const pool = db.rows.filter(x => phOf(x) === (vp ? vp.id : null))
  const [f, setF] = useState({ d: '', g: '', s: '', ds: '', q: '' })
  const [open, setOpen] = useState(null); const [msg, setMsg] = useState('')
  const mine = scopeAll ? pool : pool.filter(x => x.district === user.district)
  const rows = mine.filter(x => !f.d || x.district === f.d)
  const upd = (id, patch) => setDb({ ...db, rows: db.rows.map(x => x.id === id ? { ...x, ...patch } : x) })
  const add = r => setDb({ rows: db.sample ? [...db.rows.filter(x => phOf(x) && phOf(x) !== tgt?.id), ...r] : [...db.rows, ...r], sample: false })
  const st = x => DEG.map(([k]) => x[k + 'S'])
  const t = rows.length, m = rows.filter(x => x.gender === 'Male').length, fm = t - m, mp = t ? m / t * 100 : 0
  const full = rows.filter(x => st(x).every(s => s === V || s === N)).length
  const pend = rows.filter(x => st(x).includes(P)).length, bad = rows.filter(x => st(x).includes(X)).length
  const noDeo = rows.filter(x => !x.deo).length
  const complete = vp?.status === 'Completed'
  const noFinal = cp ? db.rows.filter(x => phOf(x) === cp.id && !x.closed && !FINAL_DECS.includes(x.dec)).length : 0
  const openG = rows.filter(x => x.grv && (!x.dec || x.dec === 'Under review')).length
  const des = {}; rows.forEach(x => { des[x.desig] = (des[x.desig] || 0) + 1 })
  const desList = Object.entries(des).sort((a, b) => b[1] - a[1]).slice(0, 7); const mx = Math.max(1, ...desList.map(d => d[1]))
  const q = f.q.trim().toLowerCase()
  const match = x => !q || [x.name, x.father, x.desig, x.district, x.matric, x.fsc, x.ba, x.prof].some(v => (v || '').toLowerCase().includes(q))
  const shown = rows.filter(x => (!f.g || x.gender === f.g) && (!f.ds || x.desig === f.ds) && match(x) && (!f.s || (f.s === 'pend' ? st(x).includes(P) : f.s === 'bad' ? st(x).includes(X) : !st(x).some(s => s === P || s === X))))
  const exportXlsx = () => {
    const data = shown.map((x, i) => {
      const o = { 'S.No': i + 1, Name: x.name, 'Father name': x.father || '', Gender: x.gender, Designation: x.desig, District: x.district }
      DEG.forEach(([k, l]) => { o[`${l} No.`] = x[k] || ''; o[`${l} status`] = x[k + 'S'] })
      if (cols.grv) o.Grievance = x.grv || ''; if (cols.deo) o['DEO comments'] = x.deo || ''; o.Decision = x.dec || ''; o['Div: Director comments'] = x.dir || ''
      return o
    })
    const ws = XLSX.utils.json_to_sheet(data); ws['!cols'] = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(14, k.length + 2) }))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Employees')
    XLSX.writeFile(wb, `employees-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }
  const K = (v, l) => <div className="card"><div className="kv">{v}</div><div className="kl">{l}</div></div>
  const sel = db.rows.find(x => x.id === open)
  const [pl, setPl] = useState(false); const [mod, setMod] = useState(''); const [cols, setCols] = usePersist('empdash-cols-v1', { grv: true, deo: true }); const [rp, setRp] = useState(false); const [bell, setBell] = useState(false); const [nb, setNb] = useState(false); const [dc, setDc] = useState(false)
  const unread = notes.filter(n => n.to === user.u && !n.read && !n.delTo).length
  const recip = (d, rs) => users.filter(x => rs.includes(x.role) && (x.role === 'dir' || x.role === 'ad' || x.district === d)).map(x => x.u)
  const tell = (list, text) => setNotes(n => [...n, ...list.filter(u => u !== user.u).map(u => ({ id: uid(), to: u, from: user.u, text, sys: true, at: Date.now(), read: false }))])
  const addE = r => { if (!tgt) return; add(r.map(x => ({ ...x, district: entryDist, phase: tgt.id }))); tell(recip(entryDist, ['deo', 'ad']), `${r.length} new employee record${r.length > 1 ? 's' : ''} added in ${entryDist} by ${user.u}.`) }
  const after = (e, p) => {
    const d = e.district
    if (eff === 'entry' && p.grv && p.grv !== e.grv) tell([...recip(d, ['deo']), ...recip(d, ['dir', 'ad'])], `Grievance recorded for ${e.name} (${d}).`)
    if (eff === 'deo' && p.deo && p.deo !== e.deo) tell(recip(d, ['dir', 'ad']), `DEO ${d} commented on ${e.name}.`)
    if (eff === 'dir' && p.grv && p.grv !== e.grv) tell(recip(d, ['deo']), `Grievance recorded for ${e.name} (${d}) by the Director / Admin level.`)
    if (role === 'ad' && p.degFiles && JSON.stringify(p.degFiles) !== JSON.stringify(e.degFiles || {})) tell(recip(d, ['dir']), `Assistant Director updated the verified degree files for ${e.name} (${d}).`)
    if (eff === 'dir') tell([...recip(d, ['deo']), ...recip(d, ['entry'])], `Director / Admin level reviewed ${e.name}: decision “${p.dec}”, degree statuses updated.`)
  }
  const others = ph => users.filter(x => x.role !== 'dir' && (!x.district || inPhase(ph, x.district))).map(x => x.u)
  const createPhase = () => {
    const name = pn.trim(); if (!name || (!pAll && !pSel.length)) return
    if (phases.some(x => x.name.toLowerCase() === name.toLowerCase())) return setMsg('A phase with that name already exists.')
    const id = uid(); const np = { id, name, at: Date.now(), by: user.u, status: 'Active', districts: pAll ? 'all' : pSel }; setPhases([...phases, np])
    setDb({ ...db, rows: db.rows.map(x => x.phase || phases.length ? x : { ...x, phase: id }) })
    setPn(''); setPAll(true); setPSel([]); setVid(id); setEp(id); tell(others(np), `Director generated the appointment phase “${name}” (${distTxt(np)}). Data entry is open for it.`); setMsg(`Phase “${name}” generated.`)
  }
  const completePhase = ph => {
    const at = Date.now()
    setPhases(phases.map(x => x.id === ph.id ? { ...x, status: 'Completed', doneAt: at } : x))
    setDb({ ...db, rows: db.rows.map(x => phOf(x) === ph.id && !x.closed ? { ...x, phase: ph.id, closed: { at, by: user.u, phase: ph.id } } : x) })
    tell(others(ph), `Director marked the appointment phase “${ph.name}” completed. Its data is now closed.`)
    setCp(null); setVid(ph.id); setMsg(`“${ph.name}” completed. Data closed.`)
  }
  const reopenPhase = ph => {
    setPhases(phases.map(x => x.id === ph.id ? { ...x, status: 'Active', doneAt: null } : x))
    setDb({ ...db, rows: db.rows.map(x => phOf(x) === ph.id && x.closed ? { ...x, closed: null } : x) })
    tell(others(ph), `Director reopened the appointment phase “${ph.name}”.`); setVid(ph.id); setMsg(`“${ph.name}” reopened.`)
  }
  const deletePhase = ph => {
    if (ph.status !== 'Completed') return
    db.rows.filter(x => phOf(x) === ph.id).forEach(x => Object.values(x.degFiles || {}).forEach(f => f?.id && idbDel(f.id)))
    setDb({ ...db, rows: db.rows.filter(x => phOf(x) !== ph.id) }); setPhases(phases.filter(x => x.id !== ph.id))
    tell(others(ph), `Director deleted the completed appointment phase “${ph.name}” and its data.`)
    setDp(null); if (vid === ph.id) setVid(null); setMsg(`Deleted “${ph.name}”.`)
  }
  const who = role === 'dir' ? ROLE_NAME.dir : role === 'ad' ? ROLE_NAME.ad : role === 'deo' ? `District Education Officer, ${user.district}` : role === 'ops' ? `${ROLE_NAME.ops} (assisting ${user.owner})` : `${ROLE_NAME.entry}, ${user.district}`
  const dists = [...new Set(pool.map(x => x.district))]
  return (
    <div className="wrap">
      <Header logo={logo} who={who} right={<div className="f">
        <button className="g" onClick={() => { setNb(!nb); setBell(false); setDc(false) }}>Notices</button>
        {role !== 'entry' && role !== 'ops' && <button className="g" onClick={() => { setDc(!dc); setNb(false); setBell(false) }}>Documents</button>}
        <button className="g" onClick={() => { setBell(!bell); setNb(false); setDc(false) }}>Messages{unread > 0 && <span className="dot">{unread}</span>}</button>
        {eff === 'dir' && <button className="g" onClick={() => { setRp(true); setNb(false); setBell(false); setDc(false) }}>PDF report</button>}
        <button className="g" onClick={() => { setMod(mod === 'fq' ? '' : 'fq'); setNb(false); setBell(false); setDc(false); setRp(false) }}>{mod === 'fq' ? 'Back to dashboard' : 'Family quota'}</button>
        <button className="g" onClick={onLogout}>Sign out</button></div>} />
      <div className="sub" style={{ marginBottom: 8 }}>{ROLE_TXT[role]} {msg && <span className="ok">{msg}</span>}{unread > 0 && !bell && <span className="ok"> You have {unread} new message{unread > 1 ? 's' : ''}.</span>}</div>
      {pl && <PrintList title="Degree verification: all entries" sub={`Appointment phase: ${vp ? vp.name : 'none'}${f.d ? ` · ${f.d}` : ''}`} who={who} onClose={() => setPl(false)}
        head={['Name', 'Father name', 'Gender', 'Designation', 'District', ...DEG.map(([, l]) => l), ...(cols.grv ? ['Grievance'] : []), ...(cols.deo ? ['DEO comments'] : []), 'Div: Director comments']}
        rows={shown.map(x => [x.name, x.father, x.gender, x.desig, x.district, ...DEG.map(([k]) => x[k] ? `${x[k]} (${x[k + 'S']})` : ''), ...(cols.grv ? [x.grv] : []), ...(cols.deo ? [x.deo] : []), [x.dec, x.dir].filter(Boolean).join(': ')])} />}
      {rp && eff === 'dir' && <Report all={pool} who={who} phase={vp} onClose={() => setRp(false)} />}
      {bell && <Inbox user={user} users={users} setUsers={setUsers} notes={notes} setNotes={setNotes} />}
      {dc && <Documents user={user} users={users} docs={docs} setDocs={setDocs} setNotes={setNotes} />}
      {nb && <Notices user={user} users={users} notices={notices} setNotices={setNotices} setNotes={setNotes} />}
      {mod === 'fq' ? <FamilyQuota user={user} role={role} scope={role === 'dir' || role === 'ad' ? null : entryDist} tell={tell} recip={recip} /> : <>
      {role === 'dir' && <div className="card" style={{ marginBottom: 12 }}><h2>Review permissions</h2><div className="f">
        <label><input type="checkbox" checked={settings.deo !== false} onChange={e => setSettings({ ...settings, deo: e.target.checked })} /> District Education Officers can use Review</label>
        <label><input type="checkbox" checked={settings.entry !== false} onChange={e => setSettings({ ...settings, entry: e.target.checked })} /> Entry level operators can use Review</label></div></div>}
      {complete && <div className="card" style={{ marginBottom: 12, borderColor: 'var(--ok)' }}><h2>Process completed</h2>
        <div className="kl">The appointment phase “{vp.name}” was completed on {new Date(vp.doneAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}. {scopeAll ? 'All data is closed.' : 'All records in your district are closed.'}</div></div>}
      {role !== 'dir' && actives.length > 0 && <div className="sub" style={{ marginBottom: 8 }}>Appointment phase in progress: <b>{actives.map(x => x.name).join(', ')}</b></div>}
      {role === 'dir' && <div className="card" style={{ marginBottom: 12 }}><h2>Appointment phases</h2>
        <div className="f"><input placeholder="Appointment phase name, e.g. SBK or Phase 2, 2026" value={pn} onChange={e => setPn(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPhase()} style={{ minWidth: 220, flex: 1 }} /><button disabled={!pn.trim() || (!pAll && !pSel.length)} onClick={createPhase}>{phases.length ? 'Generate another phase' : 'Generate phase'}</button></div>
        <div className="f" style={{ marginTop: 6 }}><span className="kl">Assigned to:</span>
          <label><input type="radio" name="pd" checked={pAll} onChange={() => setPAll(true)} /> All districts</label>
          <label><input type="radio" name="pd" checked={!pAll} onChange={() => setPAll(false)} /> Specific districts</label>
          {!pAll && [...new Set([...DISTRICTS, ...db.rows.map(r => r.district)])].map(d => <label key={d}><input type="checkbox" checked={pSel.includes(d)} onChange={e => setPSel(e.target.checked ? [...pSel, d] : pSel.filter(y => y !== d))} /> {d}</label>)}</div>
        {cp && <div style={{ marginTop: 8 }}><div className="kl">Mark “{cp.name}” completed? All of its data will be closed: records can’t be reviewed or edited, degree files can’t be changed and no more entries can be added to it. {noFinal > 0 ? `${noFinal} record${noFinal > 1 ? 's have' : ' has'} no final decision yet.` : ''}</div>
          <div className="f" style={{ marginTop: 6 }}><button onClick={() => completePhase(cp)}>Yes, complete and close data</button><button className="g" onClick={() => setCp(null)}>Cancel</button></div></div>}
        {dp && <div style={{ marginTop: 8 }}><div className="kl">Delete the completed phase “{dp.name}”? Its records and uploaded degree files will be removed permanently.</div>
          <div className="f" style={{ marginTop: 6 }}><button onClick={() => deletePhase(dp)}>Yes, delete</button><button className="g" onClick={() => setDp(null)}>Cancel</button></div></div>}
        {phases.length > 0 && <div style={{ marginTop: 8 }}>{[...phases].reverse().map(x => <div className="f" key={x.id} style={{ margin: '3px 0' }}>
          <b>{x.name}</b><span className="pill" style={{ background: x.status === 'Completed' ? 'var(--ok)' : 'var(--pe)' }}>{x.status === 'Completed' ? 'Completed' : 'In progress'}</span>
          <span className="kl">{distTxt(x)} · Generated {new Date(x.at).toLocaleDateString()}{x.doneAt ? ` · completed ${new Date(x.doneAt).toLocaleDateString()}` : ''} · {db.rows.filter(r => phOf(r) === x.id).length} records</span>
          {vp?.id === x.id ? <span className="kl">Viewing</span> : <button className="sm g" onClick={() => setVid(x.id)}>View</button>}
          {x.status === 'Active' && <button className="sm" onClick={() => { setCp(x); setDp(null) }}>Mark completed</button>}
          {x.status === 'Completed' && <button className="sm g" onClick={() => { setDp(x); setCp(null) }}>Delete</button>}
          {x.status === 'Completed' && <button className="sm g" onClick={() => reopenPhase(x)}>Reopen</button>}</div>)}</div>}</div>}
      {db.sample && <div className="sub" style={{ marginBottom: 8 }}>Showing sample data. Add or import your own list to replace it.</div>}
      <div className="grid k">{K(t, 'Total appointed')}{K(full, 'Fully verified')}{K(pend, 'With pending')}{K(bad, 'Not verified')}{K(`${m} : ${fm}`, 'Male : Female')}{K(noDeo, 'Awaiting DEO comment')}{K(openG, 'Open grievances')}</div>
      <div className="grid c2">
        <div className="card"><h2>Degree verification status</h2>
          {DEG.map(([k, l]) => <div className="row" key={k}><b>{l}</b>
            <div className="bar">{ST.map(s => { const n = rows.filter(x => x[k + 'S'] === s).length; return n ? <i key={s} title={`${s}: ${n}`} style={{ width: `${n / (t || 1) * 100}%`, background: COL[s] }} /> : null })}</div>
            <span>{rows.filter(x => x[k + 'S'] === V).length}/{t}</span></div>)}
          <div className="leg">{ST.map(s => <span key={s} style={{ '--c': COL[s] }}>{s}</span>)}</div></div>
        <div className="grid" style={{ gap: 12 }}>
          <div className="card"><h2>Male / female ratio</h2><div className="f" style={{ gap: 18 }}>
            <div className="donut" style={{ background: `conic-gradient(var(--m) 0 ${mp}%, var(--f) ${mp}% 100%)` }} />
            <div><div>Male: <b>{m}</b> ({Math.round(mp)}%)</div><div>Female: <b>{fm}</b> ({t ? Math.round(100 - mp) : 0}%)</div></div></div></div>
          <div className="card"><h2>Designations</h2>
            {desList.map(([k, n]) => <div className="row" key={k}><b>{k}</b><div className="bar"><i style={{ width: `${n / mx * 100}%`, background: 'var(--ac)' }} /></div><span>{n}</span></div>)}</div>
        </div>
      </div>
      {(role === 'entry' || role === 'ops') && <>
        {role === 'ops' && <div className="card" style={{ marginTop: 12 }}><label className="kl">Entering records for district <input list="dl2" value={opDist} onChange={e => setOpDist(e.target.value)} /><datalist id="dl2">{DISTRICTS.map(d => <option key={d} value={d} />)}</datalist></label></div>}
        {tgt && <div className="card" style={{ marginTop: 12 }}><label className="kl">Entering records into appointment phase {actives.length > 1 ? <select value={tgt.id} onChange={e => { setEp(e.target.value); setVid(e.target.value) }}>{actives.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select> : <b>{tgt.name}</b>}</label></div>}
        {tgt ? <AddForm onAdd={addE} /> : <div className="card" style={{ marginTop: 12 }}><h2>Data entry is closed</h2><div className="kl">Entries can be added only while an appointment phase is in progress. No appointment phase is in progress for this district: the Director has not generated one, has not assigned it to this district, or it has been completed.</div></div>}</>}
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Appointment phase: {vp ? vp.name : role === 'dir' || role === 'ad' ? 'none generated yet' : 'none assigned yet'} {vp && <span className="pill" style={{ background: vp.status === 'Completed' ? 'var(--ok)' : 'var(--pe)' }}>{vp.status === 'Completed' ? 'Completed' : 'In progress'}</span>}
          {vp && <span className="kl" style={{ fontWeight: 400, marginLeft: 8 }}>{distTxt(vp)}</span>}
          {myPhases.length > 1 && <select value={vp?.id || ''} onChange={e => setVid(e.target.value)} style={{ marginLeft: 8, fontWeight: 400 }}>{myPhases.map(x => <option key={x.id} value={x.id}>{x.name} ({x.status === 'Completed' ? 'completed' : 'in progress'})</option>)}</select>}</h2>
        {role === 'dir' && <div className="f" style={{ marginBottom: 6 }}><span className="kl">Table columns (Director):</span>
          <label><input type="checkbox" checked={cols.grv} onChange={e => setCols({ ...cols, grv: e.target.checked })} /> Grievance</label>
          <label><input type="checkbox" checked={cols.deo} onChange={e => setCols({ ...cols, deo: e.target.checked })} /> DEO comments</label></div>}
        <div className="f">
          <input type="search" placeholder="Search name, father, designation, degree no." value={f.q} onChange={e => setF({ ...f, q: e.target.value })} style={{ minWidth: 220, flex: 1 }} />
          {scopeAll && <select value={f.d} onChange={e => setF({ ...f, d: e.target.value })}><option value="">All districts</option>{dists.map(d => <option key={d}>{d}</option>)}</select>}
          <select value={f.g} onChange={e => setF({ ...f, g: e.target.value })}><option value="">All genders</option><option>Male</option><option>Female</option></select>
          <select value={f.s} onChange={e => setF({ ...f, s: e.target.value })}><option value="">Any status</option><option value="pend">Has pending</option><option value="bad">Has not verified</option><option value="full">Fully verified</option></select>
          <select value={f.ds} onChange={e => setF({ ...f, ds: e.target.value })}><option value="">All designations</option>{Object.keys(des).sort().map(d => <option key={d}>{d}</option>)}</select>
          <button disabled={!shown.length} onClick={exportXlsx}>Export to Excel</button><button className="g" disabled={!shown.length} onClick={() => setPl(true)}>PDF view</button>
          <span className="kl">{shown.length} of {rows.length}</span>
        </div>
        <div className="tw vs"><table><thead><tr><th className="frz1">S.No</th><th className="frz2">Name</th><th>Father name</th><th>Gender</th><th>Designation</th><th>District</th>{DEG.map(([k, l]) => <th key={k}>{l}</th>)}{cols.grv && <th>Grievance</th>}{cols.deo && <th>DEO comments</th>}<th>Div: Director comments</th><th /></tr></thead>
          <tbody>{shown.map((x, i) => <tr key={x.id}><td className="frz1">{i + 1}</td><td className="frz2">{x.name}</td><td>{x.father || '—'}</td><td>{x.gender}</td><td>{x.desig}</td><td>{x.district}</td>
            {DEG.map(([k]) => <td key={k}><div>{x[k] || '—'}</div><Pill s={x[k + 'S']} />{(eff === 'dir' || eff === 'deo') && x.degFiles?.[k] && <div><a href="#" className="kl" onClick={async ev => { ev.preventDefault(); try { if (!(await openStored(x.degFiles[k]))) setMsg('That file is not stored in this browser.') } catch { setMsg('The file could not be opened.') } }}>View degree file</a></div>}</td>)}
            {cols.grv && <td className="cm">{x.grv || '—'}</td>}{cols.deo && <td className="cm">{x.deo || '—'}</td>}
            <td className="cm">{x.dec && <b>{x.dec}<br /></b>}{x.dir || (x.dec ? '' : '—')}</td>
            <td>{x.closed ? <span className="kl">🔒 Closed</span> : canReview ? <button className="sm" onClick={() => setOpen(x.id)}>Review</button> : <span className="kl">Review off</span>}</td></tr>)}</tbody></table></div>
      </div>
      {sel && canReview && !sel.closed && <div className="modal" onClick={() => setOpen(null)}><div className="mbox" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}><Review key={sel.id + role} e={sel} role={eff} real={role} onClose={() => setOpen(null)} onSave={p => { upd(sel.id, p); after(sel, p); setOpen(null) }} /></div></div>}
      {(role === 'dir' || role === 'deo' || role === 'ad') && <Team user={user} users={users} setUsers={setUsers} />}
{(role === 'entry' || role === 'ops') && tgt && <Import district={entryDist} onAdd={addE} onClear={role === 'entry' ? () => setDb({ rows: db.rows.filter(x => x.district !== user.district || x.closed || phOf(x) !== tgt?.id), sample: false }) : undefined} />}
      </>}
    </div>
  )
}

export default function App() {
  const [users, setUsers] = usePersist('empdash-users-v3', SEED_USERS)
  const [sess, setSess] = usePersist('empdash-session-v3', null)
  const [notes, setNotes] = usePersist('empdash-notes-v3', [])
  const [notices, setNotices] = usePersist('empdash-notices-v3', [])
  const [docs, setDocs] = usePersist('empdash-docs-v3', [])
  const [settings, setSettings] = usePersist('empdash-settings-v3', { deo: true, entry: true })
  const user = users.find(x => x.u === sess)
  return user ? <Dashboard user={user} users={users} setUsers={setUsers} logo={null} notes={notes} setNotes={setNotes} notices={notices} setNotices={setNotices} docs={docs} setDocs={setDocs} settings={settings} setSettings={setSettings} onLogout={() => setSess(null)} /> : <Login users={users} logo={null} onLogin={setSess} />
}
