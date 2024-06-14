import express from "express";
import {
  exportTuitionFeeExcel,
  getLatePayment,
  getTutionFees,
  updateTuitionFee,
} from "../controllers/tutionFeeController.js";

const router = express.Router();

router.get("/", getTutionFees);
router.get("/excel", exportTuitionFeeExcel);
router.get("/late-payment", getLatePayment);
router.patch("/payment", updateTuitionFee);

export default router;
