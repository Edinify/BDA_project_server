import mongoose from "mongoose";

const Schema = mongoose.Schema;

const consultationSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
    },
    contactDate: {
      type: Date,
      required: true,
    },
    constDate: {
      type: Date,
      required: true,
    },
    constTime: {
      type: String,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    studentPhone: {
      type: String,
    },
    course: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Course",
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
    persona: {
      type: String,
    },
    whereComing: {
      type: String,
      default: "other",
    },
    knowledge: {
      type: String,
    },
    cancelReason: {
      type: String,
    },
    addInfo: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "appointed",
        "sold",
        "cancelled",
        "thinks",
        "not-open-call",
        "call-missing",
        "whatsapp_info",
      ],
      default: "appointed",
    },
    changes: {
      type: Object,
    },
  },
  { timestamps: true }
);

consultationSchema.index({ contactDate: 1 });

export const Consultation = mongoose.model("Consultation", consultationSchema);
