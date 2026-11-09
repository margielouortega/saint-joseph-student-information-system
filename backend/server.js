
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5000;

// Persistent storage directory
const DATA_DIR = process.env.DATA_DIR || __dirname;

const DATA_FILE = path.join(DATA_DIR, "students.json");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const ARCHIVE_FILE = path.join(DATA_DIR, "archived_students.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Your deployed frontend
const allowedOrigins = [
    "https://saint-joseph-student-information-sy.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000"
];

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    }
}));

app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

// JSON database functions
const readJson = (file, fallback = []) => {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
        }

        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        console.error("Read error:", error.message);
        return fallback;
    }
};

const saveJson = (file, value) => {
    fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
};

const readStudents = () => readJson(DATA_FILE);
const readEvents = () => readJson(EVENTS_FILE);
const readArchivedStudents = () => readJson(ARCHIVE_FILE);

// Image upload configuration
const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
            const safeName = file.originalname.replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );

            cb(null, Date.now() + "-" + safeName);
        }
    }),

    limits: {
        fileSize: 8 * 1024 * 1024
    },

    fileFilter: (_req, file, cb) => {
        if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Upload JPG, PNG, WEBP, or GIF images only."));
        }
    }
});

// ===================================
// HOME AND HEALTH CHECK
// ===================================

app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "Saint Joseph Student Information System API is running!",
        backend: "Render",
        status: "Online"
    });
});

app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        message: "Student Information System API is running."
    });
});

// ===================================
// STUDENTS
// ===================================

app.get("/api/students", (_req, res) => {
    res.json(readStudents());
});

app.post("/api/students", (req, res) => {
    const {
        studentId,
        firstName,
        middleName = "",
        lastName,
        email,
        program,
        course,
        year
    } = req.body;

    if (
        ![studentId, firstName, lastName, email, program, course, year]
            .every(value => String(value || "").trim())
    ) {
        return res.status(400).json({
            message: "Please complete all required fields."
        });
    }

    const students = readStudents();

    if (students.some(s =>
        String(s.studentId).toLowerCase() ===
        String(studentId).trim().toLowerCase()
    )) {
        return res.status(409).json({
            message: "That Student ID is already registered."
        });
    }

    if (students.some(s =>
        String(s.email).toLowerCase() ===
        String(email).trim().toLowerCase()
    )) {
        return res.status(409).json({
            message: "That email address is already registered."
        });
    }

    const student = {
        id: Date.now().toString(),
        studentId: String(studentId).trim(),
        firstName: String(firstName).trim(),
        middleName: String(middleName).trim(),
        lastName: String(lastName).trim(),
        email: String(email).trim(),
        program,
        course,
        year,
        createdAt: new Date().toISOString()
    };

    students.unshift(student);
    saveJson(DATA_FILE, students);

    res.status(201).json(student);
});

// Update student
app.put("/api/students/:id", (req, res) => {
    const students = readStudents();

    const index = students.findIndex(
        s => s.id === req.params.id
    );

    if (index < 0) {
        return res.status(404).json({
            message: "Student not found."
        });
    }

    const {
        studentId,
        firstName,
        middleName = "",
        lastName,
        email,
        program,
        course,
        year
    } = req.body;

    if (
        ![studentId, firstName, lastName, email, program, course, year]
            .every(value => String(value || "").trim())
    ) {
        return res.status(400).json({
            message: "Please complete all required fields."
        });
    }

    const duplicate = students.some((s, i) =>
        i !== index &&
        (
            String(s.studentId).toLowerCase() ===
            String(studentId).trim().toLowerCase() ||
            String(s.email).toLowerCase() ===
            String(email).trim().toLowerCase()
        )
    );

    if (duplicate) {
        return res.status(409).json({
            message: "Another student already uses that Student ID or email."
        });
    }

    students[index] = {
        ...students[index],
        studentId: String(studentId).trim(),
        firstName: String(firstName).trim(),
        middleName: String(middleName).trim(),
        lastName: String(lastName).trim(),
        email: String(email).trim(),
        program,
        course,
        year
    };

    saveJson(DATA_FILE, students);

    res.json(students[index]);
});

// ===================================
// ARCHIVED STUDENTS
// ===================================

