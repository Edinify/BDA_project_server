import mongoose from "mongoose";

const Schema = mongoose.Schema;

const studentSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
    },
    fin: {
      type: String,
    },
    seria: {
      type: String,
    },
    birthday: {
      type: Date,
    },
    phone: {
      type: String,
    },
    role: {
      type: String,
      default: "student",
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    whereComing: {
      type: String,
      // enum: ["instagram", "referral", "event", "externalAds", "other"],
      default: "other",
    },
    whereSend: {
      type: String,
      // enum: ["instagram", "referral", "event", "externalAds", "other"],
      default: "other",
    },
    groups: [
      {
        group: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Group",
        },
        contractStartDate: {
          type: Date,
        },
        contractEndDate: {
          type: Date,
        },
        contractId: {
          type: Number,
        },
        paymentStartDate: {
          type: Date,
        },
        payment: {
          type: Object,
        },
        amount: {
          type: Number,
        },
        totalAmount: {
          type: Number,
        },
        discountReason: {
          type: String,
        },
        discount: {
          type: Number,
        },
        cvLink: {
          type: String,
        },
        portfolioLink: {
          type: String,
        },
        workStatus: {
          type: Array,
        },
        previousWorkPlace: {
          type: String,
        },
        previousWorkPosition: {
          type: String,
        },
        currentWorkPlace: {
          type: String,
        },
        currentWorkPosition: {
          type: String,
        },
        workStartDate: {
          type: Date,
        },
        diplomaStatus: {
          type: String,
          enum: ["noneDefensed", "defensed", "done", "awarded"],
          default: "noneDefensed",
        },
        diplomaDegree: {
          type: String,
          enum: ["certificate", "simple", "honor", "none"],
          default: "none",
        },
        diplomaDate: {
          type: Date,
        },
        payments: [
          {
            payment: {
              type: Number,
            },
            paymentDate: {
              type: Date,
            },
            status: {
              type: String,
              default: "wait",
              enum: ["wait", "paid"],
            },
          },
        ],
        paids: [
          {
            payment: {
              type: Number,
            },
            paymentDate: {
              type: Date,
            },
            confirmed: {
              type: Boolean,
              default: false,
            },
          },
        ],
        status: {
          type: String,
          default: "continue",
          enum: ["graduate", "continue", "stopped", "freeze"],
        },
        degree: {
          type: String,
        },
      },
    ],
    deleted: {
      type: Boolean,
      default: false,
    },
    changes: {
      type: Object,
    },
  },
  { timestamps: true }
);

studentSchema.index({ createdAt: 1 });

export const Student = mongoose.model("Student", studentSchema);
