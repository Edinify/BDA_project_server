import mongoose from "mongoose";

const Schema = mongoose.Schema;

const courseSchema = new Schema(
  {
    name: {
      type: String,
      require: true,
      unique: true,
    },
    payments: [
      {
        paymentType: {
          type: String,
        },
        part: {
          type: Number,
        },
        payment: {
          type: Number,
        },
      },
    ],
  },
  { timestamps: true }
);

export const Course = mongoose.model("Course", courseSchema);
