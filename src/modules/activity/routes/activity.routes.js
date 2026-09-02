import { Router } from "express";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import squadAccess from "../../../shared/middlewares/squadAccess.middleware.js";

import activityController from "../controllers/activity.controller.js";

const router = Router();

// Ticket activity
router.get(
  "/tickets/:ticketId",
  authenticate,
  activityController.getTicketActivity
);

// Squad activity
router.get(
  "/squads/:squadId",
  authenticate,
  squadAccess("squadId"),
  activityController.getSquadActivity
);

// Sprint activity
router.get(
  "/sprints/:sprintId",
  authenticate,
  activityController.getSprintActivity
);

export default router;
