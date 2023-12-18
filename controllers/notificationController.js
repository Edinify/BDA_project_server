import { Admin } from "../models/adminModel.js";
import { Notification } from "../models/notificationModel.js";
import { Student } from "../models/studentModel.js";
import { Teacher } from "../models/teacherModel.js";

// CREATE NOTIFICATION

// Create notification for birthday
export const createNotificationForBirthdayWithCron = async () => {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 2);
  const currentDay = currentDate.getDate();
  const currentMonth = currentDate.getMonth() + 1;

  try {
    const birthdayStudents = await Student.find({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: "$birthday" }, currentDay] },
          { $eq: [{ $month: "$birthday" }, currentMonth] },
        ],
      },
      status: true,
    });

    const admins = await Admin.find();
    const teachers = await Teacher.find({ deleted: false, status: true });
    const adminsIdsList = admins.map((admin) => ({ admin: admin._id }));
    const teachersIdsList = teachers.map((teacher) => ({
      teacher: teacher._id,
    }));

    const notifications = birthdayStudents.map((student) => {
      return {
        role: "birthday",
        student: student._id,
        isViewedAdmin: adminsIdsList,
        isViewedTeacher: teachersIdsList,
      };
    });

    await Notification.insertMany(notifications);
  } catch (err) {
    console.log({ message: { error: err.message } });
  }
};

export const createNotificationForBirthdayAtCreateAndUpdateStudent = async (
  student
) => {
  const currFirstDate = new Date();
  const currSecondDate = new Date();
  const currThirdDate = new Date();
  const studentBirthday = new Date(student.birthday);
  currSecondDate.setDate(currSecondDate.getDate() + 1);
  currThirdDate.setDate(currThirdDate.getDate() + 2);
  const studentBirthdayDate = studentBirthday.getDate();
  const studentBirthdayMonth = studentBirthday.getMonth() + 1;

  await Notification.findOneAndDelete({
    student: student._id,
    role: "birthday",
  });

  if (
    (currFirstDate.getDate() === studentBirthdayDate &&
      currFirstDate.getMonth() + 1 === studentBirthdayMonth) ||
    (currSecondDate.getDate() === studentBirthdayDate &&
      currSecondDate.getMonth() + 1 === studentBirthdayMonth) ||
    (currThirdDate.getDate() === studentBirthdayDate &&
      currThirdDate.getMonth() + 1 === studentBirthdayMonth)
  ) {
    const admins = await Admin.find();
    const teachers = await Teacher.find({ deleted: false, status: true });
    const adminsIdsList = admins.map((admin) => ({ admin: admin._id }));
    const teachersIdsList = teachers.map((teacher) => ({
      teacher: teacher._id,
    }));

    await Notification.create({
      role: "birthday",
      student: student._id,
      isViewedAdmins: adminsIdsList,
      isViewedTeachers: teachersIdsList,
    });
  }
};

// Create notification for update table
export const createNotificationForUpdate = async (teacherId, students) => {
  try {
    const studentsIds = students.map((item) => item.student._id);

    await Notification.deleteMany({
      role: "update-table",
      $or: [
        {
          student: { $in: studentsIds },
          isViewedStudent: false,
        },
        {
          teacher: teacherId,
          "isViewedTeachers.viewed": false,
        },
      ],
    });

    const notifications = students.map((item) => ({
      role: "update-table",
      student: item.student._id,
    }));

    await Notification.create({
      role: "update-table",
      teacher: teacherId,
      isViewedTeachers: [{ teacher: teacherId }],
    });

    await Notification.insertMany(notifications);
  } catch (err) {
    console.log({ message: { error: err.message } });
  }
};

// Create notification for lesson count
export const createNotificationForLessonsCount = async (students) => {
  try {
    const completedCourseStudents = students.filter((student) =>
      student.courses.find(
        (item) => item.lessonAmount === 0 || item.lessonAmount === -1
      )
    );

    if (completedCourseStudents.length < 0) return true;

    const admins = await Admin.find();
    const adminsIdsList = admins.map((admin) => ({ admin: admin._id }));
    const studentsIdsList = completedCourseStudents.map(
      (student) => student._id
    );

    const newNotificationsList = completedCourseStudents.map((student) => ({
      role: "count",
      student: student._id,
      isViewedAdmins: adminsIdsList,
    }));

    await Notification.deleteMany({
      role: "count",
      student: { $in: studentsIdsList },
    });

    await Notification.insertMany(newNotificationsList);

    return true;
  } catch (err) {
    console.log({ message: { error: err.message } });
    return false;
  }
};

