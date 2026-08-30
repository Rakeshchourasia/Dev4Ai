import { Router } from "express";

import sprintController from "../controllers/sprint.controller.js";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import authorize from "../../../shared/middlewares/authorize.js";

import { validate } from "../../../shared/middlewares/validate.js";
import { validateQuery } from "../../../shared/middlewares/validateQuery.js";

import {
  sprintQuerySchema,
} from "../../../validation/sprint-query.schema.js";

import {
  updateSprintStatusSchema,
} from "../../../validation/sprint-status.schema.js";

import {
  createSprintSchema,
  updateSprintSchema,
} from "../../../validation/sprint.schema.js";

const router = Router();

// ==========================================
// CREATE SPRINT
// ADMIN ONLY
// ==========================================

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createSprintSchema),
  sprintController.create
);

// ==========================================
// GET SPRINTS BY SQUAD
// ==========================================

router.get(
  "/squads/:squadId",
  authenticate,
  validateQuery(sprintQuerySchema),
  sprintController.getAllBySquad
);

// ==========================================
// UPDATE SPRINT STATUS
// ADMIN ONLY
// ==========================================

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  validate(updateSprintStatusSchema),
  sprintController.updateStatus
);

// ==========================================
// GET SPRINT BY ID
// ==========================================

router.get(
  "/:id",
  authenticate,
  sprintController.getById
);

// ==========================================
// UPDATE SPRINT
// ADMIN ONLY
// ==========================================

router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateSprintSchema),
  sprintController.update
);

// ==========================================
// DELETE SPRINT
// ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  sprintController.delete
);

export default router;