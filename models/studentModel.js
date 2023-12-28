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
        payments: [
          {
            paymentType: {
              type: String,
            },
            payment: {
              type: Number,
            },
            paymentDate: {
              type: Date,
            },
            paid: {
              type: Boolean,
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
        contractStartDate: {
          type: Date,
        },
        contractEndDate: {
          type: Date,
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
