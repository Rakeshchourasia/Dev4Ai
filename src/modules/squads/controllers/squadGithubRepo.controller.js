import squadGithubRepoService from "../services/squadGithubRepo.service.js";

class SquadGithubRepoController {
  // ==========================================
  // POST /squads/:squadId/github-repositories
  // ==========================================
  async linkRepository(req, res, next) {
    try {
      const { squadId } = req.params;
      const linkedRepo = await squadGithubRepoService.linkRepository(
        req.user.id,
        squadId,
        req.body
      );

      return res.status(201).json({
        success: true,
        message: "Repository linked to squad successfully",
        data: linkedRepo,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET /squads/:squadId/github-repositories
  // ==========================================
  async listRepositories(req, res, next) {
    try {
      const { squadId } = req.params;
      const repositories = await squadGithubRepoService.listRepositories(squadId);

      return res.status(200).json({
        success: true,
        message: "Linked repositories fetched successfully",
        data: repositories,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // DELETE /squads/:squadId/github-repositories/:id
  // ==========================================
  async deleteRepository(req, res, next) {
    try {
      const { squadId, id } = req.params;
      const result = await squadGithubRepoService.deleteRepository(squadId, id);

      return res.status(200).json({
        success: true,
        message: "Repository unlinked from squad successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SquadGithubRepoController();
