import { Router } from "express";

import ticketController from "../controllers/ticket.controller.js";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import squadAccess from "../../../shared/middlewares/squadAccess.middleware.js";

import { validate } from "../../../shared/middlewares/validate.js";
import { validateQuery } from "../../../shared/middlewares/validateQuery.js";

import {
  createTicketSchema,
  updateTicketSchema,
} from "../../../validation/ticket.schema.js";

import {
  ticketQuerySchema,
} from "../../../validation/ticket-query.schema.js";

import {
  updateTicketStatusSchema,
} from "../../../validation/ticket-status.schema.js";

import { validateParams } from "../../../shared/middlewares/validateParams.js";
import { ticketIdParamSchema } from "../../../validation/github-issue.schema.js";
import { linkTicketGithubPrSchema } from "../../../validation/github-pr.schema.js";
import githubIssueController from "../../github/controllers/githubIssue.controller.js";
import githubPrController from "../../github/controllers/githubPr.controller.js";


const router = Router();

// CREATE
router.post(
  "/",
  authenticate,
  validate(createTicketSchema),
  ticketController.create
);

// BY SQUAD
router.get(
  ["/squad/:squadId", "/squads/:squadId"],
  authenticate,
  squadAccess("squadId"),
  validateQuery(ticketQuerySchema),
  ticketController.getAllBySquad
);
// BY SPRINT
router.get(
  ["/sprint/:sprintId", "/sprints/:sprintId"],
  authenticate,
  validateQuery(ticketQuerySchema),
  ticketController.getAllBySprint
);
// BY ID
router.get(
  "/:id",
  authenticate,
  ticketController.getById
);

// UPDATE
router.patch(
  "/:id",
  authenticate,
  validate(updateTicketSchema),
  ticketController.update
);

// DELETE
router.delete(
  "/:id",
  authenticate,
  ticketController.delete
);

router.patch(
  "/:id/status",
  authenticate,
  validate(updateTicketStatusSchema),
  ticketController.updateStatus
);

// ==========================================
// GITHUB ISSUE LINKING
// ==========================================

router.get(
  "/:ticketId/github-issue",
  authenticate,
  validateParams(ticketIdParamSchema),
  githubIssueController.getLinkedIssue
);

router.delete(
  "/:ticketId/github-issue",
  authenticate,
  validateParams(ticketIdParamSchema),
  githubIssueController.unlinkIssue
);

// ==========================================
// GITHUB PULL REQUEST LINKING
// ==========================================

router.get(
  "/:ticketId/github-prs",
  authenticate,
  validateParams(ticketIdParamSchema),
  githubPrController.getTicketPrs
);

router.post(
  "/:ticketId/github-prs/link",
  authenticate,
  validateParams(ticketIdParamSchema),
  validate(linkTicketGithubPrSchema),
  githubPrController.linkPrToTicket
);

export default router;