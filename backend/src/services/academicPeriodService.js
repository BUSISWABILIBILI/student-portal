import { findActiveAcademicPeriods } from "../repositories/academicPeriodRepository.js";

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
};

const isDateWithinRange = (date, startDate, endDate) => {
  if (!startDate || !endDate) {
    return false;
  }

  const currentDate = new Date(date);
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);

  return currentDate >= start && currentDate <= end;
};

const formatAcademicPeriod = (period) => {
  const registrationStartDate = formatDate(period.registration_start_date);
  const registrationEndDate = formatDate(period.registration_end_date);

  return {
    id: period.id,
    name: period.name,
    academicYear: period.academic_year,
    startDate: formatDate(period.start_date),
    endDate: formatDate(period.end_date),
    registrationStartDate,
    registrationEndDate,
    isActive: Boolean(period.is_active),
    registrationOpen: Boolean(period.is_active) &&
      isDateWithinRange(new Date(), registrationStartDate, registrationEndDate),
  };
};

export const getActiveAcademicPeriods = async () => {
  const academicPeriods = await findActiveAcademicPeriods();

  return academicPeriods.map(formatAcademicPeriod);
};
