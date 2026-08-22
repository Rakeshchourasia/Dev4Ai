import { Router } from "express";
import sprintController from "../controllers/sprint.controller.js";
import authenticate from "../../../shared/middlewares/auth.middleware.js";
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

router.post(
  "/",
  authenticate,
  validate(createSprintSchema),
  sprintController.create
);

router.get(
  "/squads/:squadId",
  authenticate,
  validateQuery(sprintQuerySchema),
  sprintController.getAllBySquad
);

router.patch(
  "/:id/status",
  authenticate,
  validate(updateSprintStatusSchema),
  sprintController.updateStatus
);

router.get(
  "/:id",
  authenticate,
  sprintController.getById
);

router.patch(
  "/:id",
  authenticate,
  validate(updateSprintSchema),
  sprintController.update
);

router.delete(
  "/:id",
  authenticate,
  sprintController.delete
);

export default router;