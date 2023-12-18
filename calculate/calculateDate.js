export const calcDate = (monthCount, start, end) => {
  if (monthCount) {
    monthCount = Number(monthCount);
    const startDate = new Date();
    const endDate = new Date();

    startDate.setMonth(startDate.getMonth() - (monthCount - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  } else if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }
};

export const calcDateWithMonthly = (start, end) => {
  let startDate;
  let endDate;

  if (start && end) {
    startDate = new Date(start);
    endDate = new Date(end);
  } else {
    startDate = new Date();
    endDate = new Date();
  }

  startDate.setDate(1);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(0);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};
