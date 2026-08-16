import { Router } from "express";
import squadController from "../controllers/squad.controller.js";
import authenticate from "../../../shared/middlewares/auth.middleware.js";
import { validate } from "../../../shared/middlewares/validate.js";

import {
  createSquadSchema,
  updateSquadSchema,
} from "../../../validation/squad.schema.js";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createSquadSchema),
  squadController.create
);

router.get(
  "/companies/:companyId",
  authenticate,
  squadController.getAllByCompany
);

router.get(
  "/:id",
  authenticate,
  squadController.getById
);

router.patch(
  "/:id",
  authenticate,
  validate(updateSquadSchema),
  squadController.update
);

router.delete(
  "/:id",
  authenticate,
  squadController.delete
);

export default router;