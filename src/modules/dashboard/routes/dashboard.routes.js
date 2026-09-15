import { Router } from "express";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import squadAccess from "../../../shared/middlewares/squadAccess.middleware.js";

import dashboardController from "../controller/dashboard.controller.js";

const router = Router();

router.get(
  ["/squad/:squadId", "/squads/:squadId"],
  authenticate,
  squadAccess("squadId"),
  dashboardController.getSquadDashboard
);

router.get(
  ["/sprint/:sprintId", "/sprints/:sprintId"],
  authenticate,
  dashboardController.getSprintDashboard
);

export default router;