import AppError from "../../../shared/errors/AppError.js";
import { db } from "../../../db/index.js";
import ticketRepository from "../../tickets/repositories/ticket.repository.js";
import squadMemberRepository from "../../squads/repositories/squadMember.repository.js";
import squadGithubRepoRepository from "../../squads/repositories/squadGithubRepo.repository.js";
import ticketGithubPrRepository from "../repositories/ticketGithubPr.repository.js";
import githubConnectionService from "./githubConnection.service.js";
import { githubGet } from "../utils/githubClient.js";
import activityService from "../../activity/services/activity.service.js";

class GithubPrService {
  // ==========================================
  // HELPER: VERIFY SQUAD ACCESS
  // ==========================================
  async ensureSquadAccess(squadId, user) {
    if (!user?.id) {
      throw new AppError("Authentication required", 401);
    }
    if (user.role === "ADMIN") {
      return;
    }
    const isMember = await squadMemberRepository.isMember(squadId, user.id);
    if (!isMember) {
      throw new AppError("You do not have access to this squad", 403);
    }
  }

  // ==========================================
  // HELPER: VERIFY TICKET & SQUAD ACCESS
  // ==========================================
  async ensureTicketAccess(ticketId, user) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new AppError("Ticket not found", 404);
    }
    await this.ensureSquadAccess(ticket.squadId, user);
    return ticket;
  }

  // ==========================================
  // 1. LIST PULL REQUESTS
  // GET /github/repos/:owner/:repo/pulls
  // ==========================================
  async listPulls(userId, { owner, repo, state = "open", page = 1, perPage = 30, sort = "created", direction = "desc", head, base }) {
    const token = await githubConnectionService.getDecryptedAccessToken(userId);

    const query = {
      state,
      page,
      per_page: perPage,
      sort,
      direction,
    };
    if (head) query.head = head;
    if (base) query.base = base;

    const rawPulls = await githubGet({
      path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
      token,
      query,
      context: `listing pull requests for repository "${owner}/${repo}"`,
    });

    const pullsArray = Array.isArray(rawPulls) ? rawPulls : [];

    return pullsArray.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body || null,
      state: pr.state,
      author: pr.user?.login || null,
      url: pr.html_url,
      baseBranch: pr.base?.ref || null,
      headBranch: pr.head?.ref || null,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at || null,
    }));
  }

  // ==========================================
  // 2. GET SINGLE PULL REQUEST DETAILS
  // GET /github/repos/:owner/:repo/pulls/:pullNumber
  // ==========================================
  async getPull(userId, { owner, repo, pullNumber }) {
    const token = await githubConnectionService.getDecryptedAccessToken(userId);

    const pr = await githubGet({
      path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`,
      token,
      context: `fetching pull request #${pullNumber} from "${owner}/${repo}"`,
    });

    if (!pr || typeof pr !== "object") {
      throw new AppError("Pull request not found", 404);
    }

    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body || null,
      state: pr.state,
      author: pr.user?.login || null,
      url: pr.html_url,
      baseBranch: pr.base?.ref || null,
      headBranch: pr.head?.ref || null,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at || null,
      additions: pr.additions ?? null,
      deletions: pr.deletions ?? null,
      changedFiles: pr.changed_files ?? null,
      commits: pr.commits ?? null,
    };
  }

  // ==========================================
  // 3. GET CHANGED FILES IN PULL REQUEST
  // GET /github/repos/:owner/:repo/pulls/:pullNumber/files
  // ==========================================
  async getPullFiles(userId, { owner, repo, pullNumber }) {
    const token = await githubConnectionService.getDecryptedAccessToken(userId);

    const rawFiles = await githubGet({
      path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/files`,
      token,
      context: `fetching changed files for pull request #${pullNumber} from "${owner}/${repo}"`,
    });

    const filesArray = Array.isArray(rawFiles) ? rawFiles : [];

    return filesArray.map((file) => ({
      sha: file.sha,
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch || null,
      rawUrl: file.raw_url || null,
    }));
  }

  // ==========================================
  // 4. GET COMMITS IN PULL REQUEST
  // GET /github/repos/:owner/:repo/pulls/:pullNumber/commits
  // ==========================================
  async getPullCommits(userId, { owner, repo, pullNumber }) {
    const token = await githubConnectionService.getDecryptedAccessToken(userId);

    const rawCommits = await githubGet({
      path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/commits`,
      token,
      context: `fetching commits for pull request #${pullNumber} from "${owner}/${repo}"`,
    });

    const commitsArray = Array.isArray(rawCommits) ? rawCommits : [];

    return commitsArray.map((c) => ({
      sha: c.sha,
      author: c.commit?.author?.name || c.author?.login || "Unknown",
      message: c.commit?.message || "",
      url: c.html_url,
      date: c.commit?.author?.date || null,
    }));
  }

  // ==========================================
  // 5. GET NORMALIZED DIFF FOR AI REVIEW
  // GET /github/repos/:owner/:repo/pulls/:pullNumber/diff
  // ==========================================
  async getPullDiff(userId, { owner, repo, pullNumber }) {
    const token = await githubConnectionService.getDecryptedAccessToken(userId);

    // Fetch PR details, files, commits, and raw unified diff in parallel
    const [pr, files, commits, rawDiff] = await Promise.all([
      githubGet({
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`,
        token,
        context: `fetching details for pull request #${pullNumber}`,
      }),
      githubGet({
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/files`,
        token,
        context: `fetching files for pull request #${pullNumber}`,
      }),
      githubGet({
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/commits`,
        token,
        context: `fetching commits for pull request #${pullNumber}`,
      }),
      githubGet({
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`,
        token,
        headers: { Accept: "application/vnd.github.v3.diff" },
        responseType: "text",
        context: `fetching diff for pull request #${pullNumber}`,
      }),
    ]);

    const filesArray = Array.isArray(files) ? files : [];
    const commitsArray = Array.isArray(commits) ? commits : [];

    return {
      pr: {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        baseBranch: pr.base?.ref || null,
        headBranch: pr.head?.ref || null,
      },
      stats: {
        additions: pr.additions ?? filesArray.reduce((acc, f) => acc + (f.additions || 0), 0),
        deletions: pr.deletions ?? filesArray.reduce((acc, f) => acc + (f.deletions || 0), 0),
        changedFiles: pr.changed_files ?? filesArray.length,
        commitsCount: pr.commits ?? commitsArray.length,
      },
      files: filesArray.map((f) => ({
        sha: f.sha,
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch || null,
      })),
      rawDiff: typeof rawDiff === "string" ? rawDiff : "",
      commits: commitsArray.map((c) => ({
        sha: c.sha,
        author: c.commit?.author?.name || c.author?.login || "Unknown",
        message: c.commit?.message || "",
        date: c.commit?.author?.date || null,
      })),
    };
  }

  // ==========================================
  // 6. LINK GITHUB PR TO DEVAI TICKET
  // POST /tickets/:ticketId/github-prs/link
  // ==========================================
  async linkPrToTicket(user, ticketId, { pullNumber, owner, repo, repositoryId } = {}) {
    // 1. Verify ticket & squad access
    const ticket = await this.ensureTicketAccess(ticketId, user);

    // 2. Verify squad has a linked repository matching target
    const squadRepos = await squadGithubRepoRepository.findAllBySquadId(ticket.squadId);
    if (!squadRepos || squadRepos.length === 0) {
      throw new AppError(
        "No GitHub repository is linked to this squad. Link a repository to the squad first.",
        400
      );
    }

    let linkedRepo;
    if (owner && repo) {
      linkedRepo = squadRepos.find(
        (r) =>
          r.githubOwner.toLowerCase() === owner.toLowerCase() &&
          r.githubRepositoryName.toLowerCase() === repo.toLowerCase()
      );
    } else if (repositoryId) {
      linkedRepo = squadRepos.find((r) => r.githubRepositoryId === String(repositoryId));
    } else if (squadRepos.length === 1) {
      linkedRepo = squadRepos[0];
    } else {
      throw new AppError(
        "Multiple repositories are linked to this squad. Please specify owner and repo.",
        400
      );
    }

    if (!linkedRepo) {
      throw new AppError(
        `Repository "${owner}/${repo}" is not linked to this squad. Only linked repositories can be linked to tickets.`,
        400
      );
    }

    // 3. Fetch authoritative PR from GitHub
    const token = await githubConnectionService.getDecryptedAccessToken(user.id);
    const targetOwner = linkedRepo.githubOwner;
    const targetRepo = linkedRepo.githubRepositoryName;

    const rawPr = await githubGet({
      path: `/repos/${encodeURIComponent(targetOwner)}/${encodeURIComponent(targetRepo)}/pulls/${pullNumber}`,
      token,
      context: `fetching pull request #${pullNumber} from "${targetOwner}/${targetRepo}"`,
    });

    if (!rawPr || !rawPr.id) {
      throw new AppError("GitHub pull request not found", 404);
    }

    // 4. Duplicate prevention: Check if already linked to this ticket
    const existing = await ticketGithubPrRepository.findByTicketAndPrId(
      ticketId,
      linkedRepo.githubRepositoryId,
      rawPr.id
    );
    if (existing) {
      throw new AppError("This GitHub pull request is already linked to this ticket", 409);
    }

    // 5. Store link and log activity
    return await db.transaction(async (tx) => {
      const mapping = await ticketGithubPrRepository.create(
        {
          ticketId,
          githubRepositoryId: linkedRepo.githubRepositoryId,
          githubPrId: String(rawPr.id),
          githubPrNumber: rawPr.number,
          githubPrUrl: rawPr.html_url,
          state: rawPr.state || "open",
        },
        tx
      );

      await activityService.log(
        {
          userId: user.id,
          action: "GITHUB_PR_LINKED",
          entityType: "TICKET",
          entityId: ticket.id,
          ticketId: ticket.id,
          squadId: ticket.squadId,
          sprintId: ticket.sprintId,
          description: `Linked GitHub PR #${rawPr.number} "${rawPr.title}" to ticket "${ticket.title}"`,
        },
        tx
      );

      return {
        ticket,
        githubPr: mapping,
      };
    });
  }

  // ==========================================
  // 7. GET LINKED PRS FOR TICKET
  // GET /tickets/:ticketId/github-prs
  // ==========================================
  async getTicketPrs(user, ticketId) {
    await this.ensureTicketAccess(ticketId, user);
    return await ticketGithubPrRepository.findAllByTicketId(ticketId);
  }
}

export default new GithubPrService();
