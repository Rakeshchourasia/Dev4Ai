import { Router } from "express";

import ticketController from "../controllers/ticket.controller.js";

import authenticate from "../../../shared/middlewares/auth.middleware.js";

import { validate } from "../../../shared/middlewares/validate.js";

import { validateQuery } from "../../../shared/middlewares/validateQuery.js";

import {
  createTicketSchema,
  updateTicketSchema,
} from "../../../validation/ticket.schema.js";

import {
  ticketQuerySchema,
} from "../../../validation/ticket-query.schema.js";

const router = Router();

// ==========================================
// CREATE TICKET
// ==========================================

router.post(
  "/",
  authenticate,
  validate(createTicketSchema),
  ticketController.create
);

// ==========================================
// GET TICKETS BY SPRINT
// ==========================================

router.get(
  "/sprints/:sprintId",
  authenticate,
  validateQuery(ticketQuerySchema),
  ticketController.getAllBySprint
);

// ==========================================
// GET TICKETS BY SQUAD
// ==========================================

router.get(
  "/squads/:squadId",
  authenticate,
  validateQuery(ticketQuerySchema),
  ticketController.getAllBySquad
);

// ==========================================
// GET TICKET BY ID
// ==========================================

router.get(
  "/:id",
  authenticate,
  ticketController.getById
);

// ==========================================
// UPDATE TICKET
// ==========================================

router.patch(
  "/:id",
  authenticate,
  validate(updateTicketSchema),
  ticketController.update
);

// ==========================================
// DELETE TICKET
// ==========================================

router.delete(
  "/:id",
  authenticate,
  ticketController.delete
);

export default router;