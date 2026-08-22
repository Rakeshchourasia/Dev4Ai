import companyRepository from "../repository/company.repository.js";
import AppError from "../../../shared/errors/AppError.js";

import {
  getPagination,
  buildPagination,
} from "../../../shared/utils/pagination.js";

class CompanyService {
  // ==========================================
  // CREATE COMPANY
  // ==========================================

  async create(companyData) {
    if (!companyData.name) {
      throw new AppError(
        "Company name is required",
        400
      );
    }

    const existingCompany =
      await companyRepository.findByName(
        companyData.name
      );

    if (existingCompany) {
      throw new AppError(
        "Company already exists",
        409
      );
    }

    return await companyRepository.create({
      name: companyData.name,
    });
  }

  // ==========================================
  // GET ALL COMPANIES
  // ==========================================

  async getAll(query = {}) {
    const {
      page,
      limit,
      offset,
    } = getPagination(query);

    const companies =
      await companyRepository.findAll({
        limit,
        offset,
      });

    const total =
      await companyRepository.countAll();

    return {
      companies,
      pagination: buildPagination(
        page,
        limit,
        total
      ),
    };
  }

  // ==========================================
  // GET COMPANY BY ID
  // ==========================================

  async getById(id) {
    const company =
      await companyRepository.findById(id);

    if (!company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    return company;
  }

  // ==========================================
  // UPDATE COMPANY
  // ==========================================

  async update(id, companyData) {
    const company =
      await companyRepository.findById(id);

    if (!company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    if (companyData.name) {
      const existingCompany =
        await companyRepository.findByName(
          companyData.name
        );

      if (
        existingCompany &&
        existingCompany.id !== id
      ) {
        throw new AppError(
          "Company name already exists",
          409
        );
      }
    }

    return await companyRepository.update(
      id,
      companyData
    );
  }

  // ==========================================
  // DELETE COMPANY
  // ==========================================

  async delete(id) {
    const company =
      await companyRepository.findById(id);

    if (!company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    await companyRepository.delete(id);

    return {
      message: "Company deleted successfully",
    };
  }
}

export default new CompanyService();