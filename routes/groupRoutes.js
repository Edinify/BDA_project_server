import express from "express";

import { authMiddleware, checkAdminAndSuperAdmin } from "../middleware/auth.js";
import {
  createGroup,
  deleteGroup,
  getGroups,
  getGroupsForPagination,
  getGroupsWithCourseId,
  updateGroup,
} from "../controllers/groupController.js";
import { getCoursesForPagination } from "../controllers/courseController.js";

const router = express.Router();

router.get("/all", getGroups);
router.get("/with-course", getGroupsWithCourseId);
router.get("/pagination", getGroupsForPagination);
router.post("/", createGroup);
router.patch("/:id", updateGroup);
router.delete("/:id", deleteGroup);

export default router;
