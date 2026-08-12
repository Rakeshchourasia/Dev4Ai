import companyRepository from "../repository/company.repository.js";
import AppError from "../../../shared/errors/AppError.js";

class CompanyService {
  async create(companyData) {
    if (!companyData.name) {
      throw new AppError("Company name is required", 400);
    }

    const existingCompany =
      await companyRepository.findByName(companyData.name);

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

  async getAll() {
    return await companyRepository.findAll();
  }

  async getById(id) {
    const company = await companyRepository.findById(id);

    if (!company) {
      throw new AppError(
        "Company not found",
        404
      );
    }

    return company;
  }

  async update(id, companyData) {
    const company = await companyRepository.findById(id);

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

  async delete(id) {
    const company = await companyRepository.findById(id);

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