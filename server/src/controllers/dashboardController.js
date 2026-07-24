import {
  getAdminDashboard,
  getStudentDashboard,
} from "../services/dashboardService.js";

export const adminDashboardController = async (req, res) => {
  const dashboard = await getAdminDashboard();

  res.status(200).json({
    success: true,
    data: {
      dashboard,
    },
  });
};

export const studentDashboardController = async (req, res) => {
  const dashboard = await getStudentDashboard(req.user);

  res.status(200).json({
    success: true,
    data: {
      dashboard,
    },
  });
};
