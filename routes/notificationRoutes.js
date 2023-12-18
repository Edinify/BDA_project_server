import express from "express";
import {
  deleteNotificationForUpdateTable,
  doAsNotificationsSeen,
  getNotificationsForAdmin,
  getNotificationsForStudent,
  getNotificationsForTeacher,
} from "../controllers/notificationController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/admin", authMiddleware, getNotificationsForAdmin);
router.get("/teacher", authMiddleware, getNotificationsForTeacher);
router.get("/student", authMiddleware, getNotificationsForStudent);
router.patch("/viewed", authMiddleware, doAsNotificationsSeen);

export default router;
