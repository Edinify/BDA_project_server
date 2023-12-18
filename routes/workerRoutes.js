import express from "express";
import {
  authMiddleware,
  checkAdminAndSuperAdmin,
  checkTeacher,
} from "../middleware/auth.js";
import {
  createWorker,
  deleteWorker,
  getWorkers,
  updateWorker,
  updateWorkerOwnPassword,
} from "../controllers/wokerController.js";

const router = express.Router();

router.post("/create", createWorker);
router.get("/", getWorkers);
router.patch("/:id", updateWorker);
router.delete("/:id", deleteWorker);
router.patch("/own/password", authMiddleware,updateWorkerOwnPassword);

export default router;
