import express from "express";
import {
  authMiddleware,
  checkAdminAndSuperAdmin,
  checkTeacher,
} from "../middleware/auth.js";
import {
  getSalariesForAdmins,
  getSalariesForTeacher,
} from "../controllers/salaryController.js";

const Router = express.Router();

Router.get("/", authMiddleware, checkAdminAndSuperAdmin, getSalariesForAdmins);
Router.get("/me", authMiddleware, checkTeacher, getSalariesForTeacher);

export default Router;
