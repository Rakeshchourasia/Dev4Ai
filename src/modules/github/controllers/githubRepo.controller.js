import githubRepoService from "../services/githubRepo.service.js";

class GithubRepoController {
  // ==========================================
  // GET /github/repositories
  // ==========================================

  async listRepositories(req, res, next) {
    try {
      const result = await githubRepoService.listRepositories(
        req.user.id,
        req.query
      );

      return res.status(200).json({
        success: true,
        message: "Repositories fetched successfully",
        data: result.repositories,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET /github/repositories/:owner/:repo
  // ==========================================

  async getRepository(req, res, next) {
    try {
      const repository = await githubRepoService.getRepository(
        req.user.id,
        req.params
      );

      return res.status(200).json({
        success: true,
        message: "Repository fetched successfully",
        data: repository,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new GithubRepoController();
