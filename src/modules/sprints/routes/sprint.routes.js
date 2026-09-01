import { Router } from "express";

import sprintController from "../controllers/sprint.controller.js";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import authorize from "../../../shared/middlewares/authorize.js";
import squadAccess from "../../../shared/middlewares/squadAccess.middleware.js";

import { validate } from "../../../shared/middlewares/validate.js";
import { validateQuery } from "../../../shared/middlewares/validateQuery.js";

import {
  createSprintSchema,
  updateSprintSchema,
  updateSprintStatusSchema,
} from "../../../validation/sprint.schema.js";

import {
  sprintQuerySchema,
} from "../../../validation/sprint-query.schema.js";

const router = Router();

// CREATE SPRINT
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createSprintSchema),
  sprintController.create
);

// GET SPRINTS BY SQUAD
router.get(
  "/squad/:squadId",
  authenticate,
  squadAccess("squadId"),
  validateQuery(sprintQuerySchema),
  sprintController.getAllBySquad
);

// GET SPRINT
router.get(
  "/:id",
  authenticate,
  sprintController.getById
);

// UPDATE SPRINT
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateSprintSchema),
  sprintController.update
);

// UPDATE STATUS
router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  validate(updateSprintStatusSchema),
  sprintController.updateStatus
);

// DELETE SPRINT
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  sprintController.delete
);

export default router;