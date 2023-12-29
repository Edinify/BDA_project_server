import express from "express";
import {
  deleteStudent,
  getStudents,
  updateStudent,
  getStudentsByCourseId,
  getStudentsForPagination,
  getActiveStudents,
  createStudent,
} from "../controllers/studentController.js";
import { authMiddleware, checkAdminAndSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/", createStudent);
router.get("/", authMiddleware, getStudents);
router.get("/pagination", getStudentsForPagination);
router.get(
  "/by/course",
  authMiddleware,
  checkAdminAndSuperAdmin,
  getStudentsByCourseId
);
router.get("/active", getActiveStudents);
router.patch("/:id", updateStudent);
router.delete("/:id", deleteStudent);

export default router;
