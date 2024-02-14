import { calcDate } from "../calculate/calculateDate.js";
import { Student } from "../models/studentModel.js";
import { v4 as uuidv4 } from "uuid";

// get tution fees
export const getTutionFees = async (req, res) => {
  const { searchQuery, groupId, courseId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  console.log(req.query);
  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");
    const filterObj = {};

    if (groupId) filterObj["groups.group"] = groupId;

    if (courseId) filterObj.courses = courseId;

    const studentsCount = await Student.countDocuments({
      fullName: { $regex: regexSearchQuery },
      ...filterObj,
    });

    const totalPages = Math.ceil(studentsCount / limit);

    const students = await Student.find({
      fullName: { $regex: regexSearchQuery },
      ...filterObj,
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

    console.log(students);

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
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

export const updateTuitionFee = async (req, res) => {
  const { studentId, group, paids } = req.body;

  console.log(req.body);

  try {
    const student = await Student.findById(studentId);

    if (!student?.groups || student.groups.length === 0) {
      return res.status(200).json();
    }

    const targetStudentGroup = student.groups.find(
      (item) => item.group.toString() === group._id.toString()
    );

    if (!targetStudentGroup) {
      return res.status(200).json();
    }

    targetStudentGroup.paids = paids;

    await student.save();

    res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
