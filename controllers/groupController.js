import { Group } from "../models/groupModel.js";
import { createLessons } from "./lessonController.js";
import { Student } from "../models/studentModel.js";
import { Lesson } from "../models/lessonModel.js";
import { Worker } from "../models/workerModel.js";

// Get groups
export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find().populate("teachers mentors");

    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get groups with course id
export const getGroupsWithCourseId = async (req, res) => {
  const { groupsCount, searchQuery, courseIds } = req.query;
  const currentDate = new Date();

  console.log(req.query);
  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");

    const groups = await Group.find({
      name: { $regex: regexSearchQuery },
      course: { $in: courseIds },
      // endDate: {
      //   $gte: currentDate,
      // },
    })
      .skip(parseInt(groupsCount || 0))
      .limit(parseInt(groupsCount || 0) + 30)
      .populate("teachers students course");

    const totalLength = await Group.countDocuments({
      name: { $regex: regexSearchQuery },
      course: { $in: courseIds },
      endDate: {
        $gte: currentDate,
      },
    });

    res.status(200).json({ groups, totalLength });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get groups with teacher id
export const getGroupsWithTeacherId = async (req, res) => {
  const { searchQuery, teacherId } = req.query;

  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");

    const groups = await Group.find({
      name: { $regex: regexSearchQuery },
      teachers: { $in: teacherId },
    }).populate("teachers mentors");

    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get groups for pagination
export const getGroupsForPagination = async (req, res) => {
  const { searchQuery, status, courseId, teacherId, mentorId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    let totalPages;
    let groups;
    const filterObj = { status };

    if (courseId) filterObj.course = courseId;

    if (teacherId) filterObj.teachers = teacherId;

    if (mentorId) filterObj.mentors = mentorId;

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");

      const groupsCount = await Group.countDocuments({
        name: { $regex: regexSearchQuery },
        ...filterObj,
      });

      groups = await Group.find({
        name: { $regex: regexSearchQuery },
        ...filterObj,
      })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("teachers students course mentors");

      totalPages = Math.ceil(groupsCount / limit);
    } else {
      const groupsCount = await Group.countDocuments(filterObj);
      totalPages = Math.ceil(groupsCount / limit);
      groups = await Group.find(filterObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("teachers students course mentors");
    }

    res.status(200).json({ groups, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create group
export const createGroup = async (req, res) => {
  const { name } = req.body;

  try {
    const regexName = new RegExp(name || "", "i");

    const existingGroup = await Group.findOne({
      name: { $regex: regexName },
    });

    if (name && existingGroup) {
      return res.status(409).json({ key: "group-already-exists" });
    }

    const newGroup = new Group(req.body);
    await newGroup.save();

    createLessons(newGroup);

    await Student.updateMany(
      { _id: { $in: newGroup.students } },
      { $push: { groups: { group: newGroup._id } } }
    );

    const groupsCount = await Group.countDocuments();
    const lastPage = Math.ceil(groupsCount / 10);

    res.status(201).json({ group: newGroup, lastPage });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Update group
export const updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const { id: userId, role } = req.user;
  let updatedData = req.body;

  try {
    const regexName = new RegExp(name || "", "i");

    const existingGroup = await Group.findOne({
      name: { $regex: regexName },
      _id: { $ne: id },
    });

    if (name && existingGroup) {
      return res.status(409).json({ key: "group-already-exists" });
    }

    if (role === "worker") {
      const worker = await Worker.findById(userId);

      const power = worker.profiles.find(
        (item) => item.profile === "groups"
      )?.power;

      console.log(power);

      if (power === "update") {
        delete updatedData.changes;

        const payload = new Group(updatedData);
        await payload.populate("teachers students course mentors");

        updatedData = { changes: payload.toObject() };

        const updatedGroup = await Group.findByIdAndUpdate(id, updatedData, {
          new: true,
        }).populate("teachers students course mentors");

        console.log(updatedGroup, "updated group");

        return res.status(200).json(updatedGroup);
      }
    }

    const oldGroup = await Group.findById(id);

    const updatedGroup = await Group.findByIdAndUpdate(id, req.body, {
      upsert: true,
      new: true,
      runValidators: true,
    }).populate("teachers students course mentors");

    if (!updatedGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    const studentsIds = updatedGroup.students.map((student) => student._id);

    await Student.updateMany(
      {
        _id: { $in: studentsIds },
        "groups.group": { $ne: updatedGroup._id },
      },
      { $push: { groups: { group: updatedGroup._id } } }
    );

    await Student.updateMany(
      {
        _id: { $nin: studentsIds },
        "groups.group": updatedGroup._id,
      },
      { $pull: { groups: { group: updatedGroup._id } } }
    );

    const addedStudentsIds = studentsIds.reduce(
      (students, id) =>
        !oldGroup.students.find((item) => item.toString() == id.toString())
          ? [...students, { student: id }]
          : students,
      []
    );

    const removedStudentsIds = oldGroup.students.reduce(
      (students, id) =>
        !studentsIds.find((item) => item.toString() == id.toString())
          ? [...students, id]
          : students,
      []
    );

    if (updatedGroup.teachers.length > 0) {
      await Lesson.updateMany(
        {
          group: updatedGroup._id,
          teacher: { $exists: false },
        },
        { teacher: updatedGroup.teachers[0]._id }
      );
    }

    if (updatedGroup.mentors.length > 0) {
      await Lesson.updateMany(
        {
          group: updatedGroup._id,
          mentor: { $exists: false },
        },
        { mentor: updatedGroup.mentors[0]._id }
      );
    }

    await Lesson.updateMany(
      { group: updatedGroup._id },
      { $push: { students: { $each: addedStudentsIds } } }
    );

    await Lesson.updateMany(
      { group: updatedGroup._id },
      { $pull: { students: { student: { $in: removedStudentsIds } } } }
    );

    const newGroup = await Group.findById(updatedGroup._id);

    createLessons(newGroup);

    res.status(200).json(updatedGroup);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete group
export const deleteGroup = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedGroup = await Group.findByIdAndDelete(id);

    if (!deletedGroup) {
      return res.status(404).json({ message: "group not found" });
    }

    await Lesson.deleteMany({
      group: deletedGroup._id,
    });

    await Student.updateMany(
      { _id: { $in: deletedGroup.students } },
      { $pull: { groups: { group: deletedGroup._id } } }
    );

    res.status(200).json(deletedGroup);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Confirm group changes
export const confirmGroupChanges = async (req, res) => {
  const { id } = req.params;
  const { changes } = req.body;

  try {
    const oldGroup = await Group.findById(id);

    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      { ...changes, changes: {} },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    ).populate("teachers students course mentors");

    if (!updatedGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    const studentsIds = updatedGroup.students.map((student) => student._id);

    await Student.updateMany(
      {
        _id: { $in: studentsIds },
        "groups.group": { $ne: updatedGroup._id },
      },
      { $push: { groups: { group: updatedGroup._id } } }
    );

    await Student.updateMany(
      {
        _id: { $nin: studentsIds },
        "groups.group": updatedGroup._id,
      },
      { $pull: { groups: { group: updatedGroup._id } } }
    );

    const addedStudentsIds = studentsIds.reduce(
      (students, id) =>
        !oldGroup.students.find((item) => item.toString() == id.toString())
          ? [...students, { student: id }]
          : students,
      []
    );

    const removedStudentsIds = oldGroup.students.reduce(
      (students, id) =>
        !studentsIds.find((item) => item.toString() == id.toString())
          ? [...students, id]
          : students,
      []
    );

    if (updatedGroup.teachers.length > 0) {
      await Lesson.updateMany(
        {
          group: updatedGroup._id,
          teacher: { $exists: false },
        },
        { teacher: updatedGroup.teachers[0]._id }
      );
    }

    if (updatedGroup.mentors.length > 0) {
      await Lesson.updateMany(
        {
          group: updatedGroup._id,
          mentor: { $exists: false },
        },
        { mentor: updatedGroup.mentors[0]._id }
      );
    }

    await Lesson.updateMany(
      { group: updatedGroup._id },
      { $push: { students: { $each: addedStudentsIds } } }
    );

    await Lesson.updateMany(
      { group: updatedGroup._id },
      { $pull: { students: { student: { $in: removedStudentsIds } } } }
    );

    const newGroup = await Group.findById(updatedGroup._id);

    createLessons(newGroup);

    res.status(200).json(updatedGroup);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Cancel group changes
export const cancelGroupChanges = async (req, res) => {
  const { id } = req.params;

  try {
    const group = await Group.findByIdAndUpdate(
      id,
      { changes: {} },
      { new: true }
    ).populate("teachers students course mentors");

    res.status(200).json(group);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
