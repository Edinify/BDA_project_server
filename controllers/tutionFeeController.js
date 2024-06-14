import { calcDate } from "../calculate/calculateDate.js";
import { Student } from "../models/studentModel.js";
import { v4 as uuidv4 } from "uuid";
import exceljs from "exceljs";
import moment from "moment";

//  Get paying students
async function getPayingStutdents() {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const payingStudents = await Student.aggregate([
    {
      $match: {
        deleted: false,
      },
    },
    {
      $project: {
        fullName: 1,
        groups: 1,
      },
    },
    {
      $addFields: {
        totalPayments: {
          $sum: {
            $map: {
              input: "$groups",
              as: "group",
              in: {
                $sum: {
                  $map: {
                    input: "$$group.payments",
                    as: "payment",
                    in: {
                      $cond: [
                        { $lte: ["$$payment.paymentDate", endOfDay] },
                        "$$payment.payment",
                        0,
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        totalPaids: {
          $sum: {
            $map: {
              input: "$groups",
              as: "group",
              in: {
                $ifNull: [
                  {
                    $sum: {
                      $map: {
                        input: {
                          $filter: {
                            input: "$$group.paids",
                            as: "paid",
                            cond: { $eq: ["$$paid.confirmed", true] },
                          },
                        },
                        as: "paid",
                        in: "$$paid.payment",
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        balance: { $subtract: ["$totalPayments", "$totalPaids"] },
      },
    },
    {
      $match: {
        balance: { $gt: 0 },
      },
    },
  ]);

  return payingStudents.map((item) => item._id);
}

// Get late payment
export const getLatePayment = async (req, res) => {
  const { monthCount, startDate, endDate, allDate } = req.query;

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  let targetDate = {
    endDate: endOfDay,
  };

  if (!allDate && (monthCount || startDate || endDate)) {
    targetDate = calcDate(monthCount, startDate, endDate);

    if (targetDate.endDate > endOfDay) {
      targetDate.endDate = endOfDay;
    }
  }

  try {
    const totalLatePaymentObj = await Student.aggregate([
      {
        $match: {
          deleted: false,
        },
      },
      {
        $project: {
          fullName: 1,
          groups: {
            $filter: {
              input: "$groups",
              as: "group",
              cond: { $in: ["$$group.status", ["graduate", "continue"]] },
            },
          },
        },
      },
      {
        $addFields: {
          totalPayments: {
            $sum: {
              $map: {
                input: "$groups",
                as: "group",
                in: {
                  $sum: {
                    $map: {
                      input: "$$group.payments",
                      as: "payment",
                      in: {
                        $cond: [
                          {
                            $and: [
                              {
                                $lte: [
                                  "$$payment.paymentDate",
                                  targetDate.endDate,
                                ],
                              },
                              {
                                $cond: [
                                  { $ifNull: [targetDate.startDate, false] },
                                  {
                                    $gte: [
                                      "$$payment.paymentDate",
                                      targetDate.startDate,
                                    ],
                                  },
                                  true,
                                ],
                              },
                            ],
                          },
                          "$$payment.payment",
                          0,
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          totalPaids: {
            $sum: {
              $map: {
                input: "$groups",
                as: "group",
                in: {
                  $ifNull: [
                    {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: "$$group.paids",
                              as: "paid",
                              cond: { $eq: ["$$paid.confirmed", true] },
                            },
                          },
                          as: "paid",
                          in: "$$paid.payment",
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          balance: { $subtract: ["$totalPayments", "$totalPaids"] },
        },
      },
      {
        $match: {
          balance: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
        },
      },
    ]);

    const totalLatePayment = totalLatePaymentObj[0].totalBalance.toFixed(2);

    res.status(200).json(totalLatePayment);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Get paid amount
export const getPaidAmount = async (req, res) => {
  const { monthCount, startDate, endDate, currentDay } = req.query;

  let targetDate = {};

  if (currentDay) {
    const currentStartDate = new Date();
    const currentEndDate = new Date();
    currentStartDate.setHours(0, 0, 0, 0);
    currentEndDate.setHours(23, 59, 59, 999);

    targetDate.startDate = currentStartDate;
    targetDate.endDate = currentEndDate;
  } else {
    targetDate = calcDate(monthCount, startDate, endDate);
  }

  try {
    const paidAmounts = await Student.aggregate([
      {
        $match: {
          deleted: false,
        },
      },
      {
        $project: {
          groups: 1,
        },
      },
      {
        $unwind: "$groups",
      },
      {
        $unwind: "$groups.paids",
      },
      {
        $match: {
          "groups.paids.confirmed": true,
          "groups.paids.paymentDate": {
            $gte: targetDate.startDate,
            $lte: targetDate.endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPaidAmount: { $sum: "$groups.paids.payment" },
        },
      },
      {
        $project: {
          _id: 0,
          totalPaidAmount: 1,
        },
      },
    ]);

    console.log(paidAmounts);

    res.status(200).json(paidAmounts.totalPaidAmount);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// get tution fees
export const getTutionFees = async (req, res) => {
  const { searchQuery, groupId, courseId, paymentStatus, length } = req.query;
  const limit = 20;

  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");
    const filterObj = {
      "groups.0": { $exists: true },
      deleted: false,
    };

    if (paymentStatus === "latePayment") {
      const payingStudentsIds = await getPayingStutdents();
      filterObj._id = { $in: payingStudentsIds };
    }

    if (groupId) filterObj["groups.group"] = groupId;

    if (courseId) filterObj.courses = courseId;

    const students = await Student.find({
      fullName: { $regex: regexSearchQuery },
      ...filterObj,
    })
      .skip(+length || 0)
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

    res.status(200).json({
      tutionFees,
      currentLength: +length + students.length,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

export const updateTuitionFee = async (req, res) => {
  const { studentId, group, paids } = req.body;

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

    const newPaids = student.groups.find(
      (item) => item.group.toString() === group._id.toString()
    )?.paids;

    res.status(200).json({ ...req.body, paids: newPaids });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};

// Export excel file
export const exportTuitionFeeExcel = async (req, res) => {
  const studentStatus = [
    { key: "graduate", value: "Məzun" },
    { key: "continue", value: "Davam edir" },
    { key: "stopped", value: "Dayandırdı" },
    { key: "freeze", value: "Dondurdu" },
  ];
  const headerStyle = {
    font: { bold: true },
  };

  try {
    const students = await Student.find({
      "groups.0": { $exists: true },
      deleted: false,
    }).populate({
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

    const workbook = new exceljs.Workbook();

    const sheet = workbook.addWorksheet("tuitionfee");

    sheet.columns = [
      { header: "Tələbə adı	", key: "fullName", width: 30 },
      { header: "Fin kod", key: "fin", width: 15 },
      { header: "Seria nömrəsi", key: "seria", width: 15 },
      { header: "Doğum tarixi", key: "birthday", width: 15 },
      { header: "Telefon nömrəsi", key: "phone", width: 20 },
      { header: "Qrup", key: "group", width: 20 },
      { header: "İxtisas", key: "course", width: 20 },
      { header: "Məbləğ", key: "amount", width: 8 },
      { header: "Yekun Məbləğ", key: "totalAmount", width: 15 },
      { header: "Yekun Qalıq", key: "totalRest", width: 15 },
      { header: "Endirim növü", key: "discountReason", width: 20 },
      { header: "Endirim", key: "discount", width: 10 },
      { header: "Ödənilib", key: "paid", width: 11 },
      { header: "Ödəniş növü", key: "paymentType", width: 20 },
      { header: "Cari ödəniş", key: "currentPayment", width: 15 },
      { header: "Status", key: "status", width: 20 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = headerStyle.font;
    });

    tutionFees.forEach((item) => {
      const currDate = new Date();
      currDate.setHours(23, 59, 59, 999);

      const totalConfirmedPayment = item?.paids?.reduce(
        (value, item) => value + parseFloat(item?.confirmed ? item.payment : 0),
        0
      );

      const beforePayments = item?.payments?.filter((item) => {
        const date = (item?.paymentDate && new Date(item.paymentDate)) || null;
        return date < currDate;
      });

      const totalBeforePayment = beforePayments.reduce(
        (total, item) => total + item.payment,
        0
      );

      const currPayment = +(totalBeforePayment - totalConfirmedPayment).toFixed(
        2
      );

      sheet.addRow({
        fullName: item?.fullName ? item.fullName : "",
        fin: item?.fin || "",
        seria: item?.seria || "",
        birthday: item?.birthday
          ? moment(item.birthday).format("DD.MM.YYYY")
          : "",
        phone: item?.phone || "",
        group: item?.group?.name || "",
        course: item?.group?.course?.name || "",
        amount: item?.amount || "",
        totalAmount: item?.totalAmount || "",
        totalRest:
          (item?.totalAmount || 0).toFixed(2) -
          totalConfirmedPayment.toFixed(2),
        discountReason: item?.discountReason || "",
        discount: item?.discount ? `${item.discount}%` : "",
        paid: totalConfirmedPayment > 0 ? totalConfirmedPayment : 0,
        paymentType: item?.payment?.paymentType || "",
        currentPayment: currPayment > 0 ? currPayment : 0,
        status:
          studentStatus.find((statusitem) => statusitem.key === item?.status)
            ?.value || "",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=tuitionfee.xlsx"
    );
    workbook.xlsx.write(res);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: { error: err.message } });
  }
};
