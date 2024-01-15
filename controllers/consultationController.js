import { Consultation } from "../models/consultationModel.js";
import { Syllabus } from "../models/syllabusModel.js";
import { Worker } from "../models/workerModel.js";

// Get consultations for pagination
export const getConsultationsForPagination = async (req, res) => {
  const { searchQuery, status } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    let totalPages;
    let consultations;
    let filterObj = {};

    if (status === "appointed") {
      filterObj.status = "appointed";
    } else if (status === "completed") {
      filterObj.status = { $ne: "appointed" };
    } else {
      return res.status(400).json({ message: "no status query" });
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");

      const consultationsCount = await Consultation.countDocuments({
        ...filterObj,
        studentName: { $regex: regexSearchQuery },
      });

      consultations = await Consultation.find({
        ...filterObj,
        studentName: { $regex: regexSearchQuery },
      })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("course teacher");

      totalPages = Math.ceil(consultationsCount / limit);
    } else {
      const consultationsCount = await Consultation.countDocuments(filterObj);
      totalPages = Math.ceil(consultationsCount / limit);
      consultations = await Consultation.find(filterObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("course teacher");
    }

    res.status(200).json({ consultations, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create consultations
export const createConsultation = async (req, res) => {
  try {
    const newConsultation = new Consultation(req.body);
    newConsultation.populate("course teacher");
    await newConsultation.save();

    const consultationCount = await Consultation.countDocuments();
    const lastPage = Math.ceil(consultationCount / 10);

    res.status(201).json({ consultation: newConsultation, lastPage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update consultation
export const updateConsultation = async (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;
  let updatedData = req.body;

  try {
    if (role === "worker") {
      const worker = await Worker.findById(userId);

      const power = worker.profiles.find(
        (item) => item.profile === "consultation"
      )?.power;

      if (power === "update") {
        delete updatedData.changes;

        const payload = new Consultation(updatedData);
        await payload.populate("course teacher");

        updatedData = { changes: payload.toObject() };
      }
    }

    const updatedConsultation = await Consultation.findByIdAndUpdate(
      id,
      updatedData,
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    ).populate("course teacher");

    if (!updatedConsultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    res.status(200).json(updatedConsultation);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete consultation
export const deleteConsultation = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedConsultation = await Consultation.findByIdAndDelete(id);

    if (!deletedConsultation) {
      return res.status(404).json({ message: "consultation not found" });
    }

    res.status(200).json(deletedConsultation);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Confirm consultation changes
export const confirmConsultationChanges = async (req, res) => {
  const { id } = req.params;
  const { changes } = req.body;

  try {
    const consultation = await Consultation.findByIdAndUpdate(
      id,
      { ...changes, changes: {} },
      { new: true }
    ).populate("course teacher");

    if (!consultation) {
      return res.status(404).json({ message: "Counsultation not found" });
    }

    res.status(200).json(consultation);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Cancel consultation changes
export const cancelConsultationChanges = async (req, res) => {
  const { id } = req.params;

  try {
    const consultation = await Consultation.findByIdAndUpdate(
      id,
      { changes: {} },
      { new: true }
    ).populate("course teacher");

    res.status(200).json(consultation);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
