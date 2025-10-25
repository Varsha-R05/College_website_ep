require('dotenv').config({ path: 'C:/Users/Revathi/OneDrive/Documents/Enterpreneurship project/emsil.env' });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json()); // Built-in body parser

// ------------------- Connect MongoDB -------------------
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/collegeDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.log("MongoDB connection error:", err));

// ------------------- Schemas -------------------
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  regNo: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Add this
  parentEmail: { type: String, required: true } // parent email
});

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // unique per day
  records: [
    {
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
      present: { type: Boolean, required: true }
    }
  ]
});

// ------------------- Teacher Schema -------------------
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const Teacher = mongoose.model("Teacher", teacherSchema);
const Student = mongoose.model("Student", studentSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);

// ------------------- Nodemailer Setup -------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASS  // Gmail app password
  }
});

// ------------------- API Routes -------------------

// Get all students
app.get("/students", async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new student
app.post("/students", async (req, res) => {
  try {
    const { name, regNo, parentEmail } = req.body;
    if (!name || !regNo || !parentEmail) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const student = new Student({ name, regNo, parentEmail });
    await student.save();
    res.json({ message: "Student added successfully", student });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: "Student with this RegNo already exists" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get("/student-attendance/:regNo", async (req, res) => {
  const { regNo } = req.params;
  const student = await Student.findOne({ regNo });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const records = await Attendance.find({ "records.studentId": student._id });
  const attendanceSummary = records.map(att => {
    const studentRecord = att.records.find(r => r.studentId.toString() === student._id.toString());
    return { date: att.date, present: studentRecord.present };
  });

  res.json({ student: { name: student.name, regNo: student.regNo }, attendance: attendanceSummary });
});

app.post("/student-login", async (req, res) => {
  const { regNo, password } = req.body;

  if (!regNo || !password)
    return res.status(400).json({ error: "RegNo and password are required" });

  try {
    const student = await Student.findOne({ regNo });
    if (!student) return res.status(404).json({ error: "Student not found" });

    if (student.password !== password)
      return res.status(401).json({ error: "Incorrect password" });

    res.json({ message: "Login successful", student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Submit or update attendance
app.post("/attendance", async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !records) return res.status(400).json({ error: "Date and records are required" });

    // Check if attendance already exists for the date
    let attendance = await Attendance.findOne({ date });

    if (attendance) {
      // Update existing attendance
      attendance.records = records;
      await attendance.save();
    } else {
      // Create new attendance
      attendance = new Attendance({ date, records });
      await attendance.save();
    }

    // Attendance is now saved ✅, even if emails fail

    // Find absent students
    const absentStudents = await Student.find({
      _id: { $in: records.filter(r => !r.present).map(r => r.studentId) }
    });

    // Send email to each absent student's parent (errors logged, not thrown)
    for (let student of absentStudents) {
      transporter.sendMail({
        from: `"College Attendance" <${process.env.EMAIL_USER}>`,
        to: student.parentEmail,
        subject: `Attendance Alert for ${student.name}`,
        text: `Dear Parent,\n\n${student.name} was absent on ${date}.\n\nRegards,\nPriyadarshini PU College`
      }).then(info => {
        console.log(`Email sent to ${student.parentEmail}: ${info.response}`);
      }).catch(error => {
        console.error(`Error sending email to ${student.parentEmail}:`, error.message);
      });
    }

    res.json({ message: "Attendance submitted successfully!", absentStudents });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------- TEACHER ROUTES -------------------

// Get all teachers
app.get("/teachers", async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new teacher
app.post("/teachers", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required" });

    const teacher = new Teacher({ name, email, password });
    await teacher.save();
    res.json({ message: "Teacher added successfully", teacher });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: "Teacher with this email already exists" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Teacher login
app.post("/teacher-login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  try {
    const teacher = await Teacher.findOne({ email });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    if (teacher.password !== password)
      return res.status(401).json({ error: "Incorrect password" });

    res.json({ message: "Login successful", teacher });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ------------------- Start Server -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
