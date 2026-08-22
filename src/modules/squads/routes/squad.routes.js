import { Router } from "express";

import squadController from "../controllers/squad.controller.js";

import authenticate from "../../../shared/middlewares/auth.middleware.js";

import { validate } from "../../../shared/middlewares/validate.js";

import { validateQuery } from "../../../shared/middlewares/validateQuery.js";

import {
  createSquadSchema,
  updateSquadSchema,
} from "../../../validation/squad.schema.js";

import {
  squadQuerySchema,
} from "../../../validation/squad-query.schema.js";

const router = Router();

// ==========================================
// CREATE SQUAD
// ==========================================

router.post(
  "/",
  authenticate,
  validate(createSquadSchema),
  squadController.create
);

// ==========================================
// GET SQUADS BY COMPANY
// ==========================================

router.get(
  "/companies/:companyId",
  authenticate,
  validateQuery(squadQuerySchema),
  squadController.getAllByCompany
);

// ==========================================
// GET SQUAD BY ID
// ==========================================

router.get(
  "/:id",
  authenticate,
  squadController.getById
);

// ==========================================
// UPDATE SQUAD
// ==========================================

router.patch(
  "/:id",
  authenticate,
  validate(updateSquadSchema),
  squadController.update
);

// ==========================================
// DELETE SQUAD
// ==========================================

router.delete(
  "/:id",
  authenticate,
  squadController.delete
);

export default router;