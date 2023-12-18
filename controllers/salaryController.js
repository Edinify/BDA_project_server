import { calcDate, calcDateWithMonthly } from "../calculate/calculateDate.js";
import { Lesson } from "../models/lessonModel.js";
import { Teacher } from "../models/teacherModel.js";

// Get salaries
export const getSalariesForAdmins = async (req, res) => {
  const { startDate, endDate, searchQuery } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    let targetDate;
    let teachers;
    let totalPages;
    let result;

    if (startDate && endDate) {
      targetDate = calcDate(null, startDate, endDate);
    } else {
      targetDate = calcDateWithMonthly(startDate, endDate);
    }

    console.log(targetDate);
    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");

      const teachersCount = await Teacher.countDocuments({
        fullName: { $regex: regexSearchQuery },
      });

      teachers = await Teacher.find({
        fullName: { $regex: regexSearchQuery },
      })
        .skip((page - 1) * limit)
        .limit(limit);

      totalPages = Math.ceil(teachersCount / limit);
    } else {
      const teachersCount = await Teacher.countDocuments();

      totalPages = Math.ceil(teachersCount / limit);

      teachers = await Teacher.find()
        .skip((page - 1) * limit)
        .limit(limit);
    }

    result = await Promise.all(
      teachers.map(async (teacher) => {
        let targetMonth;

        const targetLessons = await Lesson.find({
          teacher: teacher._id,
          status: "confirmed",
          role: "current",
          date: {
            $gte: targetDate.startDate,
            $lte: targetDate.endDate,
          },
        });

        console.log(teacher.fullName);
        console.log(targetLessons);

        let totalConfirmed = targetLessons.length;
        let totalCancelled = await Lesson.countDocuments({
          teacher: teacher._id,
          role: "current",
          status: "cancelled",
          date: {
            $gte: targetDate.startDate,
            $lte: targetDate.endDate,
          },
        });
        let totalSalary = 0;
        let participantCount = 0;
        let totalBonus = 0;

        targetLessons?.forEach((lesson) => {
          participantCount += lesson.students.filter(
            (item) => item.attendance === 1 || item.attendance === -1
          ).length;

          if (lesson.salary.monthly) {
            if (targetMonth !== lesson.date.getMonth()) {
              totalSalary += lesson.salary.value;
              targetMonth = lesson.date.getMonth();
            }
          } else if (lesson.salary.hourly) {
            totalSalary +=
              lesson.salary.value *
              lesson.students.filter(
                (item) => item.attendance === 1 || item.attendance === -1
              ).length;
          }
        });

        return {
          _id: teacher._id,
          teacherName: teacher.fullName,
          salary: teacher.salary,
          totalSalary: totalSalary,
          confirmedCount: totalConfirmed,
          cancelledCount: totalCancelled,
          participantCount: participantCount,
          bonus: totalBonus,
        };
      })
    );

    res.status(200).json({ salaries: result, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getSalariesForTeacher = async (req, res) => {
  const { startDate, endDate, monthCount } = req.query;
  const { id } = req.user;

  console.log(req.query);

  try {
    let targetMonth;
    let targetDate = calcDate(monthCount, startDate, endDate);
    const teacher = await Teacher.findById(id);

    const confirmedLessons = await Lesson.find({
      teacher: id,
      role: "current",
      status: "confirmed",
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    let totalSalary = 0;
    let participantCount = 0;
    let totalBonus = 0;

    confirmedLessons.forEach((lesson) => {
      participantCount += lesson.students.filter(
        (item) => item.attendance === 1 || item.attendance === -1
      ).length;

      if (lesson.salary.monthly) {
        if (targetMonth !== lesson.date.getMonth()) {
          totalSalary += lesson.salary.value;
          targetMonth = lesson.date.getMonth();
        }
      } else if (lesson.salary.hourly) {
        totalSalary +=
          lesson.salary.value *
          lesson.students.filter(
            (item) => item.attendance === 1 || item.attendance === -1
          ).length;
      }
    });

    const result = {
      _id: id,
      salary: teacher.salary,
      totalSalary: totalSalary,
      participantCount: participantCount,
      bonus: totalBonus,
    };

    res.status(200).json({ salary: result });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};
