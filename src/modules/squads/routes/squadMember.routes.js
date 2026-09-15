import { Router } from "express";

import squadMemberController from "../controllers/squadMember.controller.js";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import authorize from "../../../shared/middlewares/authorize.js";
import squadAccess from "../../../shared/middlewares/squadAccess.middleware.js";

import { validate } from "../../../shared/middlewares/validate.js";

import {
  addSquadMemberSchema,
  createSquadMemberSchema,
} from "../../../validation/squadMember.schema.js";

const router = Router();

// ==========================================
// MOUNTED UNDER /squad-members
// ==========================================

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createSquadMemberSchema),
  squadMemberController.addMember
);

router.delete(
  "/:squadId/:userId",
  authenticate,
  authorize("ADMIN"),
  squadMemberController.removeMember
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  squadMemberController.removeMember
);

// ==========================================
// MOUNTED UNDER /squads
// ==========================================

// ADD MEMBER (ADMIN ONLY)
router.post(
  "/:squadId/members",
  authenticate,
  authorize("ADMIN"),
  validate(addSquadMemberSchema),
  squadMemberController.addMember
);

// GET ALL MEMBERS (ADMIN OR SQUAD MEMBER)
router.get(
  "/:squadId/members",
  authenticate,
  squadAccess("squadId"),
  squadMemberController.getMembers
);

// CHECK MEMBERSHIP (ADMIN OR SQUAD MEMBER)
router.get(
  "/:squadId/members/:userId",
  authenticate,
  squadAccess("squadId"),
  squadMemberController.checkMembership
);

// REMOVE MEMBER (ADMIN ONLY)
router.delete(
  "/:squadId/members/:userId",
  authenticate,
  authorize("ADMIN"),
  squadMemberController.removeMember
);

export default router;