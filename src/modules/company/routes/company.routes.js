import { Router } from "express";

import companyController from "../controllers/company.controller.js";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import authorize from "../../../shared/middlewares/authorize.js";

import { validate } from "../../../shared/middlewares/validate.js";
import { validateQuery } from "../../../shared/middlewares/validateQuery.js";

import {
  createCompanySchema,
  updateCompanySchema,
} from "../../../validation/company.schema.js";

import {
  companyQuerySchema,
} from "../../../validation/company-query.schema.js";

const router = Router();

// CREATE
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createCompanySchema),
  companyController.create
);

// GET ALL
router.get(
  "/",
  authenticate,
  validateQuery(companyQuerySchema),
  companyController.getAll
);

// GET BY ID
router.get(
  "/:id",
  authenticate,
  companyController.getById
);

// UPDATE
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateCompanySchema),
  companyController.update
);

// DELETE
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  companyController.delete
);

export default router;