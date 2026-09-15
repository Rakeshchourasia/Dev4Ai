import githubConnectionService from "../services/githubConnection.service.js";

class GithubConnectionController {
  // ==========================================
  // GET /github/connection
  // Authenticated users only — returns safe GitHub info (no tokens)
  // ==========================================

  async getConnection(req, res, next) {
    try {
      // req.user is populated by the authenticate middleware from the DEVAI JWT
      const result = await githubConnectionService.getConnection(req.user.id);

      return res.status(200).json({
        success: true,
        message: result.connected
          ? "GitHub connection found"
          : "No GitHub connection found",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // DELETE /github/connection
  // Authenticated users only — revokes and removes the GitHub connection
  // ==========================================

  async deleteConnection(req, res, next) {
    try {
      await githubConnectionService.deleteConnection(req.user.id);

      return res.status(200).json({
        success: true,
        message: "GitHub connection removed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new GithubConnectionController();
