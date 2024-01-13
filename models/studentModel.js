import mongoose from "mongoose";

const Schema = mongoose.Schema;

const studentSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
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
              enum: ["wait", "paid", "confirm", "cancel"],
            },
          },
        ],
        status: {
          type: Boolean,
          default: true,
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

export const Student = mongoose.model("Student", studentSchema);
