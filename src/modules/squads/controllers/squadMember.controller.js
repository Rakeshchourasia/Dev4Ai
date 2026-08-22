import squadMemberService from "../services/squadMember.service.js";

class SquadMemberController {
  async addMember(req, res, next) {
    try {
      const { squadId } = req.params;
      const { userId } = req.body;

      const member =
        await squadMemberService.addMember(
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
      const { squadId } = req.params;

      const members =
        await squadMemberService.getMembers(
          squadId
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

      const isMember =
        await squadMemberService.checkMembership(
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
      const { squadId, userId } = req.params;

      const result =
        await squadMemberService.removeMember(
          squadId,
          userId
        );

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SquadMemberController();