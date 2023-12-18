import express from "express";
import {
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
router.patch("/:id",  updateCourse);
router.delete("/:id", deleteCourse);

export default router;
