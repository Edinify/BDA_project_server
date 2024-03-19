import fs from "fs/promises";
import Docxtemplater from "docxtemplater";
import path from "path";
import PizZip from "pizzip";
import { Lesson } from "../models/lessonModel.js";
import { Student } from "../models/studentModel.js";
import logger from "../config/logger.js";
import { Group } from "../models/groupModel.js";
import { Course } from "../models/courseModel.js";
import { Worker } from "../models/workerModel.js";
import { Teacher } from "../models/teacherModel.js";
import mongoose from "mongoose";
import moment from "moment";

// Create student
export const createStudent = async (req, res) => {
  try {
    const newStudent = new Student(req.body);

    await newStudent.save();

    const groupsIds = newStudent.groups.map((item) => item?.group);

    await Group.updateMany(
      { _id: { $in: groupsIds } },
      { $addToSet: { students: newStudent._id } }
    );

    await Lesson.updateMany(
      {
        group: { $in: groupsIds },
      },
      { $push: { students: { student: newStudent._id } } }
    );

    const student = await Student.findById(newStudent._id).populate({
      path: "groups.group",
      populate: {
        path: "course",
        model: "Course",
      },
    });

    res.status(201).json(student);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get students
export const getStudents = async (req, res) => {
  const { studentsCount, searchQuery } = req.query;

  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");

    const students = await Student.find({
      fullName: { $regex: regexSearchQuery },
    })
      .skip(parseInt(studentsCount || 0))
      .limit(parseInt(studentsCount || 0) + 30);

    const totalLength = await Student.countDocuments({
      fullName: { $regex: regexSearchQuery },
    });

    res.status(200).json({ students, totalLength });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get active students
export const getActiveStudents = async (req, res) => {
  const { studentsCount, searchQuery, courseId } = req.query;
  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");

    const students = await Student.find({
      fullName: { $regex: regexSearchQuery },
      deleted: false,
      courses: { $in: courseId },
    })
      .skip(parseInt(studentsCount || 0))
      .limit(parseInt(studentsCount || 0) + 30);

    const totalLength = await Student.countDocuments({
      fullName: { $regex: regexSearchQuery },
      deleted: false,
      courses: { $in: courseId },
    });

    res.status(200).json({ students, totalLength });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get students for pagination
export const getStudentsForPagination = async (req, res) => {
  const { searchQuery, status, courseId, groupId, length } = req.query;
  const limit = 10;

  try {
    let totalLength;
    let students;
    let filterObj = {};

    if (status === "active") filterObj.status = true;

    if (status === "deactive") filterObj.status = false;

    if (courseId) filterObj.courses = courseId;

    if (groupId) filterObj["groups.group"] = groupId;

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");

      const studentsCount = await Student.countDocuments({
        fullName: { $regex: regexSearchQuery },
        deleted: false,
        ...filterObj,
      });

      students = await Student.find({
        fullName: { $regex: regexSearchQuery },
        deleted: false,
        ...filterObj,
      })
        .skip(length || 0)
        .limit(limit)
        .populate("courses")
        .populate({
          path: "groups.group",
          populate: {
            path: "course",
            model: "Course",
          },
        })
        .sort({ createdAt: -1 });

      totalLength = studentsCount;
    } else {
      const studentsCount = await Student.countDocuments({
        deleted: false,
        ...filterObj,
      });
      totalLength = studentsCount;
      students = await Student.find({ deleted: false, ...filterObj })
        .skip(length || 0)
        .limit(limit)
        .populate("courses")
        .populate({
          path: "groups.group",
          populate: {
            path: "course",
            model: "Course",
          },
        })
        .sort({ createdAt: -1 });
    }

    students = await Promise.all(
      students.map(async (student) => {
        const targetLessons = Lesson.aggregate([
          { $unwind: "$students" },
          {
            $match: {
              "students.student": new mongoose.Types.ObjectId(student._id),
            },
          },
          { $match: { "students.attendance": -1, status: "confirmed" } },
          { $group: { _id: null, count: { $sum: 1 } } },
        ]);

        const result = await targetLessons.exec();

        return { ...student.toObject(), qbCount: result[0]?.count || 0 };
      })
    );

    res.status(200).json({ students, totalLength });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get students by course id

export const getStudentsByCourseId = async (req, res) => {
  const { courseId, day, time, role, date, studentsCount, searchQuery } =
    req.query;
  const targetDate = new Date(date);
  const targetMonth = targetDate.getMonth() + 1;
  const targetYear = targetDate.getFullYear();
  const targetDayOfMonth = targetDate.getDate();

  console.log(req.query);

  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");

    const students = await Student.find({
      fullName: { $regex: regexSearchQuery },
      "courses.course": courseId,
      status: true,
      deleted: false,
    })
      .skip(parseInt(studentsCount || 0))
      .limit(parseInt(studentsCount || 0) + 30)
      .select("-password");

    const totalLength = await Student.countDocuments({
      fullName: { $regex: regexSearchQuery },
      "courses.course": courseId,
      status: true,
      deleted: false,
    });

    let checkStudent;

    const newStudents = await Promise.all(
      students.map(async (student) => {
        if (role === "main") {
          checkStudent = await Lesson.find({
            "students.student": student._id,
            day: day,
            time: time,
            role: role,
          });
        } else if (role === "current") {
          checkStudent = await Lesson.find({
            "students.student": student._id,
            day: Number(day),
            time: time,
            role: role,
            status: {
              $in: ["unviewed", "confirmed"],
            },
            $expr: {
              $and: [
                { $eq: [{ $year: "$date" }, targetYear] },
                { $eq: [{ $month: "$date" }, targetMonth] },
                { $eq: [{ $dayOfMonth: "$date" }, targetDayOfMonth] },
              ],
            },
          });
        }

        if (checkStudent.length > 0) {
          return { ...student.toObject(), disable: true };
        } else {
          return { ...student.toObject(), disable: false };
        }
      })
    );

    res.status(200).json({ students: newStudents, totalLength });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Update student
export const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;
  let updatedData = req.body;

  try {
    if (role === "worker") {
      const worker = await Worker.findById(userId);

      const power = worker.profiles.find(
        (item) => item.profile === "students"
      )?.power;

      if (power === "update") {
        delete updatedData.changes;

        const payload = new Student(updatedData);
        await payload.populate("courses groups.group");

        console.log(payload, "ttttt");

        updatedData = { changes: payload.toObject() };

        const updatedStudent = await Student.findByIdAndUpdate(
          id,
          updatedData,
          {
            new: true,
          }
        )
          .populate("courses")
          .populate({
            path: "groups.group",
            populate: {
              path: "course",
              model: "Course",
            },
          });

        return res.status(200).json(updatedStudent);
      }
    }

    const updatedStudent = await Student.findByIdAndUpdate(id, req.body, {
      new: true,
    })
      .populate("courses")
      .populate({
        path: "groups.group",
        populate: {
          path: "course",
          model: "Course",
        },
      });

    if (!updatedStudent) {
      return res.status(404).json({ key: "student-not-found" });
    }

    const groupsIds = updatedStudent.groups.map((item) => item?.group._id);

    await Group.updateMany(
      {
        _id: { $in: groupsIds },
      },
      { $addToSet: { students: updatedStudent._id } }
    );

    await Group.updateMany(
      {
        _id: { $nin: groupsIds },
        students: { $in: updatedStudent._id },
      },
      { $pull: { students: updatedStudent._id } }
    );

    await Lesson.updateMany(
      {
        group: { $in: groupsIds },
        "students.student": { $ne: updatedStudent._id },
      },
      { $push: { students: { student: updatedStudent._id } } }
    );

    await Lesson.updateMany(
      {
        group: { $nin: groupsIds },
        "students.student": { $in: updatedStudent._id },
      },
      { $pull: { students: { student: updatedStudent._id } } }
    );

    res.status(200).json(updatedStudent);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete student
export const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedStudent = await Student.findByIdAndUpdate(
      id,
      {
        deleted: true,
      },
      { new: true }
    );

    if (!deletedStudent) {
      return res.status(404).json({ key: "student-not-found" });
    }

    res.status(200).json(deletedStudent);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Confirm student changes
export const confirmStudentChanges = async (req, res) => {
  const { id } = req.params;
  const { changes } = req.body;

  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { ...changes, changes: {} },
      {
        new: true,
      }
    )
      .populate("courses")
      .populate({
        path: "groups.group",
        populate: {
          path: "course",
          model: "Course",
        },
      });

    if (!updatedStudent) {
      return res.status(404).json({ key: "student-not-found" });
    }

    const groupsIds = updatedStudent.groups.map((item) => item?.group._id);

    await Group.updateMany(
      {
        _id: { $in: groupsIds },
      },
      { $addToSet: { students: updatedStudent._id } }
    );

    await Group.updateMany(
      {
        _id: { $nin: groupsIds },
        students: { $in: updatedStudent._id },
      },
      { $pull: { students: updatedStudent._id } }
    );

    await Lesson.updateMany(
      {
        group: { $in: groupsIds },
        "students.student": { $ne: updatedStudent._id },
      },
      { $push: { students: { student: updatedStudent._id } } }
    );

    await Lesson.updateMany(
      {
        group: { $nin: groupsIds },
        "students.student": { $in: updatedStudent._id },
      },
      { $pull: { students: { student: updatedStudent._id } } }
    );

    res.status(200).json(updatedStudent);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Cancel teacher changes
export const cancelStudentChanges = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.findByIdAndUpdate(
      id,
      { changes: {} },
      { new: true }
    )
      .populate("courses")
      .populate({
        path: "groups.group",
        populate: {
          path: "course",
          model: "Course",
        },
      });

    res.status(200).json(student);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Export word file

export const exportStudentContract = async (req, res) => {
  const { studentId, groupId } = req.query;

  console.log("contract");
  try {
    const student = await Student.findById(studentId).populate({
      path: "groups.group",
      populate: {
        path: "course",
        model: "Course",
      },
    });
    const group = student.groups.find(
      (item) => item.group._id.toString() === groupId
    );

    const data = {
      studentName: student?.fullName || "--",
      contractDate: group?.contractStartDate
        ? moment(group.contractStartDate).locale("az").format("DD.MM.YYYY")
        : "--",
      contractDateSecond: group?.contractStartDate
        ? moment(group.contractStartDate)
            .locale("az")
            .format(`"DD" MMMM YYYY[-ci il]`)
        : "--",
      fin: student?.fin || "--",
      seria: student?.seria || "--",
      course: group?.group?.course?.name || "--",
      totalAmount: group?.totalAmount || "--",
      monthlyPayment: group?.payments[0]?.payment || "--",
      paymentType: group?.payment?.paymentType || "--",
      discount: group?.discount || "--",
      phoneNumber: student?.phone || "--",
    };

    console.log(data);

    const content = await fs.readFile(
      path.resolve(process.cwd(), "templates", "student.docx"),
      "binary"
    );

    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(data);

    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    // Write the output document to a file
    await fs.writeFile(
      path.resolve(process.cwd(), "exports", "exported_document.docx"),
      buffer
    );

    res.download(
      path.resolve(process.cwd(), "exports", "exported_document.docx"),
      "exported_document.docx"
    );
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
