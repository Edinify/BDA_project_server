import express from "express";
import {
  getTutionFees,
  updateTuitionFee,
} from "../controllers/tutionFeeController.js";

const router = express.Router();

router.get("/", getTutionFees);
router.patch("/payment", updateTuitionFee);

export default router;
