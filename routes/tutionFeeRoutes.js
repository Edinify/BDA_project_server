import express from "express";
import {
  exportTuitionFeeExcel,
  getTutionFees,
  updateTuitionFee,
} from "../controllers/tutionFeeController.js";

const router = express.Router();

router.get("/", getTutionFees);
router.get("/excel", exportTuitionFeeExcel);
router.patch("/payment", updateTuitionFee);

export default router;
