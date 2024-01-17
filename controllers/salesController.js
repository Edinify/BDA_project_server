import { calcDate, calcDateWithMonthly } from "../calculate/calculateDate.js";
import logger from "../config/logger.js";
import { Expense } from "../models/expenseModel.js";
import { Income } from "../models/incomeModel.js";
import { Lesson } from "../models/lessonModel.js";

export const getFinance = async (req, res) => {
  const { monthCount, startDate, endDate } = req.query;

  try {
    let targetDate;

    if (monthCount) {
      targetDate = calcDate(monthCount);
    } else if (startDate && endDate) {
      targetDate = calcDateWithMonthly(startDate, endDate);
    }

    console.log(startDate, endDate);
    console.log(targetDate, "--------");

    const incomes = await Income.find({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    const expenses = await Expense.find({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    const totalIncome = incomes.reduce(
      (total, income) => (total += income.amount),
      0
    );

    const totalExpense = expenses.reduce(
      (total, expense) => (total += expense.amount),
      0
    );

    const confirmedLessons = await Lesson.find({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
      role: "current",
      status: "confirmed",
    });

    const totalEarnings = confirmedLessons.reduce(
      (total, lesson) => total + lesson.earnings,
      0
    );

    const turnover = totalEarnings;

    const profit = turnover - totalExpense;

    const result = {
      income: totalIncome.toFixed(2),
      expense: totalExpense.toFixed(2),
      turnover: turnover.toFixed(2),
      profit: profit.toFixed(2),
    };

    res.status(200).json(result);
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      query: req.query,
      for: "GET FINANCE",
      user: req.user,
      functionName: getFinance.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};

export const getChartData = async (req, res) => {
  const { monthCount, startDate, endDate } = req.query;

  try {
    let targetDate;

    if (monthCount) {
      targetDate = calcDate(monthCount);
    } else if (startDate && endDate) {
      targetDate = calcDateWithMonthly(startDate, endDate);
    }

    const incomes = await Income.find({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    const expenses = await Expense.find({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
    });

    const confirmedLessons = await Lesson.find({
      date: {
        $gte: targetDate.startDate,
        $lte: targetDate.endDate,
      },
      role: "current",
      status: "confirmed",
    });

    const months = [];
    const chartIncome = [];
    const chartExpense = [];
    const chartTurnover = [];
    const chartProfit = [];

    while (targetDate.startDate <= targetDate.endDate) {
      const targetYear = targetDate.startDate.getFullYear();
      const targetMonth = targetDate.startDate.getMonth();

      const filteredIncomes = incomes.filter(
        (income) =>
          income.date?.getMonth() === targetMonth &&
          income.date?.getFullYear() === targetYear
      );

      const filteredExpenses = expenses.filter(
        (expense) =>
          expense.date?.getMonth() === targetMonth &&
          expense.date?.getFullYear() === targetYear
      );

      const filteredLessons = confirmedLessons.filter(
        (lesson) =>
          lesson.date?.getMonth() === targetMonth &&
          lesson.date?.getFullYear() === targetYear
      );

      const totalIncome = filteredIncomes.reduce(
        (total, income) => (total += income.amount),
        0
      );

      const totalExpense = filteredExpenses.reduce(
        (total, expense) => (total += expense.amount),
        0
      );

      const totalEarnings = filteredLessons.reduce(
        (total, lesson) => total + lesson.earnings,
        0
      );

      const turnover = totalEarnings;

      const profit = turnover - totalExpense;

      const monthName = new Intl.DateTimeFormat("en-US", {
        month: "long",
      }).format(targetDate.startDate);

      months.push({ month: monthName, year: targetYear });
      chartIncome.push(totalIncome.toFixed(2));
      chartExpense.push(totalExpense.toFixed(2));
      chartTurnover.push(turnover.toFixed(2));
      chartProfit.push(profit.toFixed(2));

      targetDate.startDate.setMonth(targetDate.startDate.getMonth() + 1);
    }

    res
      .status(200)
      .json({ months, chartIncome, chartExpense, chartTurnover, chartProfit });
  } catch (err) {
    logger.error({
      method: "GET",
      status: 500,
      message: err.message,
      query: req.query,
      for: "GET CHART DATA",
      user: req.user,
      functionName: getChartData.name,
    });
    res.status(500).json({ message: { error: err.message } });
  }
};
