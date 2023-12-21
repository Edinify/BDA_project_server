import logger from "../config/logger.js";
import { Course } from "../models/courseModel.js";
import { Group } from "../models/groupModel.js";

// Get groups
export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find();

    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get groups for pagination
export const getGroupsForPagination = async (req, res) => {
  const { searchQuery, completed } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    let totalPages;
    let groups;
    const filterObj = {};

    if (completed === "true") {
      filterObj.completed = true;
    } else if (completed === "false") {
      filterObj.completed = false;
    } else {
      return res.status(400).json({ message: "no completed status" });
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");

      const groupsCount = await Group.countDocuments({
        name: { $regex: regexSearchQuery },
        ...filterObj,
      });

      groups = await Group.find({
        name: { $regex: regexSearchQuery },
        ...filterObj,
      })
        .skip((page - 1) * limit)
        .limit(limit);

      totalPages = Math.ceil(groupsCount / limit);
    } else {
      const groupsCount = await Group.countDocuments(filterObj);
      totalPages = Math.ceil(groupsCount / limit);
      groups = await Group.find(filterObj)
        .skip((page - 1) * limit)
        .limit(limit);
    }

    res.status(200).json({ groups, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create group
export const createGroup = async (req, res) => {
  const { name } = req.body;

  try {
    const regexName = new RegExp(name || "", "i");

    const existingGroup = await Group.findOne({
      name: { $regex: regexName },
    });

    if (name.trim && existingGroup) {
      return res.status(409).json({ key: "group-already-exists" });
    }

    const newGroup = new Group(req.body);
    await newGroup.save();

    const groupsCount = await Group.countDocuments();
    const lastPage = Math.ceil(groupsCount / 10);

    res.status(201).json({ course: newGroup, lastPage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update group
export const updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const regexName = new RegExp(name || "", "i");

    const existingGroup = await Group.findOne({
      name: { $regex: regexName },
      _id: { $ne: id },
    });

    if (name.trim() && existingCourse) {
      return res.status(409).json({ key: "course-already-exists" });
    }

    const updatedCourse = await Course.findByIdAndUpdate(id, req.body, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(updatedCourse);
  } catch (err) {
    logger.error({
      method: "PATCH",
      status: 500,
      message: err.message,
      for: "UPDATE COURSE",
      user: req.user,
      updatedData: req.body,
      courseId: id,
      functionName: updateCourse.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete course
export const deleteCourse = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCourse = await Course.findByIdAndDelete(id);

    if (!deletedCourse) {
      return res.status(404).json({ message: "course not found" });
    }

    res.status(200).json(deletedCourse);
  } catch (err) {
    logger.error({
      method: "DELETE",
      status: 500,
      message: err.message,
      for: "DELETE COURSE",
      user: req.user,
      courseId: id,
      functionName: deleteCourse.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};
