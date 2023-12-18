import mongoose from "mongoose";

const Schema = mongoose.Schema;

const notificationSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["birthday", "count", "update-table", "fine"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    isViewedAdmins: {
      type: [
        {
          admin: {
            type: mongoose.Schema.Types.ObjectId,
          },
          viewed: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    isViewedTeachers: {
      type: [
        {
          teacher: {
            type: mongoose.Schema.Types.ObjectId,
          },
          viewed: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
    isViewedStudent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
