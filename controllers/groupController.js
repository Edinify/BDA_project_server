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
        .limit(limit)
        .populate("teachers students course");

      totalPages = Math.ceil(groupsCount / limit);
    } else {
      const groupsCount = await Group.countDocuments(filterObj);
      totalPages = Math.ceil(groupsCount / limit);
      groups = await Group.find(filterObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("teachers students course");
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

    if (name && existingGroup) {
      return res.status(409).json({ key: "group-already-exists" });
    }

    const newGroup = new Group(req.body);
    await newGroup.save();

    const groupsCount = await Group.countDocuments();
    const lastPage = Math.ceil(groupsCount / 10);

    res.status(201).json({ group: newGroup, lastPage });
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

    if (name && existingGroup) {
      return res.status(409).json({ key: "group-already-exists" });
    }

    const updatedGroup = await Group.findByIdAndUpdate(id, req.body, {
      upsert: true,
      new: true,
      runValidators: true,
    }).populate("teacher students course");

    if (!updatedGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json(updatedGroup);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete group
export const deleteGroup = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedGroup = await Group.findByIdAndDelete(id);

    if (!deletedGroup) {
      return res.status(404).json({ message: "group not found" });
    }

    res.status(200).json(deletedGroup);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};
