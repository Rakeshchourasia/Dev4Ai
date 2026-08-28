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

// ==========================================
// CREATE COMPANY
// ==========================================

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createCompanySchema),
  companyController.create
);

// ==========================================
// GET ALL COMPANIES
// ==========================================

router.get(
  "/",
  authenticate,
  validateQuery(companyQuerySchema),
  companyController.getAll
);

// ==========================================
// GET COMPANY BY ID
// ==========================================

router.get(
  "/:id",
  authenticate,
  companyController.getById
);

// ==========================================
// UPDATE COMPANY
// ==========================================

router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateCompanySchema),
  companyController.update
);

// ==========================================
// DELETE COMPANY
// ==========================================

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  companyController.delete
);

export default router;