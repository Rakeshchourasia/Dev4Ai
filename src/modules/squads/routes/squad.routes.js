import { Router } from "express";

import squadController from "../controllers/squad.controller.js";
import squadGithubRepoController from "../controllers/squadGithubRepo.controller.js";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import authorize from "../../../shared/middlewares/authorize.js";
import squadAccess from "../../../shared/middlewares/squadAccess.middleware.js";

import { validate } from "../../../shared/middlewares/validate.js";
import { validateQuery } from "../../../shared/middlewares/validateQuery.js";
import { validateParams } from "../../../shared/middlewares/validateParams.js";

import {
  createSquadSchema,
  updateSquadSchema,
} from "../../../validation/squad.schema.js";

import {
  squadQuerySchema,
} from "../../../validation/squad-query.schema.js";

import {
  linkSquadGithubRepoSchema,
  squadGithubRepoParamsSchema,
  deleteSquadGithubRepoParamsSchema,
} from "../../../validation/squad-github-repo.schema.js";

const router = Router();

// CREATE SQUAD
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createSquadSchema),
  squadController.create
);

// GET SQUADS BY COMPANY
router.get(
  "/companies/:companyId",
  authenticate,
  validateQuery(squadQuerySchema),
  squadController.getAllByCompany
);

// ==========================================
// SQUAD GITHUB REPOSITORIES
// ==========================================

// LINK REPOSITORY TO SQUAD
router.post(
  "/:squadId/github-repositories",
  authenticate,
  validateParams(squadGithubRepoParamsSchema),
  squadAccess("squadId"),
  validate(linkSquadGithubRepoSchema),
  squadGithubRepoController.linkRepository
);

// LIST SQUAD GITHUB REPOSITORIES
router.get(
  "/:squadId/github-repositories",
  authenticate,
  validateParams(squadGithubRepoParamsSchema),
  squadAccess("squadId"),
  squadGithubRepoController.listRepositories
);

// UNLINK GITHUB REPOSITORY FROM SQUAD
router.delete(
  "/:squadId/github-repositories/:id",
  authenticate,
  validateParams(deleteSquadGithubRepoParamsSchema),
  squadAccess("squadId"),
  squadGithubRepoController.deleteRepository
);

// GET SQUAD
router.get(
  "/:id",
  authenticate,
  squadAccess("id"),
  squadController.getById
);

// UPDATE
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateSquadSchema),
  squadController.update
);

// DELETE
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  squadController.delete
);

export default router;