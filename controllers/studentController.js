import { Lesson } from "../models/lessonModel.js";
import { Student } from "../models/studentModel.js";
import logger from "../config/logger.js";

// Create student
export const createStudent = async (req, res) => {
  try {
    const newStudent = new Student(req.body);
    await newStudent.save();

    const studentsCount = await Student.countDocuments({ deleted: false });
    const lastPage = Math.ceil(studentsCount / 10);

    res.status(201).json({ student: newStudent, lastPage });
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
  const { searchQuery, status } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

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
        .populate("courses groups");

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
        .populate("courses groups");
    }

    res.status(200).json({ students, totalPages });
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

  try {
    const updatedStudent = await Student.findByIdAndUpdate(id, req.body, {
      new: true,
    }).populate("courses");

    if (!updatedStudent) {
      return res.status(404).json({ key: "student-not-found" });
    }

    res.status(200).json(updatedStudent);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete student
export const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedStudent = await Student.findByIdAndUpdate(id, {
      deleted: true,
    });

    if (!deletedStudent) {
      return res.status(404).json({ key: "student-not-found" });
    }

    res.status(200).json(deletedStudent);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};
