import githubOrgService from "../services/githubOrg.service.js";

class GithubOrgController {
  // ==========================================
  // GET /github/organizations
  // ==========================================

  async listOrganizations(req, res, next) {
    try {
      const organizations = await githubOrgService.listOrganizations(
        req.user.id
      );

      return res.status(200).json({
        success: true,
        message: "Organizations fetched successfully",
        data: organizations,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET /github/organizations/:organization/repos
  // ==========================================

  async listOrgRepos(req, res, next) {
    try {
      const { organization } = req.params;

      // Optional filter/sort query params — defaults applied inside service
      const { type, sort, direction } = req.query;

      const repos = await githubOrgService.listOrgRepos(
        req.user.id,
        organization,
        { type, sort, direction }
      );

      return res.status(200).json({
        success: true,
        message: "Repositories fetched successfully",
        data: repos,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new GithubOrgController();
