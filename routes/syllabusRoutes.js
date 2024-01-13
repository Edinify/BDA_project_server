import express from "express";

import { authMiddleware, checkAdminAndSuperAdmin } from "../middleware/auth.js";
import {
  createSyllabus,
  deleteSyllabus,
  getSyllabus,
  getSyllabusForPagination,
  updateSyllabus,
} from "../controllers/syllabusController.js";

const router = express.Router();

router.get("/all", getSyllabus);
router.get("/pagination", getSyllabusForPagination);
router.post("/", createSyllabus);
router.patch("/:id", authMiddleware, updateSyllabus);
router.delete("/:id", deleteSyllabus);

export default router;
