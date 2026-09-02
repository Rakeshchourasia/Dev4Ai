import squadMemberRepository from "../repositories/squadMember.repository.js";
import squadRepository from "../repositories/squad.repository.js";
import authRepository from "../../auth/repositories/auth.repository.js";

import AppError from "../../../shared/errors/AppError.js";

class SquadMemberService {
  // ==========================================
  // ADD MEMBER
  // ==========================================

  async addMember(squadId, userId) {
    if (!userId) {
      throw new AppError(
        "User ID is required",
        400
      );
    }

    const squad =
      await squadRepository.findById(
        squadId
      );

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    const user =
      await authRepository.findById(
        userId
      );

    if (!user) {
      throw new AppError(
        "User not found",
        404
      );
    }

    const existingMember =
      await squadMemberRepository.findMember(
        squadId,
        userId
      );

    if (existingMember) {
      throw new AppError(
        "User is already a member of this squad",
        409
      );
    }

    return await squadMemberRepository.addMember(
      squadId,
      userId
    );
  }

  // ==========================================
  // GET MEMBERS
  // ==========================================

  async getMembers(squadId) {
    const squad =
      await squadRepository.findById(
        squadId
      );

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    return await squadMemberRepository.findAllMembers(
      squadId
    );
  }

  // ==========================================
  // CHECK MEMBERSHIP
  // ==========================================

  async checkMembership(
    squadId,
    userId
  ) {
    const squad =
      await squadRepository.findById(
        squadId
      );

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    const user =
      await authRepository.findById(
        userId
      );

    if (!user) {
      throw new AppError(
        "User not found",
        404
      );
    }

    return await squadMemberRepository.isMember(
      squadId,
      userId
    );
  }

  // ==========================================
  // REMOVE MEMBER
  // ==========================================

  async removeMember(
    squadId,
    userId
  ) {
    const squad =
      await squadRepository.findById(
        squadId
      );

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    const user =
      await authRepository.findById(
        userId
      );

    if (!user) {
      throw new AppError(
        "User not found",
        404
      );
    }

    const membership =
      await squadMemberRepository.findMember(
        squadId,
        userId
      );

    if (!membership) {
      throw new AppError(
        "User is not a member of this squad",
        404
      );
    }

    await squadMemberRepository.removeMember(
      squadId,
      userId
    );

    return {
      message:
        "Member removed successfully",
    };
  }
}

export default new SquadMemberService();