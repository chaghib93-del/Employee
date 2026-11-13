# Directorate of Education (Schools) Quetta Division - Employee Appointment Dashboard

React + Vite. Three levels, each with its own login:
- Director / Admin: verifies degrees (Verified, Not verified, Pending, N/A), decides grievances, adds District Education Officers (DEOs) for each district.
- District Education Officer: sees only their district, comments on each employee, adds Entry level operators.
- Entry level operator: adds employees of their district with DRC number and alphanumeric Matric, FA/FSc, BA/BSc/BS and Professional Degree numbers.

## Logo
The Government of Balochistan logo is built in (src/logo.png). To swap it, replace that file and rebuild.

## Messages
The Messages button shows notifications (new records, grievances, DEO comments, Admin decisions) and lets
each level send messages: operator to DEO, DEO to Admin and operators, Admin to DEOs.

## Run
    npm install
    npm run dev
    npm run build      # creates dist/index.html, a single file ready to host

## Demo logins (edit SEED_USERS in src/App.jsx)
admin1 / admin123    deo.quetta / deo123    deo.pishin / deo123    entry.quetta / entry123

IMPORTANT: logins and data live in the browser only. They are NOT secure and are not shared between
devices. For real use connect a backend (Firebase Auth + Firestore, or Supabase; both have free plans).

## Free hosting (free subdomain on each)
- Netlify: app.netlify.com/drop, drag the dist folder -> yourname.netlify.app
- Cloudflare Pages: Create > Pages > Upload assets (dist) -> yourname.pages.dev
- Vercel: push to GitHub, import at vercel.com (Framework: Vite) -> yourname.vercel.app
- GitHub Pages: upload dist/index.html to a repo, Settings > Pages -> yourname.github.io
- Firebase Hosting: firebase init hosting (public dir: dist); firebase deploy -> yourapp.web.app

