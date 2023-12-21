import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";

import studentRoutes from "./routes/studentRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import lessonRoutes from "./routes/lessonRotes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import salaryRoutes from "./routes/salaryRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import demoSmtpRoutes from "./routes/demoSmtpRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import incomeRoutes from "./routes/incomeRoutes.js";
import bonusRoutes from "./routes/bonusRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import fineRoutes from "./routes/fineRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import syllabusRoutes from "./routes/syllabusRoutes.js";
import consultationRoutes from "./routes/consultationRoutes.js";
// import updateButtonRoutes from "./routes/updateButtonRoutes.js";

import {
  createNotificationForBirthdayWithCron,
  deleteNotificationsForBirthday,
} from "./controllers/notificationController.js";
import { calcDate } from "./calculate/calculateDate.js";
import { getUnviewedLessons } from "./controllers/dashboardController.js";

import cron from "node-cron";
import logger from "./config/logger.js";
import { Lesson } from "./models/lessonModel.js";
import router from "./routes/syllabusRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT;
const uri = process.env.DB_URI;

app.use(
  cors({
    origin: process.env.URL_PORT,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["Content-Type"],
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "15mb" }));
app.use("/api/user/auth", authRoutes);
app.use("/api/user/teacher", teacherRoutes);
app.use("/api/user/admin", adminRoutes);
app.use("/api/user/worker", workerRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/syllabus", syllabusRoutes);
app.use("/api/consultation", consultationRoutes);
app.use("/api/lesson", lessonRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/bonus", bonusRoutes);
app.use("/api/fine", fineRoutes);
app.use("/api/user/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/demo", demoSmtpRoutes);
app.use("/api/expense", expenseRoutes);
app.use("/api/income", incomeRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/feedback", feedbackRoutes);

app.get("/", (req, res) => {
  res.send("hello");
});

// wbm.start().then(async () => {
//   const phones = ['123456'];
//   const message = 'Good Morning.';
//   await wbm.send(phones, message);
//   await wbm.end();
// }).catch(err => console.log(err));

mongoose
  .connect(uri)
  .then(() => {
    console.log("connected database");
    app.listen(port, async () => {
      console.log(`listen server at ${port}`);
      // cron.schedule("* * * * *", () => {
      //   console.log('salam')
      //   createNotificationForBirthdayWithCron();
      // deleteNotificationsForBirthday()
      // });
    });
  })
  .catch((err) => console.log(err));
