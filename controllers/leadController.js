import { calcDate, calcDateWithMonthly } from "../calculate/calculateDate.js";
import { Course } from "../models/courseModel.js";
import { Lead } from "../models/leadModal.js";
import { Worker } from "../models/workerModel.js";

// Get leads for pagination
export const getLeadsForPagination = async (req, res) => {
  const { monthCount, startDate, endDate } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  console.log(req.query, "yyyyyyyyyyyyyyyyyyyyyyyy");

  try {
    let targetDate;

    if (monthCount) {
      targetDate = calcDate(monthCount);
    } else if (startDate && endDate) {
      targetDate = calcDateWithMonthly(startDate, endDate);
    }

    const leadsCount = await Lead.countDocuments({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });
    let totalPages = Math.ceil(leadsCount / limit);

    const leads = await Lead.find({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ date: 1 });

    res.status(200).json({ leads, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create lead
export const createLead = async (req, res) => {
  try {
    const targetDate = calcDate(1);

    const newLead = new Lead(req.body);
    await newLead.save();

    const leadsCount = await Lead.countDocuments({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });
    const lastPage = Math.ceil(leadsCount / 10);

    res.status(201).json({ lead: newLead, lastPage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update lead
export const updateLead = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedLead = await Lead.findByIdAndUpdate(id, req.body, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    if (!updatedLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json(updatedLead);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete lead
export const deleteLead = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedLead = await Lead.findByIdAndDelete(id);

    if (!deletedLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json(deletedLead);
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Confirm course changes
// export const confirmCourseChanges = async (req, res) => {
//   const { id } = req.params;
//   const { changes } = req.body;

//   try {
//     const course = await Course.findByIdAndUpdate(
//       id,
//       { ...changes, changes: {} },
//       { new: true }
//     );

//     if (!course) {
//       return res.status(404).json({ message: "Course not found" });
//     }

//     res.status(200).json(course);
//   } catch (err) {
//     res.status(500).json({ message: { error: err.message } });
//   }
// };

// Cancel course changes
// export const cancelCourseChanges = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const course = await Course.findByIdAndUpdate(
//       id,
//       { changes: {} },
//       { new: true }
//     );

//     res.status(200).json(course);
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ message: { error: err.message } });
//   }
// };
