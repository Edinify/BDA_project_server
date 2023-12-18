import mongoose from "mongoose";

const Schema = mongoose.Schema;

const studentSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    motherName: {
      type: String,
    },
    fatherName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
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
    motherPhone: {
      type: String,
    },
    fatherPhone: {
      type: String,
    },
    emergencyPhone: {
      type: String,
    },
    role: {
      type: String,
      default: "student",
    },
    payment: {
      type: Number,
      required: true,
    },
    sector: {
      az: Boolean,
      en: Boolean,
      ru: Boolean,
    },
    whereFrom: {
      mainArea: String,
      part: String,
    },
    courses: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
        },
        lessonAmount: {
          type: Number,
          required: true,
        },
      },
    ],
    whereComing: {
      type: String,
      enum: ["instagram", "referral", "event", "externalAds", "other"],
      default: "other",
    },
    status: {
      type: Boolean,
      default: true,
    },
    educationalInstitution: {
      type: String,
    },
    educationDegree: {
      type: String,
    },
    healthStatus: {
      type: String,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    otp: Number,
  },
  { timestamps: true }
);

export const Student = mongoose.model("Student", studentSchema);
