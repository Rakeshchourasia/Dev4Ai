import squadMemberRepository from "../repositories/squadMember.repository.js";
import squadRepository from "../repositories/squad.repository.js";
import authRepository from "../../auth/repositories/auth.repository.js";
import AppError from "../../../shared/errors/AppError.js";

class SquadMemberService {
  // ==========================================
  // ADD MEMBER
  // ==========================================

  async addMember(squadId, userId) {
    // 1. Check Squad
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

    // 2. Check User
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

    // 3. Check existing membership
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

    // 4. Add member
    return await squadMemberRepository.addMember(
      squadId,
      userId
    );
  }

  // ==========================================
  // GET ALL MEMBERS
  // ==========================================

  async getMembers(squadId) {
    // 1. Check Squad
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

    // 2. Get members
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
    // 1. Check Squad
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

    // 2. Check User
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

    // 3. Check membership
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
    // 1. Check Squad
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

    // 2. Check User
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

    // 3. Check membership
    const member =
      await squadMemberRepository.findMember(
        squadId,
        userId
      );

    if (!member) {
      throw new AppError(
        "User is not a member of this squad",
        404
      );
    }

    // 4. Remove member
    await squadMemberRepository.removeMember(
      squadId,
      userId
    );

    return {
      message: "Member removed successfully",
    };
  }
}

export default new SquadMemberService();