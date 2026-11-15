# Deploy guide: Supabase (database, logins, files) + Vercel (website)

You do **not** write any backend. Supabase is the database, login system and file storage.
Vercel hosts the website and one small function (`api/admin-users.js`) that creates logins.

Time needed: about 30 minutes, once.

---

## Step 1. Create the Supabase project

1. Go to **supabase.com**, sign in, click **New project**. Choose a name, a strong database password (save it) and the region closest to you.
2. Wait until the project is ready.
3. Open **SQL Editor > New query**, paste all of `supabase/schema.sql`, click **Run**. It must finish with "Success".

## Step 2. Lock down sign-ups

**Authentication > Sign In / Providers** (or *Providers > Email*): turn **OFF** "Allow new users to sign up".
Only the Director can create logins, through the app.

## Step 3. Create the first Director login

1. **Authentication > Users > Add user > Create new user**
   - Email: `admin1@emp-login.app` (username `admin1`, then `@emp-login.app`)
   - Password: a strong one
   - Tick **Auto Confirm User**
2. **SQL Editor**: paste `supabase/first-admin.sql` and **Run**. You should see one row: `admin1 | dir`.

> If Supabase refuses the `emp-login.app` address, pick any other domain name (for example `yourname.pk`),
> use it in step 1 and in `first-admin.sql`, and set `VITE_LOGIN_DOMAIN` to it in Vercel (step 5).
> No email is ever sent to these addresses.

## Step 4. Copy your keys

**Project Settings > API** (or **API Keys**):
- **Project URL** -> `VITE_SUPABASE_URL`
- **anon / Publishable key** -> `VITE_SUPABASE_ANON_KEY`
- **service_role / Secret key** -> `SUPABASE_SERVICE_ROLE_KEY` (secret: never share it, never post it online)

## Step 5. Put the project on Vercel

1. Create a GitHub repository and upload everything in this folder (not `node_modules`, `dist` or any `.env` file; `.gitignore` already skips them).
2. On **vercel.com**: **Add New > Project**, import that repository. Framework: **Vite** (detected automatically).
3. Before pressing Deploy, open **Environment Variables** and add the three names from step 4
   (plus `VITE_LOGIN_DOMAIN` only if you changed the domain).
4. Click **Deploy**. Your site opens at `yourproject.vercel.app`.

If you add or change a variable later, press **Redeploy** in Vercel.

## Step 6. First use

1. Open the site, sign in as `admin1`.
2. **Generate an appointment phase** (the Director does this first; data entry stays closed until a phase exists).
3. Add District Education Officers and Assistant Directors under **Team**. DEOs add their Entry operators; Assistant Directors add Office operators.
4. Someone forgot their password? In Supabase open **Authentication > Users**, click the user and set a new password there. (Users can change their own password in the app under Messages.)

---

## Test on your own computer (optional)

```
npm install
copy .env.example to .env.local and fill it in
npx vercel dev        # runs the website AND the /api function together
```
`npm run dev` alone shows the site but creating logins will not work, because `/api` is served by Vercel.

## What was changed from the original project

| Before | Now |
|---|---|
| Data in browser storage (not shared, not secure) | Supabase Postgres tables, shared by everyone |
| Demo logins in the code | Supabase Auth (passwords are hashed by Supabase) |
| Files in the browser | Private Supabase Storage bucket `files` (25 MB limit) |
| Neon + custom `/api` code (database/ folder) | Not needed. Replaced by `supabase/` |
| Who sees what: app screens only | Also enforced in the database (Row Level Security) |

## Security: what is and is not enforced by the database

Enforced: only signed-in users with a role can read anything; DEOs and Entry operators only see their own district;
only the Director creates/completes/reopens/deletes phases and settings; records can be entered only in an open phase for that
district; completed-phase records cannot be edited; messages are visible only to sender and receiver; notices and documents follow their audience.

Not enforced (screens only): which *field* each level may change inside a record they can edit (for example, a DEO changing a degree status).
This needs a database trigger per field if you want it locked; ask for it before real use.

## Running costs and limits to check

- Supabase Free pauses a project after about a week with no activity and has limited storage and no downloadable backups.
  For real government data use a paid plan, or export to Excel regularly.
- Vercel Hobby is for personal, non-commercial use. Check Vercel's current plan terms for an official department site.
- Notice attachments (up to 5 files of 800 KB) are stored inside the notice record; Documents and degree scans use Storage.
