import githubPrService from "../services/githubPr.service.js";

class GithubPrController {
  // ==========================================
  // GET /github/repos/:owner/:repo/pulls
  // ==========================================
  async listPulls(req, res, next) {
    try {
      const { owner, repo } = req.params;
      const pulls = await githubPrService.listPulls(req.user.id, {
        owner,
        repo,
        ...req.query,
      });

      return res.status(200).json({
        success: true,
        message: "Pull requests fetched successfully",
        data: pulls,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET /github/repos/:owner/:repo/pulls/:pullNumber
  // ==========================================
  async getPull(req, res, next) {
    try {
      const { owner, repo, pullNumber } = req.params;
      const pull = await githubPrService.getPull(req.user.id, {
        owner,
        repo,
        pullNumber,
      });

      return res.status(200).json({
        success: true,
        message: "Pull request details fetched successfully",
        data: pull,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET /github/repos/:owner/:repo/pulls/:pullNumber/files
  // ==========================================
  async getPullFiles(req, res, next) {
    try {
      const { owner, repo, pullNumber } = req.params;
      const files = await githubPrService.getPullFiles(req.user.id, {
        owner,
        repo,
        pullNumber,
      });

      return res.status(200).json({
        success: true,
        message: "Pull request changed files fetched successfully",
        data: files,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET /github/repos/:owner/:repo/pulls/:pullNumber/commits
  // ==========================================
  async getPullCommits(req, res, next) {
    try {
      const { owner, repo, pullNumber } = req.params;
      const commits = await githubPrService.getPullCommits(req.user.id, {
        owner,
        repo,
        pullNumber,
      });

      return res.status(200).json({
        success: true,
        message: "Pull request commits fetched successfully",
        data: commits,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET /github/repos/:owner/:repo/pulls/:pullNumber/diff
  // ==========================================
  async getPullDiff(req, res, next) {
    try {
      const { owner, repo, pullNumber } = req.params;
      const diff = await githubPrService.getPullDiff(req.user.id, {
        owner,
        repo,
        pullNumber,
      });

      return res.status(200).json({
        success: true,
        message: "Pull request diff and changes fetched successfully",
        data: diff,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // POST /tickets/:ticketId/github-prs/link
  // ==========================================
  async linkPrToTicket(req, res, next) {
    try {
      const { ticketId } = req.params;
      const result = await githubPrService.linkPrToTicket(
        req.user,
        ticketId,
        req.body
      );

      return res.status(201).json({
        success: true,
        message: "GitHub pull request linked to ticket successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET /tickets/:ticketId/github-prs
  // ==========================================
  async getTicketPrs(req, res, next) {
    try {
      const { ticketId } = req.params;
      const prs = await githubPrService.getTicketPrs(req.user, ticketId);

      return res.status(200).json({
        success: true,
        message: "Linked GitHub pull requests fetched successfully",
        data: prs,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new GithubPrController();
