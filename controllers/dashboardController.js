import { calcDate, calcDateWithMonthly } from "../calculate/calculateDate.js";
import logger from "../config/logger.js";
import { Course } from "../models/courseModel.js";
import { Expense } from "../models/expenseModel.js";
import { Income } from "../models/incomeModel.js";
import { Lesson } from "../models/lessonModel.js";
import { Student } from "../models/studentModel.js";
import { Teacher } from "../models/teacherModel.js";

export const getConfirmedLessonsCount = async (req, res) => {
  const { startDate, endDate, monthCount } = req.query;
  const targetDate = calcDate(monthCount, startDate, endDate);

  try {
    const confirmedCount = await Lesson.countDocuments({
      status: "confirmed",
      role: "current",
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    res.status(200).json(confirmedCount);
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      query: req.query,
      for: "GET CONFIRMED LESSONS COUNT FOR DASHBOARD",
      user: req.user,
      functionName: getConfirmedLessonsCount.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getCancelledLessonsCount = async (req, res) => {
  const { startDate, endDate, monthCount } = req.query;
  const targetDate = calcDate(monthCount, startDate, endDate);
  try {
    const cancelledCount = await Lesson.countDocuments({
      status: "cancelled",
      role: "current",
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    res.status(200).json(cancelledCount);
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      query: req.query,
      for: "GET CANCELLED LESSONS COUNT FOR DASHBOARD",
      user: req.user,
      functionName: getCancelledLessonsCount.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getUnviewedLessons = async (req, res) => {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1);
  currentDate.setHours(23, 59, 59, 999);

  try {
    const result = [];

    const unviewedLessons = await Lesson.find({
      date: {
        $lte: currentDate,
      },
      role: "current",
      status: "unviewed",
    }).populate("teacher course students.student");

    unviewedLessons.forEach((lesson) => {
      const checkTeacher = result.find(
        (item) =>
          item?.teacher?._id.toString() === lesson.teacher._id.toString()
      );

      if (checkTeacher) {
        checkTeacher.lessons?.push(lesson);
      } else {
        result.push({
          teacher: lesson.teacher,
          lessons: [lesson],
        });
      }
    });

    res.status(200).json(result);
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      for: "GET UNVIEWED LESSONS FOR DASHBOARD",
      user: req.user,
      functionName: getUnviewedLessons.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getFinance = async (req, res) => {
  const targetDate = calcDate(1);

  try {
    const incomes = await Income.find({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    const expenses = await Expense.find({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    const totalIncome = incomes.reduce(
      (total, income) => (total += income.amount),
      0
    );

    const totalExpense = expenses.reduce(
      (total, expense) => (total += expense.amount),
      0
    );

    const confirmedLessons = await Lesson.find({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
      status: "confirmed",
      role: "current",
    });

    const totalEarnings = confirmedLessons.reduce(
      (total, lesson) => total + lesson.earnings,
      0
    );

    const turnover = totalEarnings;

    const profit = turnover - totalExpense;

    const result = {
      income: totalIncome.toFixed(2),
      expense: totalExpense.toFixed(2),
      turnover: turnover.toFixed(2),
      profit: profit.toFixed(2),
    };

    res.status(200).json(result);
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      for: "GET FINANCE FOR DASHBOARD",
      user: req.user,
      functionName: getFinance.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getCoursesStatistics = async (req, res) => {
  const { monthCount, startDate, endDate } = req.query;
  const targetDate = calcDate(monthCount, startDate, endDate);
  try {
    const students = await Student.find({
      createdAt: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });
    const courses = await Course.find();

    const result = courses.map((course) => {
      const courseStatistic = students.filter((student) => {
        const coursesIds = student.courses.map((item) => item.course) || [];

        return coursesIds.find(
          (item) => item?.toString() === course._id?.toString()
        );
      });

      return { courseName: course.name, value: courseStatistic.length };
    });

    res.status(200).json(result);
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      query: req.query,
      for: "GET COURSES STATISTICS FOR DASHBOARD",
      user: req.user,
      functionName: getCoursesStatistics.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getAdvertisingStatistics = async (req, res) => {
  const { monthCount, startDate, endDate } = req.query;
  const targetDate = calcDate(monthCount, startDate, endDate);
  try {
    const students = await Student.find({
      createdAt: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });
    const advertisings = [
      "instagram",
      "referral",
      "event",
      "externalAds",
      "other",
    ];

    const result = advertisings.map((advertising) => {
      const advertisingStatistics = students.filter(
        (student) => student.whereComing === advertising
      );

      const value =
        ((advertisingStatistics.length * 100) / students.length || 0).toFixed(
          2
        ) || 0;

      return {
        name: advertising,
        value,
      };
    });

    res.status(200).json(result);
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      query: req.query,
      for: "GET ADVERTISING STATISTICS FOR DASHBOARD",
      user: req.user,
      functionName: getAdvertisingStatistics.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getTachersResults = async (req, res) => {
  const { monthCount, startDate, endDate, byFilter } = req.query;
  let targetDate = calcDate(monthCount, startDate, endDate);

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

    let index;
    if (byFilter === "lessonCount" && teachersResultsList.length) {
      teachersResultsList.sort((a, b) => b.lessonCount - a.lessonCount);
      index =
        teachersResultsList[2].lessonCount > 0
          ? 3
          : teachersResultsList[1].lessonCount > 0
          ? 2
          : teachersResultsList[0].lessonCount > 0
          ? 1
          : 0;
    } else if (byFilter === "starCount" && teachersResultsList.length) {
      teachersResultsList.sort((a, b) => b.starCount - a.starCount);
      index =
        teachersResultsList[2].starCount > 0
          ? 3
          : teachersResultsList[1].starCount > 0
          ? 2
          : teachersResultsList[0].starCount > 0
          ? 1
          : 0;
    }

    const result = {
      leaderTeacher: [...teachersResultsList.slice(0, index)],
      otherTeacher: [...teachersResultsList.slice(index)],
    };

    res.status(200).json(result);
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      query: req.query,
      for: "GET TEACHERS RESULTS FOR DASHBOARD",
      user: req.user,
      functionName: getTachersResults.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getLessonsCountChartData = async (req, res) => {
  const { monthCount, startDate, endDate } = req.query;
  try {
    let targetDate;

    if (monthCount) {
      targetDate = calcDate(monthCount);
    } else if ((startDate, endDate)) {
      targetDate = calcDateWithMonthly(startDate, endDate);
    }

    const months = [];
    const studentsCountList = [];

    while (targetDate.startDate <= targetDate.endDate) {
      const targetYear = targetDate.startDate.getFullYear();
      const targetMonth = targetDate.startDate.getMonth() + 1;

      const monthName = new Intl.DateTimeFormat("en-US", {
        month: "long",
      }).format(targetDate.startDate);

      const studentsCount = await Student.countDocuments({
        $expr: {
          $and: [
            { $eq: [{ $year: "$createdAt" }, targetYear] },
            { $eq: [{ $month: "$createdAt" }, targetMonth] },
          ],
        },
      });

      months.push({
        month: monthName,
        year: targetYear,
      });
      studentsCountList.push(studentsCount);

      targetDate.startDate.setMonth(targetDate.startDate.getMonth() + 1);
    }

    res.status(200).json({ months, values: studentsCountList });
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      query: req.query,
      for: "GET LESSONS COUNT CHART DATA FOR DASHBOARD",
      user: req.user,
      functionName: getLessonsCountChartData.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};
