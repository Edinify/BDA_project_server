import express from "express";
import {
  authMiddleware,
  checkAdminAndSuperAdmin,
  checkTeacher,
} from "../middleware/auth.js";
import {
  createTeacher,
  deleteTeacher,
  getActiveTeachers,
  getAllTeachers,
  getTeacherCancelledLessonsCount,
  getTeacherChartData,
  getTeacherConfirmedLessonsCount,
  getTeacherLeadboardOrder,
  getTeacherUnviewedLessons,
  getTeachersForPagination,
  updateTeacher,
  updateTeacherPassword,
} from "../controllers/teacherController.js";

const router = express.Router();

router.post("/", createTeacher);
router.get("/all", authMiddleware, checkAdminAndSuperAdmin, getAllTeachers);
router.get("/active", getActiveTeachers);
router.get("/pagination", getTeachersForPagination);
router.patch("/:id", updateTeacher);
router.delete("/:id", deleteTeacher);
router.patch("/own/password", updateTeacherPassword);
router.get("/me/chart", authMiddleware, checkTeacher, getTeacherChartData);
router.get(
  "/me/confirmed-lessons",
  authMiddleware,
  checkTeacher,
  getTeacherConfirmedLessonsCount
);
router.get(
  "/me/cancelled-lessons",
  authMiddleware,
  checkTeacher,
  getTeacherCancelledLessonsCount
);
router.get(
  "/me/unviewed-lessons",
  authMiddleware,
  checkTeacher,
  getTeacherUnviewedLessons
);
router.get(
  "/me/leaderboard-order",
  authMiddleware,
  checkTeacher,
  getTeacherLeadboardOrder
);

export default router;
