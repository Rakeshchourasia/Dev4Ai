import squadRepository from "../../modules/squads/repositories/squad.repository.js";
import squadMemberRepository from "../../modules/squads/repositories/squadMember.repository.js";

import AppError from "../errors/AppError.js";

const squadAccess = (paramName = "squadId") => {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return next(
          new AppError(
            "Authentication required",
            401
          )
        );
      }

      const squadId =
        req.params[paramName] ||
        req.body?.squadId;

      if (!squadId) {
        return next(
          new AppError(
            "Squad ID is required",
            400
          )
        );
      }

      const squad =
        await squadRepository.findById(
          squadId
        );

      if (!squad) {
        return next(
          new AppError(
            "Squad not found",
            404
          )
        );
      }

      // ADMIN has global access
      if (req.user.role === "ADMIN") {
        req.squad = squad;
        return next();
      }

      const isMember =
        await squadMemberRepository.isMember(
          squadId,
          req.user.id
        );

      if (!isMember) {
        return next(
          new AppError(
            "You are not a member of this squad",
            403
          )
        );
      }

      req.squad = squad;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default squadAccess;