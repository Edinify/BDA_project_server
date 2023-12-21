import { Consultation } from "../models/consultationModel.js";
import { Syllabus } from "../models/syllabusModel.js";

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
    } else if ("completed") {
      filterObj.status = { $ne: "appointed" };
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
        .limit(limit);

      totalPages = Math.ceil(consultationsCount / limit);
    } else {
      const consultationsCount = await Consultation.countDocuments(filterObj);
      totalPages = Math.ceil(consultationsCount / limit);
      consultations = await Consultation.find(filterObj)
        .skip((page - 1) * limit)
        .limit(limit);
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

  try {
    const updatedConsultation = await Consultation.findByIdAndUpdate(
      id,
      req.body,
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

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
