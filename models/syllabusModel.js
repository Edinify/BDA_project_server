import mongoose from "mongoose";

const Schema = mongoose.Schema;

const syllabusSchema = new Schema(
  {
    orderNumber: {
      type: Number,
      unique: true,
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
  },
  { timestamps: true }
);

export const Syllabus = mongoose.model("Syllabus", syllabusSchema);