app.get("/api/students/archive", (_req, res) => {
    const archived = readArchivedStudents().sort(
        (a, b) =>
            new Date(b.archivedAt || 0) -
            new Date(a.archivedAt || 0)
    );

    res.json(archived);
});

// Move student to archive
app.delete("/api/students/:id", (req, res) => {
    const students = readStudents();

    const student = students.find(
        s => s.id === req.params.id
    );

    if (!student) {
        return res.status(404).json({
            message: "Student not found."
        });
    }

    const archived = readArchivedStudents();

    archived.unshift({
        ...student,
        archivedAt: new Date().toISOString()
    });

    saveJson(ARCHIVE_FILE, archived);

    saveJson(
        DATA_FILE,
        students.filter(s => s.id !== req.params.id)
    );

    res.json({
        message: "Student moved to archive successfully."
    });
});

// Restore archived student
app.post("/api/students/:id/restore", (req, res) => {
    const archived = readArchivedStudents();

    const index = archived.findIndex(
        s => s.id === req.params.id
    );

    if (index < 0) {
        return res.status(404).json({
            message: "Archived student not found."
        });
    }

    const student = archived[index];
    const students = readStudents();

    const duplicate = students.some(s =>
        String(s.studentId).toLowerCase() ===
            String(student.studentId).toLowerCase() ||
        String(s.email).toLowerCase() ===
            String(student.email).toLowerCase()
    );

    if (duplicate) {
        return res.status(409).json({
            message: "Cannot restore: another active student already uses this Student ID or email."
        });
    }

    const restored = { ...student };
    delete restored.archivedAt;

    students.unshift(restored);

    saveJson(DATA_FILE, students);

    saveJson(
        ARCHIVE_FILE,
        archived.filter(s => s.id !== req.params.id)
    );

    res.json({
        message: "Student restored successfully.",
        student: restored
    });
});

// Permanently delete archived student
app.delete("/api/students/archive/:id", (req, res) => {
    const archived = readArchivedStudents();

    const updated = archived.filter(
        s => s.id !== req.params.id
    );

    if (updated.length === archived.length) {
        return res.status(404).json({
            message: "Archived student not found."
        });
    }

    saveJson(ARCHIVE_FILE, updated);

    res.json({
        message: "Archived student permanently deleted."
    });
});

// ===================================
// CAMPUS EVENTS
// ===================================

app.get("/api/events", (_req, res) => {
    const events = readEvents().sort(
        (a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(events);
});

// Add event with image
app.post("/api/events", (req, res, next) => {
    upload.single("image")(req, res, err => {
        if (err) {
            return res.status(400).json({
                message: err.message
            });
        }

        try {
            const {
                program,
                title,
                description = "",
                eventDate = ""
            } = req.body;

            if (!program || !title || !req.file) {
                return res.status(400).json({
                    message: "Program, event title, and event image are required."
                });
            }

            const events = readEvents();

            const event = {
                id: Date.now().toString(),
                program,
                title: title.trim(),
                description: description.trim(),
                eventDate,
                image: `/uploads/${req.file.filename}`,
                createdAt: new Date().toISOString()
            };

            events.unshift(event);

            saveJson(EVENTS_FILE, events);

            res.status(201).json(event);

        } catch (error) {
            next(error);
        }
    });
});

// Delete event
app.delete("/api/events/:id", (req, res) => {
    const events = readEvents();

    const event = events.find(
        e => e.id === req.params.id
    );

    if (!event) {
        return res.status(404).json({
            message: "Event not found."
        });
    }

    saveJson(
        EVENTS_FILE,
        events.filter(e => e.id !== req.params.id)
    );

    if (event.image?.startsWith("/uploads/")) {
        const imagePath = path.join(
            UPLOAD_DIR,
            path.basename(event.image)
        );

        fs.unlink(imagePath, () => {});
    }

    res.json({
        message: "Event deleted successfully."
    });
});

// ===================================
// ERROR HANDLER
// ===================================

app.use((err, _req, res, _next) => {
    console.error("Server error:", err);

    res.status(500).json({
        message: "Server error. Please try again."
    });
});

// ===================================
// START SERVER
// ===================================

app.listen(PORT, () => {
    console.log(
        `Student Information System API running on port ${PORT}`
    );
});
