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
    changes: {
      type: Object,
    },
  },
  { timestamps: true }
);

courseSchema.index({ createdAt: 1 });

export const Course = mongoose.model("Course", courseSchema);
