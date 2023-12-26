import express from "express";
import { getTutionFees } from "../controllers/tutionFeeController.js";

const router = express.Router();

router.get("/", getTutionFees);

export default router;
