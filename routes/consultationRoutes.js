import express from "express";

import { authMiddleware, checkAdminAndSuperAdmin } from "../middleware/auth.js";
import {
  createConsultation,
  deleteConsultation,
  getConsultationsForPagination,
  updateConsultation,
} from "../controllers/consultationController.js";

const router = express.Router();

router.get("/pagination", getConsultationsForPagination);
router.post("/", createConsultation);
router.patch("/:id", updateConsultation);
router.delete("/:id", deleteConsultation);

export default router;
