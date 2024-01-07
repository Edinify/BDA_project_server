import mongoose from "mongoose";

const Schema = mongoose.Schema;

const syllabusSchema = new Schema(
  {
    orderNumber: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    changes: {
      type: Object,
    },
  },
  { timestamps: true }
);

export const Syllabus = mongoose.model("Syllabus", syllabusSchema);
