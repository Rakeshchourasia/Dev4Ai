import AppError from "../errors/AppError.js";
import squadMemberRepository from "../../modules/squads/repositories/squadMember.repository.js";

const squadAccess = (paramName = "squadId") => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(
          new AppError("Authentication required", 401)
        );
      }

      // ADMIN has global access
      if (req.user.role === "ADMIN") {
        return next();
      }

      const squadId = req.params[paramName];

      if (!squadId) {
        return next(
          new AppError("Squad ID is required", 400)
        );
      }

      const isMember =
        await squadMemberRepository.isMember(
          squadId,
          req.user.id
        );

      if (!isMember) {
        return next(
          new AppError(
            "You do not have access to this squad",
            403
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default squadAccess;