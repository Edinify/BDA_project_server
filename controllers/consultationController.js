import mongoose from "mongoose";
import { Consultation } from "../models/consultationModel.js";
import { Student } from "../models/studentModel.js";
import { Syllabus } from "../models/syllabusModel.js";
import { Worker } from "../models/workerModel.js";
import { Group } from "../models/groupModel.js";
import { calcDate } from "../calculate/calculateDate.js";

// Get consultations for pagination
export const getConsultationsForPagination = async (req, res) => {
  const {
    searchQuery,
    status,
    length,
    startDate,
    endDate,
    whereComing,
    courseId,
  } = req.query;
  const limit = 20;

  try {
    let totalLength;
    let consultations;
    let filterObj = {};

    if (status) {
      filterObj.status = status;
    }

    if (startDate && endDate) {
      const targetDate = calcDate(null, startDate, endDate);
      console.log(targetDate, 'target date in consultation')
      filterObj.contactDate = {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      };
    }

    if (courseId) {
      filterObj.course = courseId;
    }

    if (whereComing) {
      filterObj.whereComing = whereComing;
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");
      filterObj.studentName = { $regex: regexSearchQuery };
    }

    const consultationsCount = await Consultation.countDocuments(filterObj);
    totalLength = consultationsCount;
    consultations = await Consultation.find(filterObj)
      .skip(length || 0)
      .limit(limit)
      .populate("course teacher group")
      .sort({ contactDate: -1 });

    res.status(200).json({ consultations, totalLength });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create consultations
export const createConsultation = async (req, res) => {
  const newData = req.body;
  delete newData.group;
  try {
    const newConsultation = new Consultation(newData);
    newConsultation.populate("course teacher");
    await newConsultation.save();

    res.status(201).json(newConsultation);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Update consultation
export const updateConsultation = async (req, res) => {
  // const session = await mongoose.startSession();
  // session.startTransaction();

  const { id } = req.params;
  const { id: userId, role } = req.user;
  let updatedData = req.body;

  try {
    if (role === "worker") {
      const worker = await Worker.findById(userId);
      // .session(session);

      const power = worker.profiles.find(
        (item) => item.profile === "consultation"
      )?.power;

      if (power === "update") {
        delete updatedData.changes;

        const payload = new Consultation(updatedData);
        await payload.populate("course teacher");
        // .session(session);

        updatedData = { changes: payload.toObject() };
      }
    }

    if (!updatedData?.group || updatedData?.group === "newGroup")
      delete updatedData.group;

    let updatedConsultation = await Consultation.findByIdAndUpdate(
      id,
      updatedData,
      {
        new: true,
        runValidators: true,
        // session: session,
      }
    ).populate("course teacher group");

    if (!updatedConsultation) {
      // await session.abortTransaction();
      // session.endSession();
      return res.status(404).json({ message: "Consultation not found" });
    }

    const existingStudent = await Student.findOne({
      fin: updatedConsultation.fin,
    });
    // .session(session);

    if (updatedConsultation.status === "sold" && !existingStudent) {
      const studentData = {
        fullName: updatedConsultation.studentName,
        courses: [updatedConsultation.course._id],
        fin: updatedConsultation.fin,
      };

      const newStudent = new Student(studentData);
      await newStudent.save(); //{ session: session }

      await Consultation.findByIdAndUpdate(
        updatedConsultation._id,
        {
          studentId: newStudent._id,
        }
        // { session: session }
      );

      let targetGroup;

      if (updatedData?.group) {
        targetGroup = await Group.findOne({
          _id: updatedData.group._id,
          course: updatedConsultation.course,
          status: "waiting",
          $expr: {
            $lt: [{ $size: "$students" }, 18],
          },
        });
        // .session(session);
      }

      if (targetGroup) {
        targetGroup.students.push(newStudent._id);

        await targetGroup.save(); //{ session: session }
        await Student.findByIdAndUpdate(
          newStudent._id,
          {
            $push: {
              groups: {
                group: targetGroup._id,
              },
            },
          }
          // { session: session }
        );
      } else {
        const lastGroup = await Group.findOne({
          course: updatedConsultation.course,
        }).sort({ groupNumber: -1 });
        // .session(session);

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

        await newGroup.save(); //{ session: session }

        await Student.findByIdAndUpdate(
          newStudent._id,
          {
            $push: {
              groups: {
                group: newGroup._id,
              },
            },
          }
          // { session: session }
        );

        updatedConsultation = await Consultation.findByIdAndUpdate(
          id,
          { group: newGroup._id },
          {
            new: true,
            runValidators: true,
            // session: session,
          }
        ).populate("course teacher group");
      }
    }

    // await session.commitTransaction();
    // session.endSession();

    res.status(200).json(updatedConsultation);
  } catch (err) {
    console.log(err, "main error", err.message);
    // await session.abortTransaction();
    // session.endSession();
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
