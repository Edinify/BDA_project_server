import mongoose from "mongoose";

const Schema = mongoose.Schema;

const teacherSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
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
      required: true,
    },
    seria: {
      type: String,
      required: true,
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    salary: {
      monthly: { type: Boolean, required: true },
      hourly: { type: Boolean, required: true },
      value: { type: Number, required: true },
    },
    status: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      default: "teacher",
    },
    phone: {
      type: String,
      required: true,
    },
    workExperience: {
      type: String,
      required: true,
    },
    maritalStatus: {
      type: String,
      required: true,
    },
    healthStatus: {
      type: String,
      required: true,
    },
    disability: {
      type: String,
      required: true,
    },
    sector: {
      az: Boolean,
      en: Boolean,
      ru: Boolean,
    },
    birthday: {
      type: Date,
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    otp: Number,
  },
  { timestamps: true }
);

export const Teacher = mongoose.model("Teacher", teacherSchema);
