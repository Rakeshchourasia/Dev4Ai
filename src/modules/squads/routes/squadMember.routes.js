import { Router } from "express";

import squadMemberController from "../controllers/squadMember.controller.js";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import authorize from "../../../shared/middlewares/authorize.js";
import squadAccess from "../../../shared/middlewares/squadAccess.middleware.js";

import { validate } from "../../../shared/middlewares/validate.js";

import {
  addSquadMemberSchema,
} from "../../../validation/squad-member.schema.js";

const router = Router();

// ==========================================
// ADD MEMBER
// ADMIN ONLY
// ==========================================

router.post(
  "/:squadId/members",
  authenticate,
  authorize("ADMIN"),
  validate(addSquadMemberSchema),
  squadMemberController.addMember
);

// ==========================================
// GET ALL MEMBERS
// ADMIN OR SQUAD MEMBER
// ==========================================

router.get(
  "/:squadId/members",
  authenticate,
  squadAccess("squadId"),
  squadMemberController.getMembers
);

// ==========================================
// CHECK MEMBERSHIP
// ADMIN OR SQUAD MEMBER
// ==========================================

router.get(
  "/:squadId/members/:userId",
  authenticate,
  squadAccess("squadId"),
  squadMemberController.checkMembership
);

// ==========================================
// REMOVE MEMBER
// ADMIN ONLY
// ==========================================

router.delete(
  "/:squadId/members/:userId",
  authenticate,
  authorize("ADMIN"),
  squadMemberController.removeMember
);

export default router;