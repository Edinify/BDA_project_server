import mongoose from "mongoose";

const Schema = mongoose.Schema;

const groupSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  teachers: [
    {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
  ],
  mentors: [
    {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
  ],
  students: [
    {
      type: Schema.Types.ObjectId,
      ref: "Student",
    },
  ],
  course: {
    type: Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  lessonDate: [
    {
      practical: {
        type: Boolean,
        default: false,
      },
      day: {
        type: Number,
        required: true,
      },
      time: {
        type: String,
        required: true,
      },
    },
  ],
  status: {
    type: String,
    enum: ["waiting", "current", "ended"],
    default: "waiting",
  },
  changes: {
    type: Object,
  },
});

export const Group = mongoose.model("Group", groupSchema);
