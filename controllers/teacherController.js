import { Lesson } from "../models/lessonModel.js";
import { Teacher } from "../models/teacherModel.js";
import bcrypt from "bcrypt";
import { calcDate, calcDateWithMonthly } from "../calculate/calculateDate.js";
import { Admin } from "../models/adminModel.js";
import { Worker } from "../models/workerModel.js";
import { Group } from "../models/groupModel.js";
import { Course } from "../models/courseModel.js";

// Create teacher

export const createTeacher = async (req, res) => {
  const { email, password, role } = req.body;

  console.log(req.body);

  try {
    const regexEmail = new RegExp(email || "", "i");

    const existingAdmin = await Admin.findOne({
      email: { $regex: regexEmail },
    });
    const existingWorker = await Worker.findOne({
      email: { $regex: regexEmail },
    });
    const existingTeacher = await Teacher.findOne({
      email: { $regex: regexEmail },
    });

    if (existingAdmin || existingWorker || existingTeacher) {
      return res.status(409).json({ key: "email-already-exist" });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    const teacher = new Teacher({ ...req.body, password: hashedPassword });
    await teacher.populate("courses");
    await teacher.save();

    const teachersCount = await Teacher.countDocuments({
      deleted: false,
      role: teacher.role,
    });
    const lastPage = Math.ceil(teachersCount / 10);

    res
      .status(201)
      .json({ teacher: { ...teacher.toObject(), password: "" }, lastPage });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Get teachers

export const getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .select("-password")
      .populate("courses");

    res.status(200).json(teachers);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get active teachers
export const getActiveTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find({
      deleted: false,
      status: true,
    }).select("-password");

    res.status(200).json(teachers);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get active teachers by course id
export const getTeachersByCourseId = async (req, res) => {
  const { courseId, role } = req.query;

  try {
    const teachers = await Teacher.find({
      deleted: false,
      status: true,
      courses: { $in: courseId },
      role,
    })
      .select("-password")
      .populate("courses");

    res.status(200).json(teachers);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get checked teachers
export const getCheckedTeachers = async (req, res) => {
  const { lessonId } = req.query;
  try {
    const lesson = await Lesson.findById(lessonId).populate("group");
    const targetYear = lesson.date.getFullYear();
    const targetMonth = lesson.date.getMonth() + 1;
    const targetDayOfMonth = lesson.date.getDate();

    const teachers = await Teacher.find({
      _id: { $in: lesson.group.teachers },
    });

    const result = teachers.map(async (teacher) => {
      const checkLesson = await Lesson.findOne({
        teacher: teacher._id,
        day: lesson.day,
        time: lesson.time,
        $expr: {
          $and: [
            { $eq: [{ $year: "$date" }, targetYear] },
            { $eq: [{ $month: "$date" }, targetMonth] },
            { $eq: [{ $dayOfMonth: "$date" }, targetDayOfMonth] },
          ],
        },
      });

      return { ...teacher.toObject(), disabled: checkLesson ? true : false };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get teacher for pagination
export const getTeachersForPagination = async (req, res) => {
  const { searchQuery, status, role, courseId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  console.log(req.query);
  try {
    let totalPages;
    let teachers;
    let filterObj = {
      role,
    };

    if (status === "active") filterObj.status = true;

    if (status === "deactive") filterObj.status = false;

    if (courseId) filterObj.courses = courseId;

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");

      const teachersCount = await Teacher.countDocuments({
        fullName: { $regex: regexSearchQuery },
        deleted: false,
        ...filterObj,
      });

      teachers = await Teacher.find({
        fullName: { $regex: regexSearchQuery },
        deleted: false,
        ...filterObj,
      })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("courses");

      totalPages = Math.ceil(teachersCount / limit);
    } else {
      const teachersCount = await Teacher.countDocuments({
        deleted: false,
        ...filterObj,
      });
      totalPages = Math.ceil(teachersCount / limit);

      teachers = await Teacher.find({ deleted: false, ...filterObj })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("courses");
    }

    const teacherList = teachers.map((teacher) => ({
      ...teacher.toObject(),
      password: "",
    }));

    res.status(200).json({ teachers: teacherList, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Update teacher
export const updateTeacher = async (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;
  const { email } = req.body;
  let updatedData = req.body;

  console.log(req.user, "user");

  try {
    const regexEmail = new RegExp(email || "", "i");

    const existingAdmin = await Admin.findOne({
      email: { $regex: regexEmail },
    });
    const existingWorker = await Worker.findOne({
      email: { $regex: regexEmail },
    });
    const existingTeacher = await Teacher.findOne({
      email: { $regex: regexEmail },
      _id: { $ne: id },
    });

    console.log(existingTeacher);

    if (email && (existingTeacher || existingAdmin || existingWorker)) {
      return res.status(409).json({ key: "email-already-exist" });
    }

    if (updatedData.password && updatedData.password.length > 5) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(updatedData.password, salt);
      updatedData = { ...updatedData, password: hashedPassword };
    } else {
      delete updatedData.password;
    }

    if (role === "worker") {
      const worker = await Worker.findById(userId);

      const power = worker.profiles.find(
        (item) => item.profile === "teachers"
      )?.power;

      if (power === "update") {
        const courses = await Course.find({
          _id: { $in: updatedData?.courses || [] },
        });

        delete updatedData.changes;
        updatedData.courses = courses;

        updatedData = { changes: updatedData };
      }
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    }).populate("courses");

    if (!updatedTeacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    console.log(updatedTeacher, "updated teacher");

    res.status(200).json({ ...updatedTeacher.toObject(), password: "" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete teacher
export const deleteTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedTeacher = await Teacher.findByIdAndUpdate(
      id,
      { deleted: true },
      { new: true }
    );

    if (!deletedTeacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json({ ...deletedTeacher.toObject(), password: "" });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Update teacher password
export const updateTeacherPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { id } = req.user;

  try {
    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found." });
    }

    const isPasswordCorrect = await bcrypt.compare(
      oldPassword,
      teacher.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({ key: "old-password-incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );

    res.status(200).json({ ...updatedTeacher.toObject(), password: "" });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get teacher chart data

export const getTeacherChartData = async (req, res) => {
  const { monthCount, startDate, endDate } = req.query;
  const { id } = req.user;

  try {
    let targetDate;

    if (monthCount) {
      targetDate = calcDate(monthCount);
    } else if (startDate && endDate) {
      targetDate = calcDateWithMonthly(startDate, endDate);
    }

    const months = [];
    const studentsCountList = [];
    const lessonsCountList = [];

    while (targetDate.startDate <= targetDate.endDate) {
      const targetYear = targetDate.startDate.getFullYear();
      const targetMonth = targetDate.startDate.getMonth() + 1;

      const monthName = new Intl.DateTimeFormat("en-US", {
        month: "long",
      }).format(targetDate.startDate);

      const lessons = await Lesson.find({
        role: "current",
        status: "confirmed",
        teacher: id,
        $expr: {
          $and: [
            { $eq: [{ $year: "$date" }, targetYear] },
            { $eq: [{ $month: "$date" }, targetMonth] },
          ],
        },
      });

      const totalStudentsCount = lessons.reduce((list, lesson) => {
        return [
          ...list,
          ...lesson.students
            .filter(
              (item) =>
                item.attendance != 2 &&
                !list.find((id) => id.toString() == item.student.toString())
            )
            .map((item) => item.student),
        ];
      }, []).length;

      months.push({
        month: monthName,
        year: targetYear,
      });
      lessonsCountList.push(lessons.length);
      studentsCountList.push(totalStudentsCount);

      targetDate.startDate.setMonth(targetDate.startDate.getMonth() + 1);
    }

    res.status(200).json({ months, studentsCountList, lessonsCountList });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get teacher confirmed lesson

export const getTeacherConfirmedLessonsCount = async (req, res) => {
  const { startDate, endDate, monthCount } = req.query;
  const { id } = req.user;

  const targetDate = calcDate(monthCount, startDate, endDate);
  try {
    const confirmedCount = await Lesson.countDocuments({
      teacher: id,
      status: "confirmed",
      role: "current",
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    res.status(200).json(confirmedCount);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getTeacherCancelledLessonsCount = async (req, res) => {
  const { startDate, endDate, monthCount } = req.query;
  const { id } = req.user;

  const targetDate = calcDate(monthCount, startDate, endDate);
  try {
    const cancelledCount = await Lesson.countDocuments({
      teacher: id,
      role: "current",
      status: "cancelled",
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    res.status(200).json(cancelledCount);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getTeacherUnviewedLessons = async (req, res) => {
  const { startDate, endDate, monthCount } = req.query;
  const { id } = req.user;

  const targetDate = calcDate(monthCount, startDate, endDate);
  try {
    const unviewedCount = await Lesson.countDocuments({
      teacher: id,
      role: "current",
      status: "unviewed",
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    res.status(200).json(unviewedCount);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getTeacherLeadboardOrder = async (req, res) => {
  const { monthCount, startDate, endDate, byFilter } = req.query;
  const { id } = req.user;

  const targetDate = calcDate(monthCount, startDate, endDate);

  try {
    const teachers = await Teacher.find().select("_id fullName");

    const teachersResultsList = await Promise.all(
      teachers.map(async (teacher) => {
        const confirmedLessons = await Lesson.find({
          teacher: teacher._id,
          role: "current",
          status: "confirmed",
          date: {
            $gte: targetDate.startDate,
            $lte: targetDate.endDate,
          },
        }).select("students");

        const totalLessonsCount = confirmedLessons.reduce(
          (total, lesson) =>
            total +
            lesson.students.filter((item) => item.attendance === 1).length,
          0
        );
        const totalStarsCount = confirmedLessons.reduce(
          (total, lesson) =>
            total +
            lesson.students
              .filter((item) => item.attendance === 1)
              .reduce((total, item) => total + item.ratingByStudent, 0),
          0
        );

        return {
          teacher,
          lessonCount: totalLessonsCount,
          starCount: totalStarsCount,
        };
      })
    );

    if (byFilter === "lessonCount") {
      teachersResultsList.sort((a, b) => b.lessonCount - a.lessonCount);
    } else if (byFilter === "starCount") {
      teachersResultsList.sort((a, b) => b.starCount - a.starCount);
    }

    const teacherIndex = teachersResultsList.findIndex(
      (item) => item.teacher._id.toString() == id
    );

    const teacherOrder =
      teachersResultsList[teacherIndex][byFilter] > 0
        ? teacherIndex + 1
        : teachersResultsList.length;

    res.status(200).json({
      teacherOrder,
      teacherCount: teachersResultsList.length,
    });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Confirm teacher changes
export const confirmTeacherChanges = async (req, res) => {
  const { id } = req.params;
  const { changes } = req.body;

  try {
    const teacher = await Teacher.findByIdAndUpdate(
      id,
      { ...changes, changes: {} },
      { new: true }
    ).populate("courses");

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json({ ...teacher.toObject(), password: "" });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Cancel teacher changes
export const cancelTeacherChanges = async (req, res) => {
  const { id } = req.params;

  try {
    const teacher = await Teacher.findByIdAndUpdate(
      id,
      { changes: {} },
      { new: true }
    ).populate("courses");

    res.status(200).json({ ...teacher.toObject(), password: "" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
