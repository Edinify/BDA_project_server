import { calcDate } from "../calculate/calculateDate.js";
import { Student } from "../models/studentModel.js";
import { v4 as uuidv4 } from "uuid";

// get tution fees
export const getTutionFees = async (req, res) => {
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

    const tutionFees = students.reduce((list, student) => {
      const tutionFee = student.groups.map((item) => ({
        ...student.toObject(),
        groups: null,
        ...item.toObject(),
        studentId: student._id,
        _id: uuidv4(),
      }));

      return [...list, ...tutionFee];
    }, []);

    res.status(200).json({ tutionFees, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

export const updateTuitionFee = async (req, res) => {
  const { studentId, group, payments } = req.body;

  try {
    const student = await Student.findById(studentId);

    if (!student?.groups || student.groups.length === 0) {
      return res.status(200).json();
    }

    const targetStudentGroup = student.groups.find(
      (item) => item.group.toString() === group._id.toString()
    );

    if (
      !targetStudentGroup ||
      !targetStudentGroup.payments ||
      targetStudentGroup.payments.length === 0
    ) {
      return res.status(200).json();
    }

    targetStudentGroup.payments = payments;

    await student.save();

    console.log(student.groups[1].payments);

    res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
