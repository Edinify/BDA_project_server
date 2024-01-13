import logger from "../config/logger.js";
import { Lesson } from "../models/lessonModel.js";
import { Teacher } from "../models/teacherModel.js";
import { calcDate } from "../calculate/calculateDate.js";
import { Syllabus } from "../models/syllabusModel.js";

// Create lesson
export const createLesson = async (req, res) => {
  const { date } = req.body;
  const day = new Date(date).getDay();

  console.log(date);
  console.log(day);
  try {
    const newLesson = new Lesson({
      ...req.body,
      day: day == 0 ? 7 : day,
    });

    // await newLesson
    //   .populate("teacher")
    //   .populate({ path: "students.student", select: "-groups" })
    //   .populate({
    //     path: "group",
    //     populate: {
    //       path: "course",
    //       model: "Course",
    //     },
    //   });

    await newLesson.save();

    console.log(newLesson);
    res.status(201).json(newLesson);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create lessons
export const createLessons = async (group) => {
  const {
    startDate,
    endDate,
    lessonDate,
    _id,
    course,
    students,
    teachers,
    mentors,
  } = group;

  console.log(startDate, endDate, lessonDate);
  try {
    const checkLessons = await Lesson.findOne({ group: _id });
    const syllabus = await Syllabus.find({ courseId: course }).sort({
      orderNumber: 1,
    });
    let syllabusIndex = 0;
    const lessons = [];

    console.log(checkLessons);

    if (!startDate || !endDate || lessonDate.length == 0 || checkLessons)
      return;

    console.log("salam");

    while (startDate <= endDate) {
      const currentDay = startDate.getDay();
      const checkDay = lessonDate?.find((item) => item.day === currentDay);

      if (checkDay) {
        const currentDate = new Date(startDate);
        const studentsObj = students.map((student) => ({
          student,
        }));
        let newLesson;

        if (checkDay?.practical) {
          newLesson = {
            group: _id,
            course: course,
            date: currentDate,
            day: checkDay.day,
            time: checkDay.time,
            students: studentsObj,
            teacher: teachers[0],
            mentor: mentors[0],
            topic: {
              name: "Praktika",
            },
          };
        } else {
          newLesson = {
            group: _id,
            course: course,
            date: currentDate,
            day: checkDay.day,
            time: checkDay.time,
            students: studentsObj,
            teacher: teachers[0],
            mentor: mentors[0],
            topic: syllabus[syllabusIndex],
          };
          syllabusIndex++;
        }

        lessons.push(newLesson);
      }

      startDate.setDate(startDate.getDate() + 1);
    }

    const result = await Lesson.insertMany(lessons);

    console.log(result);
    return true;
  } catch (err) {
    console.log(err.message);
    return false;
  }
};

export const getLessons = async (req, res) => {
  const { groupId, startDate, endDate } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    let targetDate;
    if (startDate && endDate) {
      targetDate = calcDate(null, startDate, endDate);
    } else {
      targetDate = calcDate(1);
    }

    const filterObj = {
      group: groupId,
      // date: {
      //   $gte: targetDate.startDate,
      //   $lte: targetDate.endDate,
      // },
    };

    const lessonsCount = await Lesson.countDocuments(filterObj);

    const totalPages = Math.ceil(lessonsCount / limit);
    const skip = (page - 1) * limit;

    const lessons = await Lesson.find(filterObj)
      .skip(skip)
      .limit(limit)
      .sort({ date: 1 })
      .populate("teacher mentor")
      .populate({ path: "students.student", select: "-groups" })
      .populate({
        path: "group",
        populate: {
          path: "course",
          model: "Course",
        },
      });

    res.status(200).json({ lessons, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// const startDate = new Date("2023-1-1");
// const endDate = new Date("2023-12-31");
// startDate.setHours(16);
// endDate.setHours(16);

// const fakeGroup = {
//   _id: "657d9fdaa26257b6c52e8730",
//   course: "657da00da26257b6c52e873a",
//   students: [
//     { student: "658124cdc2a2bbccf7fd4083" },
//     { student: "65812502c2a2bbccf7fd4089" },
//     { student: "658124e4c2a2bbccf7fd4086" },
//   ],
//   startDate: startDate,
//   endDate: endDate,
//   lessonDate: [
//     {
//       day: 1,
//       time: "11:00",
//     },
//     {
//       day: 2,
//       time: "14:00",
//     },
//     {
//       day: 3,
//       time: "18:00",
//     },
//     {
//       day: 5,
//       time: "20:00",
//     },
//   ],
// };

// createLessons(fakeGroup);

// const lessonDate = [
//   {
//     day: 1,
//   },
//   {
//     day: 2,
//   },
//   {
//     day: 3,
//   },
//   {
//     day: 5,
//   },
// ];

// const startDate = new Date("2023-8-25");
// const endDate = new Date("2023-12-12");

// startDate.setHours(16);
// endDate.setHours(16);

// const dates = [];

// while (startDate <= endDate) {
//   const currentDay = startDate.getDay();
//   const checkDay = lessonDate.find((item) => item.day === currentDay);

//   if (checkDay) {
//     const currentDate = new Date(startDate);

//     dates.push(currentDate);
//   }

//   startDate.setDate(startDate.getDate() + 1);
// }

// console.log(dates);

// Update lesson
export const updateLesson = async (req, res) => {
  const { id } = req.params;
  const { date } = req.body;

  console.log("update");
  console.log(req.body);
  console.log(id);

  try {
    const updateData = req.body;

    if (date) {
      const day = new Date(date).getDay();
      updateData.day = day == 0 ? 7 : day;
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("teacher students.student group mentor");

    if (!updatedLesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.status(200).json(updatedLesson);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete lesson
export const deleteLesson = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedLesson = await Lesson.findByIdAndDelete(id);

    if (!deletedLesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.status(200).json(deletedLesson);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};
