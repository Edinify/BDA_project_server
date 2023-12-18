import { calcDate } from "../calculate/calculateDate.js";
import logger from "../config/logger.js";
import { Expense } from "../models/expenseModel.js";

// Get expenses for pagination
export const getExpensesForPagination = async (req, res) => {
  const { monthCount, startDate, endDate, category, sort } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  const targetDate = calcDate(monthCount, startDate, endDate);

  try {
    let totalPages;
    let expenses;

    const filterObj = {
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    };
    const sortObj = {};

    if (sort === "lowestAmount") sortObj.amount = 1;

    if (sort === "highestAmount") sortObj.amount = -1;

    if (sort === "latest") sortObj.date = -1;

    if (sort === "oldest") sortObj.date = 1;

    if (category) {
      filterObj.category = category;
    }

    const expensesCount = await Expense.countDocuments(filterObj);

    totalPages = Math.ceil(expensesCount / limit);

    expenses = await Expense.find(filterObj)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ expenses, totalPages });
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      query: req.query,
      for: "GET EXPENSES FOR PAGINATION",
      user: req.user,
      functionName: getExpensesForPagination.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

// Create expense
export const createExpense = async (req, res) => {
  try {
    const newExpense = new Expense(req.body);
    await newExpense.save();

    const expensesCount = await Expense.countDocuments();
    const lastPage = Math.ceil(expensesCount / 10);

    res.status(201).json({ expense: newExpense, lastPage });
  } catch (err) {
    logger.error({
      method: "POST",
      status: 500,
      message: err.message,
      posteData: req.body,
      for: "CREATE EXPENSE",
      user: req.user,
      functionName: createExpense.name,
    });
    res.status(500).json({ error: err.message });
  }
};

// Update expense
export const updateExpense = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedExpense = await Expense.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json(updatedExpense);
  } catch (err) {
    logger.error({
      method: "PATCH",
      status: 500,
      message: err.message,
      expenseId: id,
      for: "UPDATE EXPENSE",
      user: req.user,
      functionName: updateExpense.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

// Delete expense
export const deleteExpense = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedExpense = await Expense.findByIdAndDelete(id);

    if (!deletedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json({ message: "Expense successfully deleted" });
  } catch (err) {
    logger.error({
      method: "DELETE",
      status: 500,
      message: err.message,
      expenseId: id,
      for: "DELETE EXPENSE",
      user: req.user,
      functionName: deleteExpense.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};
