import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = "https://saint-joseph-student-information-system-lr9v.onrender.com/api";
const API_URL = `${API_BASE}/students`;
// Central course catalog. Confirm the final list with the registrar before treating it as official.
const PROGRAMS = {
  CICS: { name: "College of Information and Computing Sciences", logo: "/images/cics-logo.jfif", courses: [
    "BS Information Technology", "BS Computer Science", "BS Information Systems"
  ] },
  CCJE: { name: "College of Criminal Justice Education", logo: "/images/ccje-logo.jfif", courses: [
    "BS Criminology"
  ] },
  CAS: { name: "College of Arts and Sciences", logo: "/images/cas-logo.jfif", courses: [
    "BA English Language Studies", "BS Psychology", "BS Biology", "BS Mathematics", "BA Political Science"
  ] },
  CBM: { name: "College of Business and Management", logo: "/images/cbm-logo.jfif", courses: [
    "BS Business Administration - Financial Management", "BS Business Administration - Marketing Management",
    "BS Business Administration - Human Resource Management", "BS Tourism Management"
  ] },
  CTE: { name: "College of Teacher Education", logo: "/images/cte-logo.jfif", courses: [
    "Bachelor of Elementary Education", "Bachelor of Secondary Education - English",
    "Bachelor of Secondary Education - Filipino", "Bachelor of Secondary Education - Mathematics",
    "Bachelor of Secondary Education - Science", "Bachelor of Secondary Education - Social Studies"
  ] }
};



const emptyForm = { studentId: "", firstName: "", middleName: "", lastName: "", email: "", program: "CICS", course: PROGRAMS.CICS.courses[0], year: "1st Year" };

