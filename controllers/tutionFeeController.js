import { calcDate } from "../calculate/calculateDate.js";
import { Student } from "../models/studentModel.js";
import { v4 as uuidv4 } from "uuid";

//  Get paying students
async function getPayingStutdents() {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const payingStudents = await Student.aggregate([
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

// Get payment results
async function getPaymentsResults() {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const totalLatePaymentObj = await Student.aggregate([
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
    {
      $group: {
        _id: null,
        totalBalance: { $sum: "$balance" },
      },
    },
  ]);

  const totalLatePayment = totalLatePaymentObj[0].totalBalance.toFixed(2);

  return { totalLatePayment };
}

// get tution fees
export const getTutionFees = async (req, res) => {
  const { searchQuery, groupId, courseId, paymentStatus, length } = req.query;
  const limit = 10;

  try {
    const regexSearchQuery = new RegExp(searchQuery?.trim() || "", "i");
    const filterObj = {
      "groups.0": { $exists: true },
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

    const paymentsResults = await getPaymentsResults();

    res.status(200).json({
      tutionFees,
      currentLength: +length + students.length,
      paymentsResults,
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