## Levels
Director / Admin: adds DEOs and Assistant Directors, switches Review on or off for DEOs and Entry operators, posts notices with documents.
Assistant Director (ad1 / ad123): reviews all districts, posts notices, adds office entry operators who can enter records for any district.
Notices: documents are kept in the browser (up to 5 files, 800 KB each) until a real backend is connected.
Documents: Director / Admin, Assistant Director and DEOs can upload meeting minutes and other documents (10 files per upload, 25 MB each, kept in the browser's IndexedDB). Directors can share with all DEOs, one district's DEO, or keep it private.

## PDF report and verified degree files
PDF report button (top right): opens a report with summary figures, degree verification charts, male/female ratio, top designations, district-wise verification and an optional employee data table. Pick a district or All districts, then Print / Save as PDF and choose "Save as PDF" as the destination.
Verified degree files: the Assistant Director opens Review on an employee and uses "Verified degree documents" to upload, replace or remove a PDF, JPG or PNG (10 MB each) for Matric, FA/FSc, BA/BSc/BS and Professional Degree. Files are kept in the browser's IndexedDB (same limits as Documents) and are opened from "View degree file" in the table. The Director and the DEOs (own district) can view the files but cannot upload, replace or remove them. The PDF report is available to the Director and the Assistant Director.

## Appointment phases
The Director generates appointment phases with a name (the app starts with a sample phase called SBK holding 10 sample entries) and assigns each phase to All districts or to specific districts and can use Generate another phase at any time, so more than one phase can be in progress. Only the assigned districts see a phase and its records, and their entry level operators can add or import records only while a phase assigned to their district is in progress, and choose which in-progress phase they are entering into; every new record belongs to that phase. The data table is headed with the viewed phase's name and has a switcher when there is more than one phase. Mark completed closes a phase's data (no Review, no degree file changes, no more entry) and shows a Process completed banner. The Director can View any phase, Reopen a completed phase, or Delete a completed phase, which permanently removes its records and uploaded degree files. DEOs, the Assistant Director and entry staff are notified when a phase is generated, completed, reopened or deleted. The phase name and status appear in the PDF report header.

## Table columns and records
The DRC number field has been removed from the table, forms, import and export. The CSV import format is now: name, father name, gender, designation, matric, fa/fsc, ba/bsc/bs, professional degree. The Director can add or remove the Grievance and DEO comment columns from the data table (and the Excel export) with the Table columns checkboxes above the table. The underlying grievance and DEO comment data is kept, and DEOs can still enter their comments in Review.

The Director decision column is now headed Div: Director comments. The Director and Assistant Director write the comments in Review (the Div: Director comments field), and the column shows the decision with the comments under it, in the table, the PDF report and the Excel export.

## New appointments: deceased employees' family quota
Open it with the Family quota button in the header (Back to dashboard returns). It records applications from family members of employees who died in service.
- Entry level operators and office operators add applications for their district (deceased employee, applicant, relation, date of birth, qualification, post applied for, and the death certificate and family/heirship certificate) and can edit them until the DEO acts.
- DEOs see their district's applications, can edit the application details and documents, and record a recommendation with DEO comments. The comments box is required whenever the DEO changes any details, and the table marks applications whose details the DEO edited.
- The Director opens an application with View (the table has no Delete button), sets the status to Recommend, In process, On held or Objection with Div: Director comments, and can delete the record from inside that pop-up (with a confirmation).
- The Assistant Director can view all applications. Everyone can export the applications they can see to Excel.
Notifications go to the DEO, entry operators and Director at each step. Data and attached files are kept in the browser like the rest of the app.

The Family quota module also has a Statistics card: male/female ratio (from the applicant's relation: son, husband and brother count as male; daughter, wife and sister as female), top posts applied for, and, for the Director and Assistant Director, district-wise applications by status. The ratio also appears in the summary cards and the Excel export has a Gender column.

## Smart Excel / CSV import
Both the employee Import panel and the Family quota module (Import from Excel) accept an .xlsx, .xls or .csv file with any column headings. The app finds the heading row (titles above it are ignored), matches each heading to our columns using synonyms, similar spelling and what the values look like (for example Male/Female or relation values), and shows the matches with a confidence label. You can change any match before importing. Dates in dd/mm/yyyy, yyyy-mm-dd, real Excel dates and Excel serial numbers are understood. Rows missing required values are skipped and counted. This matching runs in the browser with built-in rules (no AI service is called and no data leaves the browser).

## Smart Excel upload (column matching)
Entry level operators and office operators can upload an Excel (.xlsx, .xls) or CSV sheet from Import Excel, CSV or clear data (employee records), and from Import Excel in the Family quota module (applications). The app reads the column headings in your file, whatever their order or wording, and matches them to our own columns: it compares headings with known alternative names (for example "S/O", "Sex", "Intermediate", "D.O.B", "Relationship"), tolerates spelling mistakes, and also looks at the values (for example M/F for gender). Each match shows Matched, Likely or Not matched, you can change any of them from a drop-down, and you see a preview and a count of rows that will be skipped before you import. Dates can be real Excel dates or text such as 12/03/2004. The matching runs in the browser (no data leaves it) and needs no API key.

When a DEO reviews a candidate's data, Review shows the candidate's designation and gender, degree statuses and any verified degree files, and a highlighted DEO comments box with a Save DEO comments button. The same DEO comments wording is used in the table, the Excel export and the Family quota review.


The Family quota search filters now include a District filter (Director and Assistant Director), next to search and status.

## Scrolling tables, frozen columns, personal No. and PDF view
The data table and the family quota table scroll up and down inside their card (the column headings stay in view), and S.No with Name (dashboard) or S.No with Applicant (family quota) stay frozen on the left when you scroll sideways. Family quota has a Deceased employee Personal No. column (a field on the form, in the Excel import and the export). Both tables have a PDF view button that lists all entries that match the current filters; Print / Save as PDF produces a landscape A4 document whose last page carries the stamp of the DIVISIONAL DIRECTOR OF EDUCATION (S) QUETTA DIVISION QUETTA. The stamp is also on the last page of the Director's PDF report.
#   E m p l o y e e  
 #   E m p l o y e e  
 #   E m p l o y e e  
 "# Employee" 
"# Employee" 
