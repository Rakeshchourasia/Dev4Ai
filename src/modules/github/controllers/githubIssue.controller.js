import githubIssueService from "../services/githubIssue.service.js";

class GithubIssueController {
  // ==========================================
  // GET /github/repos/:owner/:repo/issues
  // ==========================================
  async listIssues(req, res, next) {
    try {
      const { owner, repo } = req.params;
      const issues = await githubIssueService.listIssues(req.user.id, {
        owner,
        repo,
        ...req.query,
      });

      return res.status(200).json({
        success: true,
        message: "GitHub issues fetched successfully",
        data: issues,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // POST /github/repos/:owner/:repo/issues/import
  // ==========================================
  async importIssue(req, res, next) {
    try {
      const { owner, repo } = req.params;
      const result = await githubIssueService.importIssue(req.user, {
        owner,
        repo,
        ...req.body,
      });

      return res.status(201).json({
        success: true,
        message: "GitHub issue imported as ticket successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // POST /github/tickets/:ticketId/issue
  // ==========================================
  async createIssueFromTicket(req, res, next) {
    try {
      const { ticketId } = req.params;
      const result = await githubIssueService.createIssueFromTicket(
        req.user,
        ticketId,
        req.body
      );

      return res.status(201).json({
        success: true,
        message: "GitHub issue created from ticket successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET /tickets/:ticketId/github-issue
  // ==========================================
  async getLinkedIssue(req, res, next) {
    try {
      const { ticketId } = req.params;
      const result = await githubIssueService.getLinkedIssue(
        req.user,
        ticketId
      );

      return res.status(200).json({
        success: true,
        message: "Linked GitHub issue fetched successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // DELETE /tickets/:ticketId/github-issue
  // ==========================================
  async unlinkIssue(req, res, next) {
    try {
      const { ticketId } = req.params;
      const result = await githubIssueService.unlinkIssue(
        req.user,
        ticketId
      );

      return res.status(200).json({
        success: true,
        message: "GitHub issue unlinked from ticket successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new GithubIssueController();
