import express from "express";
import {
  deleteStudent,
  getStudents,
  updateStudent,
  updateStudentPassword,
  getStudentsByCourseId,
  getStudentsForPagination,
  getActiveStudents,
} from "../controllers/studentController.js";
import { authMiddleware, checkAdminAndSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, getStudents);
router.get(
  "/pagination",
  authMiddleware,
  checkAdminAndSuperAdmin,
  getStudentsForPagination
);
router.get(
  "/by/course",
  authMiddleware,
  checkAdminAndSuperAdmin,
  getStudentsByCourseId
);
router.get("/active", authMiddleware, getActiveStudents);
router.patch("/:id", authMiddleware, checkAdminAndSuperAdmin, updateStudent);
router.delete("/:id", authMiddleware, checkAdminAndSuperAdmin, deleteStudent);
router.patch("/me/password", authMiddleware, updateStudentPassword);

export default router;
