SAINT JOSEPH COLLEGE STUDENT INFORMATION SYSTEM — IMPROVED

REQUIREMENTS: Node.js (LTS) installed.

RUN THE BACKEND
1. Open a terminal in VS Code.
2. Run:
   cd backend
   npm install
   npm start
3. Keep this terminal open. API runs at http://localhost:5000.
   Check http://localhost:5000/api/health

RUN THE FRONTEND
1. Open a SECOND terminal.
2. Run:
   cd frontend
   npm install
   npm run dev
3. Open the localhost URL shown by Vite (usually http://localhost:5173).

IMPROVEMENTS
- All five program cards are clickable and open a program/event hub.
- Upload event title, date, description, and image for CICS, CCJE, CAS, CBM, or CTE.
- Uploaded event images are stored in backend/uploads and event details in backend/events.json.
- Dashboard and event feed refresh automatically about every 10 seconds for new posts.
- Search students by name, student ID, email, course, or program without needing to open the student's program first.
- Fifth Year option removed; year levels are 1st through 4th Year.
- Student records retain Add/Edit/Delete functionality and are stored in backend/students.json.
- Dark theme with green accents and orange glow.

LOGOS
The provided logos are in frontend/public/images. The CTE logo has not yet been supplied, so the CTE card temporarily uses the Saint Joseph College logo. When you send the official CTE logo, save it as frontend/public/images/cte-logo.png (or .jfif) and update the CTE logo path in frontend/src/App.jsx.
Event uploads require the backend to be running. Supported images: JPG, PNG, WEBP, GIF; maximum 8 MB each.


PRELOADED EVENT
- CAS Dance Duo Competition Champions — Intramurals 2026. Two provided event images are stored in backend/uploads and displayed in the event feed. Exact event date/time was not provided, so the entry clearly says exact date not provided.
- The provided College of Teacher Education (CTE) logo is stored at frontend/public/images/cte-logo.jfif.


LATEST EVENT UPDATE
Added CCJE event posts for the COQC Pinning of Ranks and Closing Ceremony (SY 2025–2026), with both user-provided photos. Exact ceremony date was not provided.

Added CBM event: BSBA and BSTM Students Prepare for the Season of Creation, including the supplied garden activity photo. Exact event date was not provided.


LATEST REQUESTED UPDATES
- Deleting an active student now archives the complete record in backend/archived_students.json instead of permanently deleting it.
- Added an Archived Students menu page with Restore and Delete Permanently actions.
- Restore checks for duplicate active Student IDs or email addresses before restoring.
- Event artwork now displays in landscape 16:9 format with a responsive event-card grid.
- Expanded the registration course dropdown across CICS, CCJE, CAS, CBM, and CTE. The course catalog is centralized in frontend/src/App.jsx under PROGRAMS.
- IMPORTANT: Expanded course options are common program/course examples. Confirm the official active course offerings and exact degree titles with Saint Joseph College's registrar before production use.
- New backend endpoints: GET /api/students/archive, POST /api/students/:id/restore, DELETE /api/students/archive/:id.
- Existing DELETE /api/students/:id now moves the student to the archive.
