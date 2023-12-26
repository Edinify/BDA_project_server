import express from "express";
import { getCareers } from "../controllers/careerController.js";

const router = express.Router();

router.get("/", getCareers);

export default router;
