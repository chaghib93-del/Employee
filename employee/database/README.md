# Database for the Employee Dashboard (Neon + Vercel)

This folder holds the PostgreSQL database for the project, ready for a **Neon** database used with **Vercel**.

| File | What it is |
|------|------------|
| `schema.sql` | All tables, rules, views and helper functions. Run this first. |
| `seed.sql` | Demo accounts, the sample phase SBK, 10 sample employees and 3 family quota applications (the same data as the demo app). Optional. |
| `drop_all.sql` | Deletes everything again (development only). |

## 1. Set up the database

1. In Neon, create a project and a database (PostgreSQL 15 or later).
2. Open **SQL Editor**, paste `schema.sql` and run it.
3. Optional, for a demo: paste `seed.sql` and run it.
4. For real use, skip `seed.sql` and create your own Director account:

```sql
INSERT INTO users (username, password_hash, role)
VALUES ('director', crypt('CHOOSE-A-STRONG-PASSWORD', gen_salt('bf', 10)), 'dir');
```

You can also run the files from a terminal: `psql "$DATABASE_URL" -f database/schema.sql`.

## 2. Connect Vercel

1. In Vercel, open the project, then **Storage** and add **Neon** (or paste the Neon connection string yourself). Vercel adds `DATABASE_URL` to the project. Use the pooled connection string.
2. Add `JWT_SECRET` (a long random text) and, if you store files in Vercel Blob, `BLOB_READ_WRITE_TOKEN`. See `.env.example`.
3. Never put `DATABASE_URL` in the React code. The browser must talk to Vercel serverless functions in an `/api` folder, and those functions talk to Neon.

Install the driver: `npm install @neondatabase/serverless`. Example `api/login.js`:

```js
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)

export default async function handler(req, res) {
  const { username, password } = req.body
  const rows = await sql`
    SELECT id, role, district FROM users
    WHERE username = ${username} AND is_active
      AND password_hash = crypt(${password}, password_hash)`
  if (!rows.length) return res.status(401).json({ error: 'Wrong username or password' })
  // sign a JWT with JWT_SECRET and return it
  res.json(rows[0])
}
```

## 3. How the app data maps to tables

| App data (browser storage today) | Table |
|---|---|
| `empdash-users-v3` | `users` |
| `empdash-phases-v1` | `phases`, `phase_districts` |
| `empdash-react-v2` (employee records) | `employees` |
| `empdash-fq-v1` (family quota) | `family_quota_applications` |
| `empdash-notices-v3` | `notices` |
| `empdash-docs-v3` | `documents` |
| `empdash-notes-v3` (messages and alerts) | `messages` |
| `empdash-settings-v3`, `empdash-cols-v1` | `app_settings` (`review_permissions`, `table_columns`) |
| Uploaded files (IndexedDB `empdash-files`) | `files` (+ Vercel Blob) |
| Who did what | `audit_log` |

Roles in `users.role`: `dir` Director / Admin level, `ad` Assistant Director, `deo` District Education Officer, `entry` Entry level operator, `ops` Office entry operator.

## 4. Rules built into the database

- **Data entry only in an open phase.** Inserting an employee fails unless the phase is `Active` and assigned to the employee's district.
- **Closed records are locked.** A record whose phase is completed cannot be edited. Reopening the phase unlocks it.
- **Degree status.** A degree with a number starts as `Pending`; a blank one is `N/A`.
- **Phase actions** are functions the Director's API calls:
  - `SELECT complete_phase(:phase_id, :user_id);` closes all records of the phase.
  - `SELECT reopen_phase(:phase_id, :user_id);` unlocks them.
  - `SELECT * FROM delete_completed_phase(:phase_id, :user_id);` deletes a completed phase with its records and returns the Blob URLs you must delete from Vercel Blob.
- **Which phases a district sees:** `SELECT * FROM phases_for_district('Quetta');`
- **Statistics** for the cards and charts: views `v_phase_stats`, `v_family_quota_stats` and `v_employee_verification`.
- **Files:** verified degree scans (matric, fsc, ba, prof) and family quota documents (death, heir) accept PDF, JPG or PNG up to 10 MB, one per slot. Notice and document attachments go up to 25 MB.

## 5. Things to do before real use

- Change or delete the demo accounts.
- Keep the permission checks (who may see which district, who may decide) in your API; the database stores the data and protects the phase rules.
- The React app still stores its data in the browser until its `usePersist` calls are replaced with calls to your `/api` functions.
