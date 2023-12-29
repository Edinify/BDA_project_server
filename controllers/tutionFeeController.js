import { calcDate } from "../calculate/calculateDate.js";
import { Student } from "../models/studentModel.js";
// get tution fees
export const getTutionFees = async (req, res) => {
  const { startDate, endDate } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    let targetDate;

    if (startDate && endDate) {
      targetDate = calcDate(null, startDate, endDate);
    } else {
      targetDate = calcDate(1);
    }

    const studentsCount = await Student.countDocuments();
    const totalPages = Math.ceil(studentsCount / limit);

    const students = await Student.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "groups.group",
        populate: {
          path: "course",
          module: "Course",
        },
      });

    const tutionFees = students.reduce((list, student) => {
      const tutionFee = student.groups.map((item) => ({
        ...student.toObject(),
        groups: null,
        ...item.toObject(),
      }));

      return [...list, ...tutionFee];
    }, []);

    res.status(200).json({ tutionFees, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};
