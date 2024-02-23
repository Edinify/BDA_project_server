import express from "express";
import { authMiddleware, checkSuperAdmin } from "../middleware/auth.js";
import {
  getActiveStudentsCount,
  getAdvertisingStatistics,
  getAllEventsCount,
  getAllGroupsCount,
  getAllStudentsCount,
  getConsultationsData,
  getCoursesStatistics,
  getLessonsCountChartData,
  getTachersResults,
  getWeeklyGroupTable,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/all-students", getAllStudentsCount);
router.get("/active-students", getActiveStudentsCount);
router.get("/all-groups", getAllGroupsCount);
router.get("/events", getAllEventsCount);
router.get("/course-statistic", getCoursesStatistics);
router.get("/consult-statistic", getConsultationsData);
router.get("/group-table", getWeeklyGroupTable);
router.get(
  "/advertising",
  authMiddleware,
  checkSuperAdmin,
  getAdvertisingStatistics
);
router.get("/leadboard", authMiddleware, checkSuperAdmin, getTachersResults);
router.get("/chart", getLessonsCountChartData);

export default router;
