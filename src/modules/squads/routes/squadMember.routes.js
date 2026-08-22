import { Router } from "express";

import squadMemberController from "../controllers/squadMember.controller.js";

import authenticate from "../../../shared/middlewares/auth.middleware.js";
import authorize from "../../../shared/middlewares/authorize.js";

const router = Router();

// Add member
router.post(
  "/:squadId/members",
  authenticate,
  authorize("ADMIN"),
  squadMemberController.addMember
);

// Get members
router.get(
  "/:squadId/members",
  authenticate,
  squadMemberController.getMembers
);

// Check membership
router.get(
  "/:squadId/members/:userId",
  authenticate,
  squadMemberController.checkMembership
);

// Remove member
router.delete(
  "/:squadId/members/:userId",
  authenticate,
  authorize("ADMIN"),
  squadMemberController.removeMember
);

export default router;