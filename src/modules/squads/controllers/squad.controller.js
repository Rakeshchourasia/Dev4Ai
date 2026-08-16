import squadService from "../services/squad.service.js";

class SquadController {
  async create(req, res, next) {
    try {
      const squad = await squadService.create(req.body);

      return res.status(201).json({
        success: true,
        message: "Squad created successfully",
        data: squad,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllByCompany(req, res, next) {
    try {
      const { companyId } = req.params;

      const squads = await squadService.getAllByCompany(
        companyId
      );

      return res.status(200).json({
        success: true,
        message: "Squads fetched successfully",
        data: squads,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const squad = await squadService.getById(
        req.params.id
      );

      return res.status(200).json({
        success: true,
        message: "Squad fetched successfully",
        data: squad,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const squad = await squadService.update(
        req.params.id,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "Squad updated successfully",
        data: squad,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await squadService.delete(
        req.params.id
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

export default new SquadController();