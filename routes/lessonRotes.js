import express from "express";
import {
  createCurrentLessonsFromMainLessons,
  createLesson,
  deleteLessonInTablePanel,
  getWeeklyLessonsForCurrentTable,
  getWeeklyLessonsForMainPanel,
  getWeeklyLessonsForMainTable,
  updateLessonInMainPanel,
  updateLessonInTable,
} from "../controllers/lessonController.js";
import { authMiddleware, checkAdminAndSuperAdmin } from "../middleware/auth.js";
import { getUpdateButtonStatus } from "../controllers/updateButtonController.js";

const router = express.Router();

router.get("/main", authMiddleware, getWeeklyLessonsForMainTable);
router.get("/current", authMiddleware, getWeeklyLessonsForCurrentTable);
router.get("/update-button", authMiddleware, getUpdateButtonStatus);
router.get("/main/panel", authMiddleware, getWeeklyLessonsForMainPanel);
router.post("/", authMiddleware, checkAdminAndSuperAdmin, createLesson);
router.post(
  "/current/all",
  authMiddleware,
  createCurrentLessonsFromMainLessons
);
router.patch("/main/panel/:id", authMiddleware, updateLessonInMainPanel);

router.patch(
  "/table/:id",
  authMiddleware,
  checkAdminAndSuperAdmin,
  updateLessonInTable
);
router.delete(
  "/table/panel/:id",
  authMiddleware,
  checkAdminAndSuperAdmin,
  deleteLessonInTablePanel
);

// router.delete("/delete-current",deleteCurrentLesson);

export default router;
