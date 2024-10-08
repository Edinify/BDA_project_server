import mongoose from "mongoose";
import { Consultation } from "../models/consultationModel.js";
import { Student } from "../models/studentModel.js";
import { Syllabus } from "../models/syllabusModel.js";
import { Worker } from "../models/workerModel.js";
import { Group } from "../models/groupModel.js";
import { calcDate } from "../calculate/calculateDate.js";
import exceljs from "exceljs";
import moment from "moment-timezone";

// Get consultations for pagination
export const getConsultationsForPagination = async (req, res) => {
  const {
    searchQuery,
    status,
    length,
    startDate,
    endDate,
    whereComing,
    courseId,
    phone,
  } = req.query;
  const limit = 20;

  try {
    let totalLength;
    let consultations;
    let filterObj = {};

    if (status) {
      filterObj.status = status;
    }

    if (startDate && endDate) {
      const targetDate = calcDate(null, startDate, endDate);
      console.log(targetDate, "target date in consultation");
      filterObj.contactDate = {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      };
    }

    if (courseId) {
      filterObj.course = courseId;
    }

    if (whereComing) {
      filterObj.whereComing = whereComing;
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");
      filterObj.studentName = { $regex: regexSearchQuery };
    }
    if (phone && phone.trim() !== "") {
      const regexSearchQuery = new RegExp(phone.replace(/\s+/g, ""), "i");
      filterObj.studentPhone = { $regex: regexSearchQuery };
    }

    const consultationsCount = await Consultation.countDocuments(filterObj);
    totalLength = consultationsCount;
    consultations = await Consultation.find(filterObj)
      .skip(length || 0)
      .limit(limit)
      .populate("course teacher group")
      .sort({ contactDate: -1 });

    res.status(200).json({ consultations, totalLength });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create consultations
export const createConsultation = async (req, res) => {
  const newData = req.body;
  delete newData.group;
  try {
    const newConsultation = new Consultation(newData);
    newConsultation.populate("course teacher");
    await newConsultation.save();

    res.status(201).json(newConsultation);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Update consultation
export const updateConsultation = async (req, res) => {
  // const session = await mongoose.startSession();
  // session.startTransaction();

  const { id } = req.params;
  const { id: userId, role } = req.user;
  let updatedData = req.body;

  try {
    if (role === "worker") {
      const worker = await Worker.findById(userId);
      // .session(session);

      const power = worker.profiles.find(
        (item) => item.profile === "consultation"
      )?.power;

      if (power === "update") {
        delete updatedData.changes;

        const payload = new Consultation(updatedData);
        await payload.populate("course teacher");
        // .session(session);

        updatedData = { changes: payload.toObject() };
      }
    }

    if (!updatedData?.group || updatedData?.group === "newGroup")
      delete updatedData.group;

    let updatedConsultation = await Consultation.findByIdAndUpdate(
      id,
      updatedData,
      {
        new: true,
        runValidators: true,
        // session: session,
      }
    ).populate("course teacher group");

    if (!updatedConsultation) {
      // await session.abortTransaction();
      // session.endSession();
      return res.status(404).json({ message: "Consultation not found" });
    }

    const existingStudent = await Student.findOne({
      fin: updatedConsultation.fin,
    });
    // .session(session);

    if (updatedConsultation.status === "sold" && !existingStudent) {
      const studentData = {
        fullName: updatedConsultation.studentName,
        courses: [updatedConsultation.course._id],
        fin: updatedConsultation.fin,
      };

      const newStudent = new Student(studentData);
      await newStudent.save(); //{ session: session }

      await Consultation.findByIdAndUpdate(
        updatedConsultation._id,
        {
          studentId: newStudent._id,
        }
        // { session: session }
      );

      let targetGroup;

      if (updatedData?.group) {
        targetGroup = await Group.findOne({
          _id: updatedData.group._id,
          course: updatedConsultation.course,
          status: "waiting",
          $expr: {
            $lt: [{ $size: "$students" }, 18],
          },
        });
        // .session(session);
      }

      if (targetGroup) {
        targetGroup.students.push(newStudent._id);

        await targetGroup.save(); //{ session: session }
        await Student.findByIdAndUpdate(
          newStudent._id,
          {
            $push: {
              groups: {
                group: targetGroup._id,
              },
            },
          }
          // { session: session }
        );
      } else {
        const lastGroup = await Group.findOne({
          course: updatedConsultation.course,
        }).sort({ groupNumber: -1 });
        // .session(session);

        let newGroupName = "";

        for (let i = 0; i < lastGroup.name.length; i++) {
          if (isNaN(lastGroup.name[i]) || lastGroup.name[i] === " ") {
            newGroupName += lastGroup.name[i];
          }
        }

        newGroupName += lastGroup.groupNumber + 1;

        lastGroup.name.split(`${lastGroup.groupNumber}`)[0] +
          (lastGroup.groupNumber + 1);

        const newGroup = new Group({
          name: newGroupName,
          groupNumber: lastGroup.groupNumber + 1,
          course: updatedConsultation.course._id,
          students: [newStudent._id],
        });

        await newGroup.save(); //{ session: session }

        await Student.findByIdAndUpdate(
          newStudent._id,
          {
            $push: {
              groups: {
                group: newGroup._id,
              },
            },
          }
          // { session: session }
        );

        updatedConsultation = await Consultation.findByIdAndUpdate(
          id,
          { group: newGroup._id },
          {
            new: true,
            runValidators: true,
            // session: session,
          }
        ).populate("course teacher group");
      }
    }

    // await session.commitTransaction();
    // session.endSession();

    res.status(200).json(updatedConsultation);
  } catch (err) {
    console.log(err, "main error", err.message);
    // await session.abortTransaction();
    // session.endSession();
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete consultation
export const deleteConsultation = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedConsultation = await Consultation.findByIdAndDelete(id);

    if (!deletedConsultation) {
      return res.status(404).json({ message: "consultation not found" });
    }

    res.status(200).json(deletedConsultation);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Confirm consultation changes
export const confirmConsultationChanges = async (req, res) => {
  const { id } = req.params;
  const { changes } = req.body;

  try {
    const consultation = await Consultation.findByIdAndUpdate(
      id,
      { ...changes, changes: {} },
      { new: true }
    ).populate("course teacher");

    if (!consultation) {
      return res.status(404).json({ message: "Counsultation not found" });
    }

    res.status(200).json(consultation);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Cancel consultation changes
export const cancelConsultationChanges = async (req, res) => {
  const { id } = req.params;

  try {
    const consultation = await Consultation.findByIdAndUpdate(
      id,
      { changes: {} },
      { new: true }
    ).populate("course teacher");

    res.status(200).json(consultation);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Export excel file
export const exportConsultationsExcel = async (req, res) => {
  const {
    consultationSearchValues,
    consultationPhoneSearchValues,
    startDate,
    endDate,
    status,
    courseId,
    whereComing,
  } = req.query;

  console.log(req.query);

  const whereComingList = [
    { name: "İnstagram Sponsorlu", key: "instagramSponsor" },
    { name: "İnstagram standart", key: "instagramStandart" },
    { name: "İnstruktor Tövsiyyəsi", key: "instructorRecommend" },
    { name: "Dost Tövsiyyəsi", key: "friendRecommend" },
    { name: "Sayt", key: "site" },
    { name: "Tədbir", key: "event" },
    { name: "AİESEC", key: "AİESEC" },
    { name: "PO COMMUNİTY", key: "POCOMMUNİTY" },
    { name: "Köhnə tələbə", key: "oldStudent" },
    { name: "Staff tövsiyyəsi", key: "staffRecommend" },
    { name: "SMS REKLAMI", key: "smsAd" },
    { name: "PROMOKOD", key: "promocode" },
    { name: "Resale", key: "resale" },
  ];

  const constStatusList = [
    { name: "Konsultasiya istəyir", key: "appointed" },
    { name: "Satıldı", key: "sold" },
    { name: "İmtina", key: "cancelled" },
    { name: "Düşünür", key: "thinks" },
    { name: "Zəngi açmadı", key: "not-open-call" },
    { name: "Zəng çatmır", key: "call-missing" },
    { name: "Whatsappda məlumat", key: "whatsapp_info" },
  ];

  const headerStyle = {
    font: { bold: true },
  };

  try {
    const filterObj = {};

    if (status) {
      filterObj.status = status;
    }

    if (startDate && endDate) {
      const targetDate = calcDate(null, startDate, endDate);
      console.log(targetDate, "target date in consultation in excel");
      filterObj.contactDate = {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      };
    }

    if (courseId) {
      filterObj.course = courseId;
    }

    if (whereComing) {
      filterObj.whereComing = whereComing;
    }

    if (consultationSearchValues && consultationSearchValues.trim() !== "") {
      const regexSearchQuery = new RegExp(consultationSearchValues, "i");
      filterObj.studentName = { $regex: regexSearchQuery };
    }
    if (
      consultationPhoneSearchValues &&
      consultationPhoneSearchValues.trim() !== ""
    ) {
      const regexSearchQuery = new RegExp(consultationPhoneSearchValues, "i");
      filterObj.studentPhone = { $regex: regexSearchQuery };
    }
    const consultations = await Consultation.find(filterObj)
      .populate("course group teacher")
      .sort({ contactDate: -1 });

    const workbook = new exceljs.Workbook();

    const sheet = workbook.addWorksheet("consultations");

    sheet.columns = [
      { header: "Tələbə adı	", key: "studentName", width: 30 },
      { header: "Fin kod", key: "fin", width: 15 },
      { header: "Telefon nömrəsi", key: "studentPhone", width: 20 },
      { header: "İxtisas", key: "course", width: 20 },
      { header: "Qrup", key: "group", width: 20 },
      { header: "Müəllim", key: "teacher", width: 30 },
      { header: "Bizi haradan eşidiblər", key: "whereComing", width: 30 },
      { header: "Əlaqə tarixi", key: "contactDate", width: 30 },
      { header: "Konsultasiya tarixi", key: "constDate", width: 30 },
      { header: "Konsultasiya saatı", key: "constTime", width: 30 },
      { header: "Əlavə məlumat", key: "addInfo", width: 70 },
      { header: "Status", key: "status", width: 30 },
      { header: "Ləğv səbəbi", key: "cancelReason", width: 50 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = headerStyle.font;
    });

    consultations.forEach((consultation) => {
      sheet.addRow({
        studentName: consultation?.studentName || "",
        fin: consultation?.fin || "",
        studentPhone: consultation?.studentPhone || "",
        course: consultation?.course?.name || "",
        group: consultation?.group?.name || "",
        teacher: consultation?.teacher?.fullName || "",
        whereComing:
          whereComingList.find((item) => item.key === consultation?.whereComing)
            ?.name || "",
        contactDate: consultation?.contactDate
          ? moment(consultation.contactDate).format("DD.MM.YYYY")
          : "",
        constDate: consultation?.constDate
          ? moment(consultation.constDate).format("DD.MM.YYYY")
          : "",
        constTime: consultation.constTime || "",
        addInfo: consultation?.addInfo || "",
        status:
          constStatusList.find((item) => item.key === consultation.status)
            ?.name || "",
        cancelReason: consultation?.cancelReason || "",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=consultations.xlsx"
    );
    workbook.xlsx.write(res);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
