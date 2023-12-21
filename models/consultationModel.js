import mongoose from "mongoose";

const Schema = mongoose.Schema;

const consultationSchema = new Schema(
  {
    contactDate: {
      type: Date,
      required: true,
    },
    consDate: {
      type: Date,
      required: true,
    },
    consTime: {
      type: String,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    studentPhone: {
      type: String,
      required: true,
    },
    course: {
      type: Object,
      required: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
    persona: {
      type: String,
      required: true,
    },
    whereComing: {
      type: String,
      // enum: ["instagram", "referral", "event", "externalAds", "other"],
      default: "other",
    },
    knowledge: {
      type: String,
      required: true,
    },
    cancelReason: {
      type: String,
    },
    addInfo: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["appointed", "sold", "cancelled", "thinks"],
      default: "appointed",
    },
  },
  { timestamps: true }
);

export const Consultation = mongoose.model("Consultation", consultationSchema);
