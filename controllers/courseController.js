import logger from "../config/logger.js";
import { Course } from "../models/courseModel.js";
import { Worker } from "../models/workerModel.js";

// Get courses
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find();

    res.status(200).json(courses);
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      for: "GET COURSES",
      user: req.user,
      functionName: getCourses.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get courses for pagination
export const getCoursesForPagination = async (req, res) => {
  const { searchQuery } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    let totalPages;
    let courses;

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");

      const coursesCount = await Course.countDocuments({
        name: { $regex: regexSearchQuery },
      });

      courses = await Course.find({
        name: { $regex: regexSearchQuery },
      })
        .skip((page - 1) * limit)
        .limit(limit);

      totalPages = Math.ceil(coursesCount / limit);
    } else {
      const coursesCount = await Course.countDocuments();
      totalPages = Math.ceil(coursesCount / limit);
      courses = await Course.find()
        .skip((page - 1) * limit)
        .limit(limit);
    }

    res.status(200).json({ courses, totalPages });
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      for: "GET COURSES FOR PAGINATION",
      user: req.user,
      functionName: getCoursesForPagination.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create course
export const createCourse = async (req, res) => {
  const { name } = req.body;

  try {
    const regexName = new RegExp(name || "", "i");

    const existingCourse = await Course.findOne({
      name: { $regex: regexName },
    });

    if (existingCourse) {
      return res.status(409).json({ key: "course-already-exists" });
    }

    const newCourse = new Course(req.body);
    await newCourse.save();

    const coursesCount = await Course.countDocuments();
    const lastPage = Math.ceil(coursesCount / 10);

    res.status(201).json({ course: newCourse, lastPage });
  } catch (err) {
    logger.error({
      method: "CREATE",
      status: 500,
      message: err.message,
      for: "CREATE COURSE",
      user: req.user,
      postedData: req.body,
      functionName: createCourse.name,
    });
    res.status(500).json({ error: err.message });
  }
};

// Update course
export const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const { id: userId, role } = req.user;
  let updatedData = req.body;

  try {
    const regexName = new RegExp(name || "", "i");

    const existingCourse = await Course.findOne({
      name: { $regex: regexName },
      _id: { $ne: id },
    });

    if (existingCourse) {
      return res.status(409).json({ key: "course-already-exists" });
    }

    if (role === "worker") {
      const worker = await Worker.findById(userId);

      const power = worker.profiles.find(
        (item) => item.profile === "courses"
      )?.power;

      if (power === "update") {
        delete updatedData.changes;

        updatedData = { changes: updatedData };
      }
    }

    const updatedCourse = await Course.findByIdAndUpdate(id, updatedData, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(updatedCourse);
  } catch (err) {
    console.log(err);
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

// Confirm course changes
export const confirmCourseChanges = async (req, res) => {
  const { id } = req.params;
  const { changes } = req.body;

  try {
    const course = await Course.findByIdAndUpdate(
      id,
      { ...changes, changes: {} },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(course);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Cancel course changes
export const cancelCourseChanges = async (req, res) => {
  const { id } = req.params;

  try {
    const course = await Course.findByIdAndUpdate(
      id,
      { changes: {} },
      { new: true }
    );

    res.status(200).json(course);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
