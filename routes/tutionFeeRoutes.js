import express from "express";
import {
  exportTuitionFeeExcel,
  getLatePayment,
  getPaidAmount,
  getTutionFees,
  updateTuitionFee,
} from "../controllers/tutionFeeController.js";

const router = express.Router();

router.get("/", getTutionFees);
router.get("/excel", exportTuitionFeeExcel);
router.get("/late-payment", getLatePayment);
router.get("/paid-amount", getPaidAmount);
router.patch("/payment", updateTuitionFee);

export default router;