function App() {
  const [page, setPage] = useState("Dashboard");
  const [students, setStudents] = useState([]);
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState("All");
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({ title: "", description: "", eventDate: "" });
  const [eventImage, setEventImage] = useState(null);

  const loadStudents = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Unable to load students.");
      setStudents(await response.json());
      setConnected(true);
      setError("");
    } catch {
      setConnected(false);
      setError("Cannot connect to the backend. Start the backend server on port 5000.");
    }
  }, []);

  const loadArchivedStudents = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/archive`);
      if (response.ok) setArchivedStudents(await response.json());
    } catch (e) { console.warn("Archive refresh failed", e); }
  }, []);

  const loadEvents = useCallback(async () => {
    try { const response = await fetch(`${API_BASE}/events`); if (response.ok) setEvents(await response.json()); } catch (e) { console.warn("Events refresh failed", e); }
  }, []);
  useEffect(() => {
    loadStudents(); loadArchivedStudents(); loadEvents();
    const refresh = window.setInterval(() => { loadStudents(); loadArchivedStudents(); loadEvents(); }, 10000);
    return () => window.clearInterval(refresh);
  }, [loadStudents, loadArchivedStudents, loadEvents]);

  const submitEvent = async (event) => {
    event.preventDefault(); setMessage(""); setError("");
    if (!eventImage) { setError("Please choose an event image to upload."); return; }
    const payload = new FormData();
    payload.append("program", selectedProgram === "All" ? "CICS" : selectedProgram);
    payload.append("title", eventForm.title); payload.append("description", eventForm.description);
    payload.append("eventDate", eventForm.eventDate); payload.append("image", eventImage);
    try {
      const response = await fetch(`${API_BASE}/events`, { method: "POST", body: payload });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not upload event.");
      setMessage("Event uploaded successfully and is now visible in the event feed.");
      setEventForm({ title: "", description: "", eventDate: "" }); setEventImage(null);
      event.target.reset(); await loadEvents();
    } catch (err) { setError(err.message || "Could not connect to the backend."); }
  };
  const deleteEvent = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try { const r = await fetch(`${API_BASE}/events/${id}`, { method: "DELETE" }); const data = await r.json(); if (!r.ok) throw new Error(data.message); await loadEvents(); setMessage("Event deleted."); }
    catch (e) { setError(e.message || "Could not delete event."); }
  };

  const visibleStudents = useMemo(() => students.filter(student => {
    const fullName = `${student.firstName} ${student.middleName || ""} ${student.lastName}`.toLowerCase();
    const term = search.toLowerCase();
    return (selectedProgram === "All" || student.program === selectedProgram || term.trim() !== "") &&
      [student.studentId, fullName, student.email, student.course, student.program].some(value => String(value || "").toLowerCase().includes(term));
  }), [students, search, selectedProgram]);

  const updateForm = (event) => {
    const { name, value } = event.target;
    if (name === "program") {
      setForm(previous => ({ ...previous, program: value, course: PROGRAMS[value].courses[0] }));
    } else {
      setForm(previous => ({ ...previous, [name]: value }));
    }
  };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const submitStudent = async (event) => {
    event.preventDefault();
    setMessage(""); setError("");
    try {
      const response = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not save student.");
      setMessage(editingId ? "Student record updated successfully." : "Student registered successfully.");
      resetForm();
      setPage("Students");
      await loadStudents();
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    }
  };

  const editStudent = (student) => {
    setForm({
      studentId: student.studentId, firstName: student.firstName, middleName: student.middleName || "",
      lastName: student.lastName, email: student.email, program: student.program,
      course: student.course, year: student.year
    });
    setEditingId(student.id);
    setPage("Register");
    setMessage("");
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(`Move ${student.firstName} ${student.lastName}'s record to the archive? You can restore it later.`)) return;
    try {
      const response = await fetch(`${API_URL}/${student.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not delete student.");
      setMessage("Student moved to the archive. You can restore it from Archived Students.");
      setError("");
      await Promise.all([loadStudents(), loadArchivedStudents()]);
    } catch (err) { setError(err.message); }
  };

  const restoreStudent = async (student) => {
    if (!window.confirm(`Restore ${student.firstName} ${student.lastName} to active student records?`)) return;
    try {
      const response = await fetch(`${API_URL}/${student.id}/restore`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not restore student.");
      setMessage("Student restored successfully.");
      setError("");
      await Promise.all([loadStudents(), loadArchivedStudents()]);
    } catch (err) { setError(err.message || "Could not restore student."); }
  };

  const permanentlyDeleteStudent = async (student) => {
    if (!window.confirm(`Permanently delete ${student.firstName} ${student.lastName}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`${API_URL}/archive/${student.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not permanently delete student.");
      setMessage("Archived student permanently deleted.");
      await loadArchivedStudents();
    } catch (err) { setError(err.message || "Could not permanently delete student."); }
  };

  const navItems = [
    { label: "Dashboard", icon: "▦" },
    { label: "Register", icon: "＋" },
    { label: "Students", icon: "☷" },
    { label: "Archived Students", icon: "▤" },
    { label: "Programs & Events", icon: "▣" }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/images/saint-joseph-logo.jfif" alt="Saint Joseph College logo" className="school-logo" />
          <div><strong>ST. JOSEPH</strong><span>STUDENT INFORMATION SYSTEM</span></div>
        </div>
        <div className="sidebar-label">MAIN MENU</div>
        <nav>
          {navItems.map(item => (
            <button key={item.label} className={`nav-button ${page === item.label ? "active" : ""}`} onClick={() => { setPage(item.label); setMessage(""); setError(""); if (item.label === "Register") resetForm(); }}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className={`connection-dot ${connected ? "online" : ""}`} />
          <div><b>{connected ? "Backend connected" : "Backend offline"}</b><span>API • Render Cloud Server</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><div className="eyebrow">SAINT JOSEPH COLLEGE OF BAGGAO</div><h1>{page === "Register" ? (editingId ? "Edit Student" : "Student Registration") : page === "Students" ? "Student Directory" : page === "Archived Students" ? "Archived Students" : page === "Programs & Events" ? "Programs & Events" : "Dashboard"}</h1></div>
          <div className="topbar-right"><span className="status-pill">CAMPUS EVENTS & STUDENTS</span><img src="/images/saint-joseph-logo.jfif" alt="School logo" className="top-logo" /></div>
        </header>

        {(message || error) && <div className={`alert ${error ? "alert-error" : "alert-success"}`}>{error || message}<button onClick={() => { setMessage(""); setError(""); }} aria-label="Dismiss">×</button></div>}

        {page === "Dashboard" && (
          <section className="page-section">
            <div className="welcome-banner">
              <div className="welcome-copy"><span className="orange-kicker">WELCOME TO YOUR PORTAL</span><h2>Manage students.<br /><em>Build the future.</em></h2><p>A central place for student registration, academic programs, and campus activities.</p><button className="primary-button" onClick={() => { resetForm(); setPage("Register"); }}>＋ Register a Student</button></div>
              <div className="welcome-emblem"><img src="/images/saint-joseph-logo.jfif" alt="Saint Joseph College seal" /></div>
              <div className="banner-glow" />
            </div>

            <div className="stats-grid">
              <StatCard label="TOTAL STUDENTS" value={students.length} icon="♙" tone="green" />
              <StatCard label="ACADEMIC PROGRAMS" value="05" icon="▤" tone="orange" />
              <StatCard label="REGISTERED TODAY" value={students.filter(s => new Date(s.createdAt || 0).toDateString() === new Date().toDateString()).length} icon="↗" tone="green" />
              <StatCard label="CAMPUS EVENTS" value={events.length} icon="◉" tone="orange" />
            </div>

            <div className="section-heading"><div><span className="orange-kicker">CAMPUS LIFE</span><h2>Programs & Events</h2><p>Explore the colleges and their campus activities.</p></div><span className="section-count">5 PROGRAMS</span></div>
            <div className="program-grid">
              {Object.entries(PROGRAMS).map(([code, program]) => (
                <button className="program-card" key={code} onClick={() => { setSelectedProgram(code); setPage("Programs & Events"); }}>
                  <div className="program-logo-wrap"><img src={program.logo} alt={`${code} logo`} onError={(e) => { e.currentTarget.src = "/images/saint-joseph-logo.jfif"; }} /></div>
                  <div className="program-card-text"><span>{code}</span><h3>{program.name}</h3><small>{students.filter(s => s.program === code).length} registered students</small></div><span className="card-arrow">↗</span>
                </button>
              ))}
            </div>

            <div className="section-heading events-heading"><div><span className="orange-kicker">WHAT'S HAPPENING</span><h2>Saint Joseph Events</h2><p>Activity highlights across CICS, CCJE, CAS, CBM, and CTE.</p></div></div>
            <div className="events-grid">
              {events.slice(0, 10).map(event => (
                <article className="event-card" key={event.id}>
                  <div className="event-image"><img src={event.image.startsWith("http") ? event.image : `https://saint-joseph-student-information-system-lr9v.onrender.com${event.image}`} alt={`${event.program} event`} loading="lazy" /><span>{event.program}</span></div>
                  <div className="event-info"><small>{event.eventDate || new Date(event.createdAt).toLocaleString()}</small><h3>{event.title}</h3><p>{event.description}</p><button onClick={() => { setSelectedProgram(event.program); setPage("Programs & Events"); }}>Open program <span>→</span></button></div>
                </article>
              ))}
              {!events.length && <div className="empty-state event-empty"><div>▣</div><h3>No uploaded events yet</h3><p>Select a program and upload an event photo to publish it here.</p><button className="primary-button" onClick={() => { setSelectedProgram("CICS"); setPage("Programs & Events"); }}>＋ Add first event</button></div>}
            </div>
            <div className="section-heading recent-heading"><div><span className="orange-kicker">LATEST RECORDS</span><h2>Recently Registered Students</h2></div><button className="text-button" onClick={() => { setSelectedProgram("All"); setPage("Students"); }}>View all students →</button></div>
            <StudentTable students={students.slice(0, 5)} onEdit={editStudent} onDelete={deleteStudent} compact />
          </section>
        )}

        {page === "Register" && (
          <section className="page-section narrow-section">
            <div className="form-intro"><div className="form-icon">＋</div><div><span className="orange-kicker">STUDENT RECORDS</span><h2>{editingId ? "Update student information" : "Register a new student"}</h2><p>Enter the student's information below. Fields marked with * are required.</p></div></div>
            <form className="student-form" onSubmit={submitStudent}>
              <div className="form-section-title"><span>01</span><h3>Personal Information</h3></div>
              <div className="form-grid">
                <Field label="Student ID *" name="studentId" value={form.studentId} onChange={updateForm} placeholder="e.g. 2026-0001" required />
                <Field label="Email Address *" name="email" type="email" value={form.email} onChange={updateForm} placeholder="student@email.com" required />
                <Field label="First Name *" name="firstName" value={form.firstName} onChange={updateForm} placeholder="First name" required />
                <Field label="Middle Name" name="middleName" value={form.middleName} onChange={updateForm} placeholder="Middle name (optional)" />
                <Field label="Last Name *" name="lastName" value={form.lastName} onChange={updateForm} placeholder="Last name" required />
              </div>
              <div className="form-section-title"><span>02</span><h3>Academic Information</h3></div>
              <div className="form-grid">
                <label className="field"><span>Academic Program *</span><select name="program" value={form.program} onChange={updateForm} required>{Object.keys(PROGRAMS).map(code => <option key={code} value={code}>{code} — {PROGRAMS[code].name}</option>)}</select></label>
                <label className="field"><span>Course *</span><select name="course" value={form.course} onChange={updateForm} required>{[...new Set([...PROGRAMS[form.program].courses, ...(form.course && !PROGRAMS[form.program].courses.includes(form.course) ? [form.course] : [])])].map(course => <option key={course} value={course}>{course}</option>)}</select></label>
                <label className="field"><span>Year Level *</span><select name="year" value={form.year} onChange={updateForm} required>{["1st Year", "2nd Year", "3rd Year", "4th Year"].map(year => <option key={year}>{year}</option>)}</select></label>
              </div>
              <div className="form-actions"><button type="button" className="secondary-button" onClick={resetForm}>Clear form</button><button className="primary-button" type="submit">{editingId ? "Save Changes" : "＋ Register Student"}</button></div>
            </form>
          </section>
        )}

        {page === "Students" && (
          <section className="page-section">
            <div className="directory-toolbar"><div><span className="orange-kicker">RECORD MANAGEMENT</span><h2>All Student Records</h2><p>Search, view, edit, or delete student records.</p></div><button className="primary-button" onClick={() => { resetForm(); setPage("Register"); }}>＋ Add Student</button></div>
            <div className="filter-bar"><div className="search-box"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, ID, email, course..." /></div><select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}><option value="All">All Programs</option>{Object.keys(PROGRAMS).map(code => <option key={code}>{code}</option>)}</select><span className="result-count">{visibleStudents.length} record(s)</span></div>
            <StudentTable students={visibleStudents} onEdit={editStudent} onDelete={deleteStudent} />
          </section>
        )}
        {page === "Archived Students" && (
          <section className="page-section">
            <div className="directory-toolbar">
              <div><span className="orange-kicker">RECOVERABLE RECORDS</span><h2>Archived Student Records</h2><p>Deleted student records are kept here until they are restored or permanently removed.</p></div>
              <span className="section-count">{archivedStudents.length} ARCHIVED</span>
            </div>
            {!archivedStudents.length ? (
              <div className="empty-state"><div>▤</div><h3>No archived students</h3><p>When you archive a student from the directory, the record will appear here.</p></div>
            ) : (
              <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>PROGRAM / COURSE</th><th>YEAR LEVEL</th><th>ARCHIVED ON</th><th>ACTIONS</th></tr></thead><tbody>
                {archivedStudents.map(student => <tr key={student.id}>
                  <td><div className="student-name"><span className="avatar">{student.firstName?.[0]}{student.lastName?.[0]}</span><div><b>{student.firstName} {student.middleName ? `${student.middleName} ` : ""}{student.lastName}</b><small>{student.email}</small></div></div></td>
                  <td><span className="id-badge">{student.studentId}</span></td>
                  <td><div className="course-cell"><b>{student.program}</b><small>{student.course}</small></div></td>
                  <td>{student.year}</td>
                  <td>{student.archivedAt ? new Date(student.archivedAt).toLocaleDateString() : "—"}</td>
                  <td><div className="action-buttons"><button onClick={() => restoreStudent(student)}>Restore</button><button className="delete-action" onClick={() => permanentlyDeleteStudent(student)}>Delete permanently</button></div></td>
                </tr>)}
              </tbody></table></div>
            )}
          </section>
        )}

        {page === "Programs & Events" && (
          <section className="page-section">
            <div className="directory-toolbar"><div><span className="orange-kicker">PROGRAM HUB</span><h2>{selectedProgram === "All" ? "All Programs" : selectedProgram}</h2><p>Choose any program to view its event posts or upload a new campus activity.</p></div></div>
            <div className="program-picker">
              {Object.entries(PROGRAMS).map(([code, program]) => <button key={code} className={`program-card ${selectedProgram === code ? "program-selected" : ""}`} onClick={() => setSelectedProgram(code)}><div className="program-logo-wrap"><img src={program.logo} alt={`${code} logo`} onError={e => { e.currentTarget.src = "/images/saint-joseph-logo.jfif"; }} /></div><div className="program-card-text"><span>{code}</span><h3>{program.name}</h3><small>{events.filter(ev => ev.program === code).length} event(s)</small></div><span className="card-arrow">↗</span></button>)}
            </div>
            <div className="event-upload-panel">
              <div className="section-heading"><div><span className="orange-kicker">PUBLISH AN ACTIVITY</span><h2>Upload {selectedProgram} Event</h2><p>Image uploads are saved on the backend and shared to the dashboard.</p></div></div>
              <form className="student-form event-form" onSubmit={submitEvent}>
                <div className="form-grid">
                  <Field label="Event title *" name="title" value={eventForm.title} onChange={e => setEventForm(v => ({...v, title:e.target.value}))} placeholder="e.g. CICS Tech Week" required />
                  <Field label="Event date" name="eventDate" type="date" value={eventForm.eventDate} onChange={e => setEventForm(v => ({...v, eventDate:e.target.value}))} />
                  <label className="field field-wide"><span>Description</span><textarea value={eventForm.description} onChange={e => setEventForm(v => ({...v, description:e.target.value}))} placeholder="Write a short description of the event..." rows="3" /></label>
                  <label className="field field-wide"><span>Event image * (JPG, PNG, WEBP, GIF; max 8 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => setEventImage(e.target.files?.[0] || null)} required /></label>
                </div>
                <div className="form-actions"><button type="submit" className="primary-button">＋ Publish Event</button></div>
              </form>
            </div>
            <div className="section-heading events-heading"><div><span className="orange-kicker">LIVE EVENT FEED</span><h2>{selectedProgram} Events</h2><p>New posts refresh automatically about every 10 seconds.</p></div></div>
            <div className="events-grid">
              {events.filter(ev => selectedProgram === "All" || ev.program === selectedProgram).map(ev => <article className="event-card" key={ev.id}><div className="event-image"><img src={ev.image.startsWith("http") ? ev.image : `https://saint-joseph-student-information-system-lr9v.onrender.com${ev.image}`} alt={ev.title} /><span>{ev.program}</span></div><div className="event-info"><small>{ev.eventDate || new Date(ev.createdAt).toLocaleDateString()}</small><h3>{ev.title}</h3><p>{ev.description}</p></div></article>)}
              {!events.some(ev => selectedProgram === "All" || ev.program === selectedProgram) && <div className="empty-state"><div>▣</div><h3>No events for {selectedProgram} yet</h3><p>Upload the first event above. It will appear here and on the dashboard.</p></div>}
            </div>
          </section>
        )}
        <footer className="footer"><span>© {new Date().getFullYear()} Saint Joseph College of Baggao</span><span>STUDENT INFORMATION SYSTEM <b>•</b> Built for campus management</span></footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  return <div className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><div className="stat-bottom"><span className="stat-line" />Live system overview</div></div>;
}
function Field({ label, name, value, onChange, placeholder, type = "text", required = false }) {
  return <label className="field"><span>{label}</span><input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} /></label>;
}
function StudentTable({ students, onEdit, onDelete, compact = false }) {
  if (!students.length) return <div className="empty-state"><div>☷</div><h3>No student records found</h3><p>Register a student to see their record here.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>PROGRAM / COURSE</th><th>YEAR LEVEL</th><th className="actions-heading">ACTIONS</th></tr></thead><tbody>{students.map(student => <tr key={student.id}><td><div className="student-name"><span className="avatar">{student.firstName?.[0]}{student.lastName?.[0]}</span><div><b>{student.firstName} {student.middleName ? `${student.middleName} ` : ""}{student.lastName}</b><small>{student.email}</small></div></div></td><td><span className="id-badge">{student.studentId}</span></td><td><div className="course-cell"><b>{student.program}</b><small>{student.course}</small></div></td><td>{student.year}</td><td><div className="action-buttons"><button title="Edit student" onClick={() => onEdit(student)}>Edit</button>{!compact && <button title="Delete student" className="delete-action" onClick={() => onDelete(student)}>Delete</button>}</div></td></tr>)}</tbody></table></div>;
}

export default App;
