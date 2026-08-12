import companyService from "../services/company.service.js";

class CompanyController {
  async create(req, res, next) {
    try {
      const company = await companyService.create(req.body);

      return res.status(201).json({
        success: true,
        message: "Company created successfully",
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const companies = await companyService.getAll();

      return res.status(200).json({
        success: true,
        message: "Companies fetched successfully",
        data: companies,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const company = await companyService.getById(
        req.params.id
      );

      return res.status(200).json({
        success: true,
        message: "Company fetched successfully",
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const company = await companyService.update(
        req.params.id,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "Company updated successfully",
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await companyService.delete(
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

export default new CompanyController();