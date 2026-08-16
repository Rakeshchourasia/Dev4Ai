import squadRepository from "../repositories/squad.repository.js";
import companyRepository from "../../company/repository/company.repository.js";
import AppError from "../../../shared/errors/AppError.js";

class SquadService {
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

    // Check that the company exists
    const company = await companyRepository.findById(
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

  async getAllByCompany(companyId) {
    const company = await companyRepository.findById(
      companyId
    );

    if (!company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    return await squadRepository.findAllByCompanyId(
      companyId
    );
  }

  async getById(id) {
    const squad = await squadRepository.findById(id);

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    return squad;
  }

  async update(id, squadData) {
    const squad = await squadRepository.findById(id);

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

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

  async delete(id) {
    const squad = await squadRepository.findById(id);

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