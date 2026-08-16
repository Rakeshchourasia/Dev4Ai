import { Router } from "express";
import ticketController from "../controllers/ticket.controller.js";
import authenticate from "../../../shared/middlewares/auth.middleware.js";
import { validate } from "../../../shared/middlewares/validate.js";

import {
  createTicketSchema,
  updateTicketSchema,
} from "../../../validation/ticket.schema.js";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createTicketSchema),
  ticketController.create
);

router.get(
  "/sprints/:sprintId",
  authenticate,
  ticketController.getAllBySprint
);

router.get(
  "/squads/:squadId",
  authenticate,
  ticketController.getAllBySquad
);

router.get(
  "/:id",
  authenticate,
  ticketController.getById
);

router.patch(
  "/:id",
  authenticate,
  validate(updateTicketSchema),
  ticketController.update
);

router.delete(
  "/:id",
  authenticate,
  ticketController.delete
);

export default router;