import { Router } from "express";
import companyController from "../controllers/company.controller.js";
import authenticate from "../../../shared/middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authenticate,
  companyController.create
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
  authenticate,
  companyController.delete
);

export default router;