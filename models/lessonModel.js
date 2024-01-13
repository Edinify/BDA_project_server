import mongoose from "mongoose";

const Schema = mongoose.Schema;

const lessonSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    day: {
      type: Number,
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Group",
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    students: {
      type: [
        {
          student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
          },
          attendance: {
            type: Number,
            default: 0,
          },
        },
      ],
      required: true,
    },
    topic: {
      type: Object,
    },
    status: {
      type: String,
      enum: ["unviewed", "confirmed", "cancelled"],
      default: "unviewed",
    },
    history: {
      type: Object,
    },
  },
  { timestamps: true }
);

export const Lesson = mongoose.model("Lesson", lessonSchema);
