# Directorate of Education (Schools) Quetta Division - Employee Appointment Dashboard

React + Vite website, with **Supabase** (database, logins, file storage) and **Vercel** (hosting + one small function).

**To deploy, follow [SETUP.md](SETUP.md).**

Folders: `src/` the website; `src/lib/` the Supabase connection; `api/admin-users.js` the only server code (creates and removes logins);
`supabase/` the database (`schema.sql`, `first-admin.sql`, `reset.sql`).

Roles: Director / Admin, Assistant Director, District Education Officer, Entry level operator, Office entry operator.
What each level can do in the app is described in the screens themselves; the database also limits who can see which district's records.
