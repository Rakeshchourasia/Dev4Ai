import squadService from "../services/squad.service.js";

class SquadController {
  // ==========================================
  // CREATE
  // ==========================================

  async create(req, res, next) {
    try {
      const squad =
        await squadService.create(
          req.body
        );

      return res.status(201).json({
        success: true,
        message: "Squad created successfully",
        data: squad,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET ALL BY COMPANY
  // ==========================================

  async getAllByCompany(req, res, next) {
    try {
      const { companyId } =
        req.params;

      const result =
        await squadService.getAllByCompany(
          companyId,
          req.query,
          req.user
        );

      return res.status(200).json({
        success: true,
        message: "Squads fetched successfully",
        data: result.squads,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET BY ID
  // ==========================================

  async getById(req, res, next) {
    try {
      const squad =
        await squadService.getById(
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

  // ==========================================
  // UPDATE
  // ==========================================

  async update(req, res, next) {
    try {
      const squad =
        await squadService.update(
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

  // ==========================================
  // DELETE
  // ==========================================

  async delete(req, res, next) {
    try {
      const result =
        await squadService.delete(
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