import squadMemberRepository from "../repositories/squadMember.repository.js";
import squadRepository from "../repositories/squad.repository.js";
import authRepository from "../../auth/repositories/auth.repository.js";
import AppError from "../../../shared/errors/AppError.js";

class SquadMemberService {
  async addMember(squadId, userId) {
    // 1. Check Squad
    const squad = await squadRepository.findById(
      squadId
    );

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    // 2. Check User
    const user = await authRepository.findById(
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

  async getMembers(squadId) {
    // Check Squad
    const squad = await squadRepository.findById(
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

  async checkMembership(squadId, userId) {
    // Check Squad
    const squad = await squadRepository.findById(
      squadId
    );

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    // Check User
    const user = await authRepository.findById(
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

  async removeMember(squadId, userId) {
    // Check Squad
    const squad = await squadRepository.findById(
      squadId
    );

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    // Check membership
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