export const createNotificationForOneStudentLessonsCount = async (student) => {
  try {
    const countNotification = await Notification.findOne({
      role: "count",
      student: student._id,
    });

    if (countNotification) return true;

    const admins = await Admin.find();
    const adminsIdsList = admins.map((admin) => ({ admin: admin._id }));

    await Notification.create({
      role: "count",
      student: student._id,
      isViewedAdmins: adminsIdsList,
    });

    return true;
  } catch (err) {
    console.log({ message: { error: err.message } });
    return false;
  }
};

// Create notification for teacher fine
export const createNotificationForTeacherFine = async (teacherId) => {
  try {
    await Notification.create({
      role: "fine",
      teacher: teacherId,
      isViewedTeachers: [{ teacher: teacherId }],
    });
  } catch (err) {
    console.log({ message: { error: err.message } });
    return false;
  }
};

// GET NOTIFICATIONS

// Get notifications for admin
export const getNotificationsForAdmin = async (req, res) => {
  try {
    const notifications = await Notification.find({
      role: { $in: ["birthday", "count"] },
    })
      .select("isViewedAdmins role createdAt")
      .populate({ path: "student", select: "fullName createdAt birthday" });

    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get notifications for teacher
export const getNotificationsForTeacher = async (req, res) => {
  const { id } = req.user;
  try {
    const notifications = await Notification.find({
      $or: [
        { role: "birthday" },
        {
          role: "update-table",
          teacher: id,
        },
      ],
    })
      .select("role isViewedTeachers createdAt")
      .populate({ path: "student", select: "fullName birthday" });

    console.log(notifications);
    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get notifications for student
export const getNotificationsForStudent = async (req, res) => {
  const { id } = req.user;
  try {
    const notifications = await Notification.find({
      role: { $in: ["count", "update-table"] },
      student: id,
    }).select("role isViewedStudent createdAt");

    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// DELETE NOTIFICATIONS

// Delete notification for lesson count
export const deleteNotificationForLessonCount = async (students) => {
  try {
    const studentsIds = students.filter((student) =>
      student.courses.find((item) => item.lessonAmount === 1)
    );

    await Notification.deleteMany({
      student: { $in: studentsIds },
      role: "count",
    });

    return true;
  } catch (err) {
    console.log({ message: { error: err.message } });
    return false;
  }
};

export const deleteNotificationForOneStudentLessonCount = async (student) => {
  try {
    await Notification.findOneAndDelete({
      student: student._id,
      role: "count",
    });

    return true;
  } catch (err) {
    console.log({ message: { error: err.message } });
    return false;
  }
};

// delete notification for update table
export const deleteNotificationForUpdateTable = async () => {
  try {
    await Notification.deleteMany({
      role: "update-table",
    });
  } catch (err) {
    console.log({ message: { error: err.message } });
  }
};

// Delete notification for birthday
export const deleteNotificationsForBirthday = async () => {
  const currDate = new Date();
  currDate.setDate(currDate.getDate() - 7);

  try {
    const students = await Student.find({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: "$birthday" }, currDate.getDate()] },
          { $eq: [{ $month: "$birthday" }, currDate.getMonth() + 1] },
        ],
      },
      status: true,
    })
      .select("_id")
      .lean();

    const studentsId = students.map((student) => student._id);

    await Notification.deleteMany({
      student: { $in: studentsId },
      role: "birthday",
    });
  } catch (err) {
    console.log({ message: { error: err.message } });
  }
};

// Do as notification seen
export const doAsNotificationsSeen = async (req, res) => {
  const { role, id } = req.user;

  try {
    let updatedNotifications;

    if (role === "admin" || role === "super-admin") {
      updatedNotifications = await Notification.updateMany(
        {
          role: { $in: ["count", "birthday"] },
          "isViewedAdmins.viewed": false,
          "isViewedAdmins.admin": id,
        },
        {
          $set: {
            "isViewedAdmins.$.viewed": true,
          },
        },
        { new: true }
      );
    } else if (role === "teacher") {
      updatedNotifications = await Notification.updateMany(
        {
          role: { $in: ["update-table", "birthday"] },
          "isViewedTeachers.viewed": false,
          "isViewedTeachers.teacher": id,
        },
        {
          $set: {
            "isViewedTeachers.$.viewed": true,
          },
        },
        { new: true }
      );
    } else if (role === "student") {
      updatedNotifications = await Notification.updateMany(
        { student: id, role: { $in: ["count", "update-table"] } },
        {
          isViewedStudent: true,
        },
        { new: true }
      );
    }

    res.status(200).json(updatedNotifications);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};
