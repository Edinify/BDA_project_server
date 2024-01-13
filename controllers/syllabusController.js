import logger from "../config/logger.js";
import { Course } from "../models/courseModel.js";
import { Syllabus } from "../models/syllabusModel.js";

// Get syllabus
export const getSyllabus = async (req, res) => {
  const { courseId } = req.query;
  try {
    const syllabus = await Syllabus.find({ courseId });

    res.status(200).json(syllabus);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get syllabus for pagination
export const getSyllabusForPagination = async (req, res) => {
  const { searchQuery, courseId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    let totalPages;
    let syllabus;

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");

      const syllabusCount = await Syllabus.countDocuments({
        name: { $regex: regexSearchQuery },
        courseId,
      });

      syllabus = await Syllabus.find({
        name: { $regex: regexSearchQuery },
        courseId,
      })
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ orderNumber: 1 });

      totalPages = Math.ceil(syllabusCount / limit);
    } else {
      const syllabusCount = await Syllabus.countDocuments({ courseId });
      totalPages = Math.ceil(syllabusCount / limit);
      syllabus = await Syllabus.find({ courseId })
        .skip((page - 1) * limit)
        .sort({ orderNumber: 1 })
        .limit(limit);
    }

    res.status(200).json({ syllabus, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create syllabus
export const createSyllabus = async (req, res) => {
  const { orderNumber, courseId } = req.body;

  try {
    const existingSyllabus = await Syllabus.findOne({
      orderNumber,
      courseId,
    });

    console.log(existingSyllabus, "existingSyllabus");

    if (existingSyllabus) {
      return res.status(409).json({ key: "syllabus-already-exists" });
    }

    const newSyllabus = new Syllabus(req.body);
    await newSyllabus.save();

    const syllabusCount = await Syllabus.countDocuments({ courseId });
    const lastPage = Math.ceil(syllabusCount / 10);

    res.status(201).json({ syllabus: newSyllabus, lastPage });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Update syllabus
export const updateSyllabus = async (req, res) => {
  const { id } = req.params;
  const { id: userId } = req.user;
  const { orderNumber, courseId } = req.body;
  const updatedData = req.body;

  try {
    const existingSyllabus = await Syllabus.findOne({
      orderNumber,
      courseId,
      _id: { $ne: id },
    });

    if (existingSyllabus) {
      return res.status(409).json({ key: "syllabus-already-exists" });
    }

    if (role === "worker") {
      const worker = await Worker.findById(userId);
      const power = worker.profiles.find(
        (item) => item.profile === "teachers"
      )?.power;

      if (power === "update") {
        const teacher = await Teacher.findById(id);
        updatedData.history = teacher.toObject();
      }
    }

    const updatedSyllabus = await Syllabus.findByIdAndUpdate(id, updatedData, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    if (!updatedSyllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    res.status(200).json(updatedSyllabus);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete syllabus
export const deleteSyllabus = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedSyllabus = await Syllabus.findByIdAndDelete(id);

    if (!deletedSyllabus) {
      return res.status(404).json({ message: "syllabus not found" });
    }

    res.status(200).json(deletedSyllabus);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};
