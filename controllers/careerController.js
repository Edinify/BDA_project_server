import { Student } from "../models/studentModel.js";
import { v4 as uuidv4 } from "uuid";

// Get careers
export const getCareers = async (req, res) => {
  const { searchQuery, courseId, groupId, length } = req.query;
  const limit = 10;

  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");
    const filterObj = {
      fullName: { $regex: regexSearchQuery },
      "groups.0": { $exists: true },
    };

    if (courseId) filterObj.courses = courseId;

    if (groupId) filterObj["groups.group"] = groupId;

    const students = await Student.find(filterObj)
      .skip(length || 0)
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
        studentId: student._id,
        _id: uuidv4(),
      }));

      return [...list, ...career];
    }, []);

    res.status(200).json({ careers, currentLength: +length + students.length });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

export const updateCareer = async (req, res) => {
  const {
    studentId,
    group,
    portfolioLink,
    cvLink,
    currentWorkPlace,
    currentWorkPosition,
    previousWorkPlace,
    previousWorkPosition,
    workStartDate,
    workStatus,
  } = req.body;

  console.log(req.body, "career body");

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

    targetStudentGroup.portfolioLink = portfolioLink;
    targetStudentGroup.cvLink = cvLink;
    targetStudentGroup.currentWorkPlace = currentWorkPlace;
    targetStudentGroup.currentWorkPosition = currentWorkPosition;
    targetStudentGroup.previousWorkPlace = previousWorkPlace;
    targetStudentGroup.previousWorkPosition = previousWorkPosition;
    targetStudentGroup.workStartDate = workStartDate;
    targetStudentGroup.workStatus = workStatus;

    await student.save();

    const targetGroup = student.groups.find(
      (item) => item.group.toString() === group._id.toString()
    );

    res.status(200).json({
      ...req.body,
      portfolioLink: targetGroup.portfolioLink,
      cvLink: targetGroup.cvLink,
      currentWorkPlace: targetGroup.currentWorkPlace,
      currentWorkPosition: targetGroup.currentWorkPosition,
      previousWorkPlace: targetGroup.previousWorkPlace,
      previousWorkPosition: targetGroup.previousWorkPosition,
      workStartDate: targetGroup.workStartDate,
      workStatus: targetGroup.workStatus,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
