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
  students: [
    {
      type: Schema.Types.ObjectId,
      ref: "Student",
    },
  ],
  course: {
    type: Schema.Types.ObjectId,
    ref: "Course",
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  lessonDate: [
    {
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
});

export const Group = mongoose.model("Group", groupSchema);
