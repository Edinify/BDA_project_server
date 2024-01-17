import express from "express";
import { getCareers, updateCareer } from "../controllers/careerController.js";

const router = express.Router();

router.get("/", getCareers);
router.patch("/", updateCareer);

export default router;
