import { calcDate } from "../calculate/calculateDate.js";
import { Student } from "../models/studentModel.js";
import { v4 as uuidv4 } from "uuid";

// Get careers
export const getCareers = async (req, res) => {
  const { startDate, endDate, searchQuery } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");
    let targetDate;

    if (startDate && endDate) {
      targetDate = calcDate(null, startDate, endDate);
    } else {
      targetDate = calcDate(1);
    }

    const studentsCount = await Student.countDocuments({
      fullName: { $regex: regexSearchQuery },
    });
    const totalPages = Math.ceil(studentsCount / limit);

    const students = await Student.find({
      fullName: { $regex: regexSearchQuery },
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "groups.group",
        populate: {
          path: "course",
          module: "Course",
        },
      });

    const careers = students.reduce((list, student) => {
      const career = student.groups.map((item) => ({
        ...student.toObject(),
        groups: null,
        ...item.toObject(),
        _id: uuidv4(),
      }));

      return [...list, ...career];
    }, []);

    res.status(200).json({ careers, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};
