import { Admin } from "../models/adminModel.js";
import { Teacher } from "../models/teacherModel.js";
import { Worker } from "../models/workerModel.js";
import bcrypt from "bcrypt";

// Create worker
export const createWorker = async (req, res) => {
  const { email, password } = req.body;

  try {
    const regexEmail = new RegExp(email, "i");

    const existingAdmin = await Admin.findOne({
      email: { $regex: regexEmail },
    });
    const existingWorker = await Worker.findOne({
      email: { $regex: regexEmail },
    });
    const existingTeacher = await Teacher.findOne({
      email: { $regex: regexEmail },
    });

    if (existingAdmin || existingWorker || existingTeacher) {
      return res.status(409).json({ key: "email-already-exist" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const worker = new Worker({ ...req.body, password: hashedPassword });
    await worker.save();

    const workersCount = await Worker.countDocuments();
    const lastPage = Math.ceil(workersCount / 10);

    res
      .status(201)
      .json({ worker: { ...worker.toObject(), password: "" }, lastPage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get workers
export const getWorkers = async (req, res) => {
  const { searchQuery } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    let totalPages;
    let workers;

    if (searchQuery && searchQuery.trim() !== "") {
      const regexSearchQuery = new RegExp(searchQuery, "i");

      const workersCount = await Worker.countDocuments({
        fullName: { $regex: regexSearchQuery },
      });

      workers = await Worker.find({
        fullName: { $regex: regexSearchQuery },
      })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-password");

      totalPages = Math.ceil(workersCount / limit);
    } else {
      const workersCount = await Worker.countDocuments();
      totalPages = Math.ceil(workersCount / limit);

      workers = await Worker.find()
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-password");
    }

    res.status(200).json({ workers, totalPages });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Update worker
export const updateWorker = async (req, res) => {
  const { id } = req.params;
  const { email, password } = req.body;
  let updatedData = req.body;

  try {
    const regexEmail = new RegExp(email, "i");
    console.log(regexEmail);
    console.log(email);

    const existingAdmin = await Admin.findOne({
      email: { $regex: regexEmail },
    });
    const existingWorker = await Worker.findOne({
      email: { $regex: regexEmail },
      _id: { $ne: id },
    });
    const existingTeacher = await Teacher.findOne({
      email: { $regex: regexEmail },
    });

    if (email && (existingTeacher || existingAdmin || existingWorker)) {
      return res.status(409).json({ key: "email-already-exist" });
    }

    if (password && password.length > 5) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updatedData.password = hashedPassword;
    } else {
      delete updatedData.password;
    }

    const updatedWorker = await Worker.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedWorker) {
      return res.status(404).json({ message: "Worker not found" });
    }

    res.status(200).json({ ...updatedWorker.toObject(), password: "" });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete worker
export const deleteWorker = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedWorker = await Worker.findByIdAndDelete(id);

    if (!deletedWorker) {
      return res.status(404).json({ message: "worker not found" });
    }

    res.status(200).json({ ...deletedWorker.toObject(), password: "" });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Update worker own password
export const updateWorkerOwnPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { id } = req.user;

  console.log(id, "worker id");
  try {
    const worker = await Worker.findById(id);

    if (!worker) {
      return res.status(404).json({ message: "worker not found." });
    }

    const isPasswordCorrect = await bcrypt.compare(
      oldPassword,
      worker.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({ key: "old-password-incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedWorker = await Worker.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );

    res.status(200).json({ message: "updated password" });
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

// Confirm changes

export const confirmChanges = async (req, res) => {
  const { id } = req.params;
  const { profile } = req.query;

  try {
    let targetData;

    if (profile === "teacher") {
      targetData = await Teacher.findById(id);
    }

    targetData.history = {};
    await targetData.save();

    res.status(200).json();
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};

export const cancelChanges = async (req, res) => {
  const { id } = req.params;
  const { profile } = req.query;
  const { history } = req.body;

  try {
    let targetData;

    if (profile === "teacher") {
      targetData = await Teacher.findByIdAndUpdate(id, {
        ...history,
        history: {},
      });
    }

    res.status(200).json();
  } catch (err) {
    res.status(500).json({ message: { error: err.message } });
  }
};
