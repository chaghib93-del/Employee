-- =====================================================================
-- Employee Dashboard: DEMO data for Neon (run AFTER schema.sql)
-- Creates the demo accounts, the sample phase SBK and the sample records
-- that the demo app shows. Do NOT use the demo passwords in production:
-- change them or skip this file and create real users (see README.md).
--
--   psql "$DATABASE_URL" -f database/seed.sql
-- =====================================================================

BEGIN;

-- Demo accounts (passwords are hashed with bcrypt by pgcrypto)
INSERT INTO users (username, password_hash, role, district) VALUES
  ('admin1',      crypt('admin123', gen_salt('bf', 10)), 'dir',   NULL),
  ('ad1',         crypt('ad123',    gen_salt('bf', 10)), 'ad',    NULL),
  ('deo.quetta',  crypt('deo123',   gen_salt('bf', 10)), 'deo',   'Quetta'),
  ('deo.pishin',  crypt('deo123',   gen_salt('bf', 10)), 'deo',   'Pishin'),
  ('entry.quetta',crypt('entry123', gen_salt('bf', 10)), 'entry', 'Quetta');

-- Sample appointment phase, assigned to all districts
INSERT INTO phases (name, status, all_districts, created_by)
SELECT 'SBK', 'Active', true, id FROM users WHERE username = 'admin1';

-- 10 sample employees in the SBK phase
INSERT INTO employees (phase_id, district, name, father_name, gender, designation,
                       matric_no, matric_status, fsc_no, fsc_status, ba_no, ba_status, prof_no, prof_status,
                       grievance, deo_comments, director_decision, director_comments)
SELECT p.id, v.*
FROM phases p,
(VALUES
  ('Quetta', 'Ali Raza', 'Muhammad Aslam', 'Male', 'Procurement Officer', 'QTA10231', 'Verified', 'QTA20877', 'Verified', 'UOB30412', 'Verified', '', 'N/A', NULL, 'Documents verified; appointment satisfactory.', NULL, NULL),
  ('Quetta', 'Sana Malik', 'Abdul Malik', 'Female', 'Assistant Manager', 'QTA10544', 'Verified', 'QTA20931', 'Verified', 'UOB30677', 'Verified', 'MBA-7781', 'Verified', NULL, NULL, NULL, NULL),
  ('Quetta', 'Bilal Ahmed', 'Ahmed Tariq', 'Male', 'Site Engineer', 'QTA10688', 'Verified', 'QTA21002', 'Verified', 'UOB30790', 'Pending', 'PEC-4410', 'Pending', NULL, NULL, NULL, NULL),
  ('Quetta', 'Hina Khan', 'Khalid Khan', 'Female', 'Data Entry Operator', 'QTA10712', 'Verified', 'QTA21113', 'Pending', '', 'N/A', '', 'N/A', 'Appointment letter issued without merit list display.', 'Documents complete; FSc verification awaited from Board.', NULL, NULL),
  ('Pishin', 'Usman Tariq', 'Tariq Mehmood', 'Male', 'Driver', 'PSH10021', 'Verified', '', 'N/A', '', 'N/A', '', 'N/A', NULL, NULL, NULL, NULL),
  ('Pishin', 'Ayesha Noor', 'Iqbal Hussain', 'Female', 'Accounts Officer', 'PSH10090', 'Verified', 'PSH20144', 'Verified', 'UOB31020', 'Verified', 'ACCA-2210', 'Pending', NULL, NULL, NULL, NULL),
  ('Quetta', 'Imran Shah', 'Shah Nawaz', 'Male', 'Civil Engineer', 'QTA10901', 'Verified', 'QTA21340', 'Verified', 'BUET-5521', 'Verified', 'PEC-8812', 'Not verified', 'Complaint about delay in posting order.', 'Degree verification flagged; recommended hold.', 'Under review', 'Verification report requested from university.'),
  ('Killa Abdullah', 'Farah Iqbal', 'Iqbal Ahmed', 'Female', 'Office Assistant', 'KLA10033', 'Verified', 'KLA20010', 'Verified', 'UOB31201', 'Pending', '', 'N/A', NULL, NULL, NULL, NULL),
  ('Killa Abdullah', 'Kamran Ali', 'Ali Akbar', 'Male', 'Store Keeper', 'KLA10077', 'Pending', '', 'N/A', '', 'N/A', '', 'N/A', NULL, NULL, NULL, NULL),
  ('Pishin', 'Zahid Mehmood', 'Mehmood Khan', 'Male', 'Junior Clerk', 'PSH10150', 'Verified', 'PSH20201', 'Verified', '', 'N/A', '', 'N/A', NULL, NULL, NULL, NULL)
) AS v(district, name, father_name, gender, designation,
       matric_no, matric_status, fsc_no, fsc_status, ba_no, ba_status, prof_no, prof_status,
       grievance, deo_comments, director_decision, director_comments)
WHERE p.name = 'SBK';

-- 3 sample family quota applications
INSERT INTO family_quota_applications
  (district, deceased_name, deceased_personal_no, deceased_designation, deceased_bps, date_of_death,
   applicant_name, relation, applicant_dob, qualification, post_applied,
   status, deo_recommendation, deo_comments, director_comments)
SELECT v.district, v.deceased_name, v.deceased_personal_no, v.deceased_designation, v.deceased_bps::smallint, v.date_of_death::date,
       v.applicant_name, v.relation, v.applicant_dob::date, v.qualification, v.post_applied,
       v.status, v.deo_recommendation, v.deo_comments, v.director_comments
FROM (VALUES
  ('Quetta', 'Abdul Ghani', 'P-10421', 'Senior Clerk', '16', '2026-08-14', 'Bilal Ahmed', 'Son', '2004-03-12', 'FA', 'Junior Clerk', 'Applied', NULL, NULL, NULL),
  ('Quetta', 'Noor Muhammad', 'P-08877', 'Naib Qasid', '4', '2026-06-02', 'Sana Bibi', 'Wife', '1992-07-21', 'Matric', 'Naib Qasid', 'Recommended by DEO', 'Recommended', 'Documents verified.', NULL),
  ('Pishin', 'Gul Khan', 'P-07310', 'Driver', '5', '2026-05-19', 'Hamid Khan', 'Son', '2003-11-02', 'Matric', 'Driver', 'Recommend', 'Recommended', 'Family is eligible.', 'Recommended. Proceed after heirship verification.')
) AS v(district, deceased_name, deceased_personal_no, deceased_designation, deceased_bps, date_of_death,
       applicant_name, relation, applicant_dob, qualification, post_applied,
       status, deo_recommendation, deo_comments, director_comments);

COMMIT;
