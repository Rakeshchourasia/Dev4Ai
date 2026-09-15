import { Router } from "express";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import squadAccess from "../../../shared/middlewares/squadAccess.middleware.js";

import activityController from "../controllers/activity.controller.js";

const router = Router();

// ------------------------------------------
// GET /activities/tickets/:ticketId
// Auth required. Squad access verified inside service
// (fetches ticket → squadId → checks membership)
// ------------------------------------------
router.get(
  ["/tickets/:ticketId", "/ticket/:ticketId"],
  authenticate,
  activityController.getTicketActivity
);

// ------------------------------------------
// GET /activities/squads/:squadId
// Auth required. Squad access verified by middleware
// ------------------------------------------
router.get(
  ["/squads/:squadId", "/squad/:squadId"],
  authenticate,
  squadAccess("squadId"),
  activityController.getSquadActivity
);

// ------------------------------------------
// GET /activities/sprints/:sprintId
// Auth required. Squad access verified inside service
// (fetches sprint → squadId → checks membership)
// ------------------------------------------
router.get(
  ["/sprints/:sprintId", "/sprint/:sprintId"],
  authenticate,
  activityController.getSprintActivity
);

export default router;
