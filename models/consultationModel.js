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
    },
    constTime: {
      type: String,
    },
    studentName: {
      type: String,
      required: function () {
        return this.status === "sold";
      },
    },
    studentPhone: {
      type: String,
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      required: function () {
        return this.status === "sold";
      },
      ref: "Course",
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
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
    cancelReason: {
      type: String,
    },
    changes: {
      type: Object,
    },
  },
  { timestamps: true }
);

consultationSchema.index({ contactDate: 1 });

export const Consultation = mongoose.model("Consultation", consultationSchema);
