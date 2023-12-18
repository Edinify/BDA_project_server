import { Lesson } from "../models/lessonModel.js";
import { Student } from "../models/studentModel.js";
import bcrypt from "bcrypt";
import {
  createNotificationForBirthdayAtCreateAndUpdateStudent,
  createNotificationForLessonsCount,
  createNotificationForOneStudentLessonsCount,
  deleteNotificationForLessonCount,
  deleteNotificationForOneStudentLessonCount,
} from "./notificationController.js";
import { Admin } from "../models/adminModel.js";
import { Teacher } from "../models/teacherModel.js";
import logger from "../config/logger.js";

// Get students

export const getStudents = async (req, res) => {
  const { studentsCount, searchQuery } = req.query;

  console.log(req.query);
  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");

    const students = await Student.find({
      fullName: { $regex: regexSearchQuery },
    })
      .skip(parseInt(studentsCount || 0))
      .limit(parseInt(studentsCount || 0) + 30)
      .select("-password")
      .populate("courses.course");

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
  const { studentsCount, searchQuery } = req.query;
  const { id, role } = req.user;
  try {
    if (role !== "teacher") return res.status(200).json([]);

    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");

    const teacher = await Teacher.findById(id).select("courses");

    const students = await Student.find({
      fullName: { $regex: regexSearchQuery },
      deleted: false,
      status: true,
      courses: {
        $elemMatch: {
          course: { $in: teacher.courses },
        },
      },
    })
      .skip(parseInt(studentsCount || 0))
      .limit(parseInt(studentsCount || 0) + 30)
      .select("-password")
      .populate("courses.course");

    const totalLength = await Student.countDocuments({
      fullName: { $regex: regexSearchQuery },
      deleted: false,
      status: true,
      courses: {
        $elemMatch: {
          course: { $in: teacher.courses },
        },
      },
    });

    res.status(200).json({ students, totalLength });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get students for pagination

export const getStudentsForPagination = async (req, res) => {
  const { searchQuery, status } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  console.log(req.query, "======");
  try {
    let totalPages;
    let students;
    let filterObj = {};

    if (status === "active") filterObj.status = true;

    if (status === "deactive") filterObj.status = false;

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
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("courses.course");

      totalPages = Math.ceil(studentsCount / limit);
    } else {
      const studentsCount = await Student.countDocuments({
        deleted: false,
        ...filterObj,
      });
      totalPages = Math.ceil(studentsCount / limit);
      students = await Student.find({ deleted: false, ...filterObj })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("courses.course");
    }

    const studentList = students.map((student) => ({
      ...student.toObject(),
      password: "",
    }));

    res.status(200).json({ students: studentList, totalPages });
  } catch (err) {
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
          // console.log(targetYear, "target year");
          // console.log(targetMonth, "target month");
          // console.log(targetDayOfMonth, "target day");
          // console.log(day, "day");
          // console.log(time, "time");
          // console.log(role, "role");
          // console.log(student._id, "student id");
          // console.log(student.fullName, "student name");
          // console.log(student);

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
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      query: req.query,
      for: "GET STUDENTS BY COURSE ID",
      user: req.user,
      functionName: getStudentsByCourseId.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

// Update student

export const updateStudent = async (req, res) => {
  const { id } = req.params;
  let updatedData = req.body;

  try {
    const regexEmail = new RegExp(updatedData.email, "i");

    const student = await Student.findById(id);
    const existingAdmin = await Admin.findOne({ email: regexEmail });
    const existingStudent = await Student.findOne({ email: regexEmail });
    const existingTeacher = await Teacher.findOne({ email: regexEmail });

    if (
      (existingStudent && existingStudent._id != id) ||
      existingAdmin ||
      existingTeacher
    ) {
      return res.status(409).json({ key: "email-already-exist" });
    }

    if (updatedData.password && updatedData.password.length > 5) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(updatedData.password, salt);
      updatedData.password = hashedPassword;
    } else {
      delete updatedData.password;
    }

    const updatedStudent = await Student.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    }).populate("courses.course");

    if (!updatedStudent) {
      return res.status(404).json({ key: "student-not-found" });
    }

    if (
      student.birthday &&
      (student.birthday.getDate() != updatedStudent.birthday.getDate() ||
        student.birthday.getMonth() != updatedStudent.birthday.getMonth())
    ) {
      createNotificationForBirthdayAtCreateAndUpdateStudent(updatedStudent);
    }

    if (student.status && !updatedStudent.status) {
      const firstDayCurrWeek = new Date();
      firstDayCurrWeek.setDate(
        firstDayCurrWeek.getDate() -
          (firstDayCurrWeek.getDay() > 0 ? firstDayCurrWeek.getDay() : 7) +
          1
      );

      firstDayCurrWeek.setHours(0, 0, 0, 0);

      const studentCurrentLessonsCount = await Lesson.countDocuments({
        "students.student": student._id,
        role: "current",
        date: {
          $gte: firstDayCurrWeek,
        },
      });

      if (studentCurrentLessonsCount > 0) {
        await Student.findByIdAndUpdate(student._id, student);
        return res.status(400).json({ key: "has-current-week-lessons" });
      }

      await Lesson.updateMany(
        {
          role: "main",
          "students.student": student._id,
        },
        {
          $pull: { students: { student: student._id } },
        }
      );
    }

    if (updatedStudent.courses.find((item) => item.lessonAmount < 1)) {
      createNotificationForOneStudentLessonsCount(updatedStudent);
    } else {
      deleteNotificationForOneStudentLessonCount(updatedStudent);
    }

    const updatedStudentObj = updatedStudent.toObject();
    updatedStudentObj.password = "";

    res.status(200).json(updatedStudentObj);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete student
export const deleteStudent = async (req, res) => {
  const { id } = req.params;
  const firstDayCurrWeek = new Date();
  firstDayCurrWeek.setDate(
    firstDayCurrWeek.getDate() -
      (firstDayCurrWeek.getDay() > 0 ? firstDayCurrWeek.getDay() : 7) +
      1
  );

  firstDayCurrWeek.setHours(0, 0, 0, 0);

  try {
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ key: "student-not-found" });
    }

    const studentCurrentLessonsCount = await Lesson.countDocuments({
      "students.student": student._id,
      role: "current",
      date: {
        $gte: firstDayCurrWeek,
      },
    });

    if (studentCurrentLessonsCount > 0) {
      return res.status(400).json({ key: "has-current-week-lessons" });
    }

    const studentLessonCount = await Lesson.countDocuments({
      "students.student": id,
    });

    if (studentLessonCount > 0) {
      await Student.findByIdAndUpdate(id, { deleted: true });
    } else {
      await Student.findByIdAndDelete(id);
    }

    await Lesson.updateMany(
      {
        role: "main",
        "students.student": student._id,
      },
      {
        $pull: { students: { student: student._id } },
      }
    );

    res.status(200).json({ message: "Student successfully deleted" });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Update student password
export const updateStudentPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { id } = req.user;

  try {
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ message: "student-not-found" });
    }

    const isPasswordCorrect = await bcrypt.compare(
      oldPassword,
      student.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({ key: "old-password-incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );

    const cleanedUpdatedStudent = updatedStudent.toObject();
    cleanedUpdatedStudent.password = "";

    res.status(200).json(cleanedUpdatedStudent);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Student lesson amount

export const decrementLessonAmount = async (lesson) => {
  console.log("------------ bla bla bla");
  console.log(lesson);
  try {
    const studentsIds = lesson.students
      .filter((item) => item.attendance !== 2)
      .map((item) => item.student._id);

    if (studentsIds.length === 0) {
      return true;
    }

    await Student.updateMany(
      {
        _id: { $in: studentsIds },
        "courses.course": { $ne: lesson.course._id },
      },
      { $addToSet: { courses: { course: lesson.course._id, lessonAmount: 0 } } }
    );

    const updatedStudent = await Student.updateMany(
      {
        _id: { $in: studentsIds },
        "courses.course": lesson.course._id,
      },
      { $inc: { "courses.$.lessonAmount": -1 } }
    );

    if (
      !updatedStudent.acknowledged ||
      updatedStudent.modifiedCount !== studentsIds.length
    ) {
      console.log("salam error");
      return false;
    }

    const targetStudents = await Student.find({
      _id: { $in: studentsIds },
    });

    createNotificationForLessonsCount(targetStudents);

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const incrementLessonAmount = async (lesson) => {
  try {
    const studentsIds = lesson.students
      .filter((item) => item.attendance !== 2)
      .map((item) => item.student._id);

    await Student.updateMany(
      {
        _id: { $in: studentsIds },
        "courses.course": { $ne: lesson.course._id },
      },
      { $addToSet: { courses: { course: lesson.course._id, lessonAmount: 0 } } }
    );

    const updatedStudent = await Student.updateMany(
      {
        _id: { $in: studentsIds },
        "courses.course": lesson.course._id,
      },
      { $inc: { "courses.$.lessonAmount": 1 } }
    );

    if (
      !updatedStudent.acknowledged ||
      updatedStudent.modifiedCount !== studentsIds.length
    ) {
      return false;
    }

    const targetStudents = await Student.find({
      _id: { $in: studentsIds },
    });

    deleteNotificationForLessonCount(targetStudents);

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const icrementAndDecrementLessonAmount = async (
  oldLesson,
  newLesson
) => {
  try {
    const oldStudents = oldLesson.students.map((item) => item);
    const newStudents = newLesson.students.map((item) => item);

    const incrementedStudentsIds = newStudents
      .filter(
        (newItem) =>
          newItem.attendance === 2 &&
          oldStudents.find(
            (oldItem) => oldItem._id.toString() == newItem._id.toString()
          )?.attendance !== 2
      )
      .map((item) => item.student._id);

    const decrementedStudentsIds = newStudents
      .filter(
        (newItem) =>
          newItem.attendance !== 2 &&
          oldStudents.find(
            (oldItem) => oldItem._id.toString() == newItem._id.toString()
          )?.attendance === 2
      )
      .map((item) => item.student._id);

    if (
      incrementedStudentsIds.length === 0 &&
      decrementedStudentsIds.length === 0
    ) {
      return true;
    }

    await Student.updateMany(
      {
        _id: { $in: [...incrementedStudentsIds, ...decrementedStudentsIds] },
        "courses.course": { $ne: newLesson.course._id },
      },
      {
        $addToSet: {
          courses: { course: newLesson.course._id, lessonAmount: 0 },
        },
      }
    );

    if (incrementedStudentsIds.length > 0) {
      const updatedDecStudent = await Student.updateMany(
        {
          _id: { $in: incrementedStudentsIds },
          "courses.course": newLesson.course._id,
        },
        { $inc: { "courses.$.lessonAmount": 1 } }
      );

      if (
        !updatedDecStudent.acknowledged ||
        updatedDecStudent.modifiedCount !== incrementedStudentsIds.length
      ) {
        return false;
      }

      const targetIncStudents = await Student.find({
        _id: { $in: incrementedStudentsIds },
      });

      deleteNotificationForLessonCount(targetIncStudents);
    }

    if (decrementedStudentsIds.length > 0) {
      const updatedIncStudent = await Student.updateMany(
        {
          _id: { $in: decrementedStudentsIds },
          "courses.course": newLesson.course._id,
        },
        { $inc: { "courses.$.lessonAmount": -1 } }
      );

      if (
        !updatedIncStudent.acknowledged ||
        updatedIncStudent.modifiedCount !== decrementedStudentsIds.length
      ) {
        return false;
      }

      const targetDecStudents = await Student.find({
        _id: { $in: decrementedStudentsIds },
      });

      createNotificationForLessonsCount(targetDecStudents);
    }

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};
