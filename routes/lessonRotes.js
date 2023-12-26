import express from "express";
import {
  createLesson,
  deleteLesson,
  getLessons,
  updateLesson,
} from "../controllers/lessonController.js";
import { authMiddleware, checkAdminAndSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/", createLesson);
router.get("/", getLessons);
router.patch("/:id", updateLesson);
router.delete("/:id", deleteLesson);

// router.delete("/delete-current",deleteCurrentLesson);

export default router;
