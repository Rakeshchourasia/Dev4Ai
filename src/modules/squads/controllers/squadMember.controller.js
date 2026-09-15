import squadMemberService from "../services/squadMember.service.js";
import AppError from "../../../shared/errors/AppError.js";

class SquadMemberController {
  async addMember(req, res, next) {
    try {
      const squadId = req.params.squadId || req.body.squadId;
      const userId = req.body.userId;

      if (!squadId) {
        throw new AppError("Squad ID is required", 400);
      }

      const member = await squadMemberService.addMember(
        squadId,
        userId
      );

      return res.status(201).json({
        success: true,
        message: "Member added successfully",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMembers(req, res, next) {
    try {
      const members = await squadMemberService.getMembers(
        req.params.squadId
      );

      return res.status(200).json({
        success: true,
        message: "Squad members fetched successfully",
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  async checkMembership(req, res, next) {
    try {
      const { squadId, userId } = req.params;

      const isMember = await squadMemberService.checkMembership(
        squadId,
        userId
      );

      return res.status(200).json({
        success: true,
        message: "Membership checked successfully",
        data: {
          squadId,
          userId,
          isMember,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const squadId = req.params.squadId || req.query?.squadId || req.body?.squadId;
      const userId = req.params.userId || req.params.id || req.body?.userId;

      if (!squadId || !userId) {
        throw new AppError("Squad ID and User ID are required", 400);
      }

      const result = await squadMemberService.removeMember(
        squadId,
        userId
      );

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SquadMemberController();