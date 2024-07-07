import mongoose, { Mongoose } from "mongoose";
import { Consultation } from "../models/consultationModel.js";
import { Student } from "../models/studentModel.js";
import { Syllabus } from "../models/syllabusModel.js";
import { Worker } from "../models/workerModel.js";
import { Group } from "../models/groupModel.js";

// Get consultations for pagination
export const getConsultationsForPagination = async (req, res) => {
  const { searchQuery, status, length } = req.query;
  const limit = 20;

  try {
    let totalLength;
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
        .skip(length || 0)
        .limit(limit)
        .populate("course teacher");

      totalLength = consultationsCount;
    } else {
      const consultationsCount = await Consultation.countDocuments(filterObj);
      totalLength = consultationsCount;
      consultations = await Consultation.find(filterObj)
        .skip(length || 0)
        .limit(limit)
        .populate("course teacher");
    }
    res.status(200).json({ consultations, totalLength });
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

    res.status(201).json(newConsultation);
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

    if (
      updatedConsultation.status === "sold" &&
      !updatedConsultation?.studentId
    ) {
      const studentData = {
        fullName: updatedConsultation.studentName,
        courses: [updatedConsultation.course._id],
      };

      const newStudent = new Student(studentData);
      await newStudent.save();
      await Consultation.findByIdAndUpdate(updatedConsultation._id, {
        studentId: newStudent._id,
      });

      const checkTargetGroups = await Group.find({
        course: updatedConsultation.course,
        status: "waiting",
        $expr: {
          $lt: [{ $size: "$students" }, 18],
        },
      });

      if (checkTargetGroups.length > 0) {
        const targetGroup = checkTargetGroups[0];

        targetGroup.students.push(newStudent._id);

        targetGroup.save();
      } else {
        const lastGroup = await Group.findOne({
          course: updatedConsultation.course,
        }).sort({ groupNumber: -1 });

        let newGroupName = "";

        for (let i = 0; i < lastGroup.name.length; i++) {
          if (isNaN(lastGroup.name[i]) || lastGroup.name[i] === " ") {
            newGroupName += lastGroup.name[i];
          }
        }

        newGroupName += lastGroup.groupNumber + 1;

        lastGroup.name.split(`${lastGroup.groupNumber}`)[0] +
          (lastGroup.groupNumber + 1);

        const newGroup = new Group({
          name: newGroupName,
          groupNumber: lastGroup.groupNumber + 1,
          course: updatedConsultation.course._id,
          students: [newStudent._id],
        });

        newGroup.save();
      }
    }

    res.status(200).json(updatedConsultation);
  } catch (err) {
    console.log(err);
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
