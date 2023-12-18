import { Lesson } from "../models/lessonModel.js";
import { Teacher } from "../models/teacherModel.js";
import bcrypt from "bcrypt";
import { calcDate, calcDateWithMonthly } from "../calculate/calculateDate.js";
import { Admin } from "../models/adminModel.js";
import { Student } from "../models/studentModel.js";

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
    })
      .select("-password")
      .populate("courses");

    res.status(200).json(teachers);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get teacher for pagination
export const getTeachersForPagination = async (req, res) => {
  const { searchQuery, status } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    let totalPages;
    let teachers;
    let filterObj = {};

    if (status === "active") filterObj.status = true;

    if (status === "deactive") filterObj.status = false;

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
  let updatedData = req.body;

  try {
    const existingAdmin = await Admin.findOne({ email: updatedData.email });
    const existingStudent = await Student.findOne({ email: updatedData.email });
    const existingTeacher = await Teacher.findOne({ email: updatedData.email });

    if (
      (existingTeacher && existingTeacher._id != id) ||
      existingAdmin ||
      existingStudent
    ) {
      return res.status(409).json({ key: "email-already-exist" });
    }

    if (updatedData.password && updatedData.password.length > 5) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(updatedData.password, salt);
      updatedData = { ...updatedData, password: hashedPassword };
    } else {
      delete updatedData.password;
    }

    const teacher = await Teacher.findById(id);

    const updatedTeacher = await Teacher.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    }).populate("courses");

    if (!updatedTeacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }


    if (teacher.status && !updatedTeacher.status) {
      const firstDayCurrWeek = new Date();
      firstDayCurrWeek.setDate(
        firstDayCurrWeek.getDate() -
          (firstDayCurrWeek.getDay() > 0 ? firstDayCurrWeek.getDay() : 7) +
          1
      );

      firstDayCurrWeek.setHours(0, 0, 0, 0);

      const teacherCurrentLessonsCount = await Lesson.countDocuments({
        teacher: teacher._id,
        role: "current",
        date: {
          $gte: firstDayCurrWeek,
        },
      });

      if (teacherCurrentLessonsCount > 0) {
        await Teacher.findByIdAndUpdate(teacher._id, teacher);
        return res.status(400).json({ key: "has-current-week-lessons" });
      }

      await Lesson.deleteMany({
        role: "main",
        teacher: teacher._id,
      });
    }

    const updatedTeacherObj = updatedTeacher.toObject();
    updatedTeacherObj.password = "";

    res.status(200).json(updatedTeacherObj);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete teacher
export const deleteTeacher = async (req, res) => {
  const { id } = req.params;
  const firstDayCurrWeek = new Date();
  firstDayCurrWeek.setDate(
    firstDayCurrWeek.getDate() -
      (firstDayCurrWeek.getDay() > 0 ? firstDayCurrWeek.getDay() : 7) +
      1
  );

  firstDayCurrWeek.setHours(0, 0, 0, 0);

  try {
    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const teacherCurrentLessonsCount = await Lesson.countDocuments({
      teacher: teacher._id,
      role: "current",
      date: {
        $gte: firstDayCurrWeek,
      },
    });

    if (teacherCurrentLessonsCount > 0) {
      return res.status(400).json({ key: "has-current-week-lessons" });
    }

    const teacherLessonsCount = await Lesson.countDocuments({
      teacher: id,
      role: "current",
    });
    if (teacherLessonsCount > 0) {
      await Teacher.findByIdAndUpdate(id, { deleted: true });
    } else {
      await Teacher.findByIdAndDelete(id);
    }

    await Lesson.deleteMany({ teacher: id, role: "main" });

    res.status(200).json({ message: "Teacher successfully deleted" });
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
      return res.status(404).json({ message: "Student not found." });
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

    res.status(200).json(updatedTeacher);
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
