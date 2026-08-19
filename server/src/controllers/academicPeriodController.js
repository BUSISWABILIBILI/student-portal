import { getActiveAcademicPeriods } from "../services/academicPeriodService.js";

export const listActiveAcademicPeriodsController = async (_req, res) => {
  const academicPeriods = await getActiveAcademicPeriods();

  res.status(200).json({
    success: true,
    data: {
      academicPeriods,
    },
  });
};
