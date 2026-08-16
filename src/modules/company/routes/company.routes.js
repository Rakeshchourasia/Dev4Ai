import { Router } from "express";
import companyController from "../controllers/company.controller.js";
import authenticate from "../../../shared/middlewares/auth.middleware.js";
import { validate } from "../../../shared/middlewares/validate.js";
import {
  createCompanySchema,
  updateCompanySchema,
} from "../../../validation/company.schema.js";
import authorize from "../../../shared/middlewares/authorize.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("admin"),
  validate(createCompanySchema),
  companyController.create
);


router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  validate(updateCompanySchema),
  companyController.update
);

router.get(
  "/",
  authenticate,
  companyController.getAll
);

router.get(
  "/:id",
  authenticate,
  companyController.getById
);

router.patch(
  "/:id",
  authenticate,
  companyController.update
);

router.delete(
  "/:id",
  authorize("admin"),
  authenticate,
  companyController.delete
);

export default router;