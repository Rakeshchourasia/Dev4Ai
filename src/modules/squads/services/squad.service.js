import squadRepository from "../repositories/squad.repository.js";
import companyRepository from "../../company/repository/company.repository.js";
import AppError from "../../../shared/errors/AppError.js";

import {
  getPagination,
  buildPagination,
} from "../../../shared/utils/pagination.js";

class SquadService {
  // ==========================================
  // CREATE SQUAD
  // ==========================================

  async create(squadData) {
    if (!squadData.companyId) {
      throw new AppError(
        "Company ID is required",
        400
      );
    }

    if (!squadData.name) {
      throw new AppError(
        "Squad name is required",
        400
      );
    }

    // Check Company
    const company =
      await companyRepository.findById(
        squadData.companyId
      );

    if (!company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    return await squadRepository.create({
      companyId: squadData.companyId,
      name: squadData.name,
    });
  }

  // ==========================================
  // GET ALL SQUADS BY COMPANY
  // ==========================================

  async getAllByCompany(
    companyId,
    query = {},
    user
  ) {
    // Check Company
    const company =
      await companyRepository.findById(
        companyId
      );

    if (!company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    const {
      page,
      limit,
      offset,
    } = getPagination(query);

    const filterUserId = user?.role === "ADMIN" ? null : user?.id;

    const [squads, total] = await Promise.all([
      squadRepository.findAllByCompanyId(
        companyId,
        {
          limit,
          offset,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          userId: filterUserId,
        }
      ),
      squadRepository.countByCompanyId(companyId, filterUserId),
    ]);

    return {
      squads,
      pagination: buildPagination(
        page,
        limit,
        total
      ),
    };
  }

  // ==========================================
  // GET SQUAD BY ID
  // ==========================================

  async getById(id) {
    const squad =
      await squadRepository.findById(id);

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    return squad;
  }

  // ==========================================
  // UPDATE SQUAD
  // ==========================================

  async update(id, squadData) {
    const squad =
      await squadRepository.findById(id);

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    // If company is being changed
    if (squadData.companyId) {
      const company =
        await companyRepository.findById(
          squadData.companyId
        );

      if (!company) {
        throw new AppError(
          "Company not found",
          404
        );
      }
    }

    return await squadRepository.update(
      id,
      squadData
    );
  }

  // ==========================================
  // DELETE SQUAD
  // ==========================================

  async delete(id) {
    const squad =
      await squadRepository.findById(id);

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    await squadRepository.delete(id);

    return {
      message: "Squad deleted successfully",
    };
  }
}

export default new SquadService();