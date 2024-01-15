import express from "express";
import {
  cancelCourseChanges,
  confirmCourseChanges,
  createCourse,
  deleteCourse,
  getCourses,
  getCoursesForPagination,
  updateCourse,
} from "../controllers/courseController.js";
import { authMiddleware, checkAdminAndSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/all", getCourses);
router.get("/pagination", getCoursesForPagination);
router.post("/", createCourse);
router.patch("/:id", authMiddleware, updateCourse);
router.patch("/changes/confirm/:id", authMiddleware, confirmCourseChanges);
router.patch("/changes/cancel/:id", authMiddleware, cancelCourseChanges);
router.delete("/:id", deleteCourse);

export default router;
