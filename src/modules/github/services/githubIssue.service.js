import AppError from "../../../shared/errors/AppError.js";
import { db } from "../../../db/index.js";
import ticketRepository from "../../tickets/repositories/ticket.repository.js";
import sprintRepository from "../../sprints/repositories/sprint.repository.js";
import squadMemberRepository from "../../squads/repositories/squadMember.repository.js";
import squadGithubRepoRepository from "../../squads/repositories/squadGithubRepo.repository.js";
import ticketGithubIssueRepository from "../repositories/ticketGithubIssue.repository.js";
import githubConnectionService from "./githubConnection.service.js";
import { githubGet, githubPost } from "../utils/githubClient.js";
import activityService from "../../activity/services/activity.service.js";

// ==========================================
// EXPLICIT MAPPING FUNCTIONS
// ==========================================

export function mapGithubStateToTicketStatus(state) {
  if (!state || typeof state !== "string") {
    return "TODO";
  }
  const normalized = state.toLowerCase().trim();
  switch (normalized) {
    case "closed":
      return "DONE";
    case "open":
    default:
      return "TODO";
  }
}

export function mapGithubTitleToTicketTitle(title) {
  if (!title || typeof title !== "string") {
    return "Imported GitHub Issue";
  }
  const trimmed = title.trim();
  return trimmed.length > 255 ? trimmed.substring(0, 255) : trimmed;
}

export function mapGithubBodyToTicketDescription(body) {
  if (!body || typeof body !== "string") {
    return null;
  }
  return body.trim() || null;
}

class GithubIssueService {
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
  // HELPER: VERIFY TICKET & ACCESS
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
  // 1. LIST GITHUB ISSUES
  // GET /github/repos/:owner/:repo/issues
  // ==========================================
  async listIssues(userId, { owner, repo, state = "open", page = 1, perPage = 30 }) {
    const token = await githubConnectionService.getDecryptedAccessToken(userId);

    const rawIssues = await githubGet({
      path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
      token,
      query: {
        state,
        page,
        per_page: perPage,
      },
      context: `listing issues for repository "${owner}/${repo}"`,
    });

    const issuesArray = Array.isArray(rawIssues) ? rawIssues : [];

    // Filter out pull requests (GitHub API returns PRs in the issues endpoint)
    const filteredIssues = issuesArray.filter((issue) => !issue.pull_request);

    return filteredIssues.map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || null,
      state: issue.state,
      htmlUrl: issue.html_url,
      user: issue.user?.login || null,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
    }));
  }

  // ==========================================
  // 2. IMPORT GITHUB ISSUE INTO DEVAI TICKET
  // POST /github/repos/:owner/:repo/issues/import
  // ==========================================
  async importIssue(user, { owner, repo, issueNumber, squadId, sprintId, priority = "MEDIUM" }) {
    // 1. Verify user has access to target squad
    await this.ensureSquadAccess(squadId, user);

    // 2. Verify repository is linked to the squad (Never allow arbitrary repo access)
    const squadRepos = await squadGithubRepoRepository.findAllBySquadId(squadId);
    const linkedRepo = squadRepos.find(
      (r) =>
        r.githubOwner.toLowerCase() === owner.toLowerCase() &&
        r.githubRepositoryName.toLowerCase() === repo.toLowerCase()
    );

    if (!linkedRepo) {
      throw new AppError(
        `Repository "${owner}/${repo}" is not linked to this squad. Only linked repositories can be imported.`,
        400
      );
    }

    // 3. Verify sprint belongs to squad and is active
    const sprint = await sprintRepository.findById(sprintId);
    if (!sprint || sprint.squadId !== squadId) {
      throw new AppError("Sprint does not belong to this squad", 400);
    }
    if (sprint.status === "COMPLETED") {
      throw new AppError("Cannot create a ticket in a completed sprint", 400);
    }

    // 4. Fetch authoritative GitHub issue from GitHub API
    const token = await githubConnectionService.getDecryptedAccessToken(user.id);
    const rawIssue = await githubGet({
      path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}`,
      token,
      context: `fetching issue #${issueNumber} from "${owner}/${repo}"`,
    });

    if (!rawIssue || typeof rawIssue !== "object") {
      throw new AppError("GitHub issue unavailable or not found", 404);
    }

    if (rawIssue.pull_request) {
      throw new AppError("Pull requests cannot be imported as tickets", 400);
    }

    // 5. Prevent duplicate mapping: One GitHub issue cannot be linked multiple times
    const existingMapping = await ticketGithubIssueRepository.findByRepoAndIssueId(
      linkedRepo.githubRepositoryId,
      rawIssue.id
    );
    if (existingMapping) {
      throw new AppError("This GitHub issue is already linked to a DEVAI ticket", 409);
    }

    // 6. Explicit mapping
    const title = mapGithubTitleToTicketTitle(rawIssue.title);
    const description = mapGithubBodyToTicketDescription(rawIssue.body);
    const status = mapGithubStateToTicketStatus(rawIssue.state);

    // 7. Atomic transaction: create ticket, create mapping, log activity
    return await db.transaction(async (tx) => {
      const ticket = await ticketRepository.create(
        {
          squadId,
          sprintId,
          title,
          description,
          status,
          priority: priority || "MEDIUM",
          createdBy: user.id, // Sourced from authenticated DEVAI user
          assignedTo: null,
        },
        tx
      );

      const mapping = await ticketGithubIssueRepository.create(
        {
          ticketId: ticket.id,
          githubRepositoryId: linkedRepo.githubRepositoryId,
          githubIssueId: String(rawIssue.id),
          githubIssueNumber: rawIssue.number,
          githubIssueUrl: rawIssue.html_url,
          githubIssueState: rawIssue.state,
        },
        tx
      );

      await activityService.log(
        {
          userId: user.id,
          action: "TICKET_IMPORTED_FROM_GITHUB",
          entityType: "TICKET",
          entityId: ticket.id,
          ticketId: ticket.id,
          squadId,
          sprintId,
          description: `Imported GitHub issue #${rawIssue.number} "${rawIssue.title}" as ticket`,
        },
        tx
      );

      return {
        ticket,
        githubIssue: mapping,
      };
    });
  }

  // ==========================================
  // 3. CREATE GITHUB ISSUE FROM DEVAI TICKET
  // POST /github/tickets/:ticketId/issue
  // ==========================================
  async createIssueFromTicket(user, ticketId, { owner, repo, repositoryId } = {}) {
    // 1. Verify ticket access
    const ticket = await this.ensureTicketAccess(ticketId, user);

    // 2. Prevent duplicate: ticket can only be linked to 1 GitHub issue
    const existing = await ticketGithubIssueRepository.findByTicketId(ticketId);
    if (existing) {
      throw new AppError("This ticket is already linked to a GitHub issue", 409);
    }

    // 3. Verify squad repository link (Prefer repositories linked to the squad)
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
      throw new AppError("The specified repository is not linked to this squad", 400);
    }

    // 4. Create issue on GitHub API
    const token = await githubConnectionService.getDecryptedAccessToken(user.id);
    const targetOwner = linkedRepo.githubOwner;
    const targetRepo = linkedRepo.githubRepositoryName;

    const issuePayload = {
      title: ticket.title,
      body: ticket.description || `Created from DEVAI Ticket: ${ticket.title}`,
    };

    const createdIssue = await githubPost({
      path: `/repos/${encodeURIComponent(targetOwner)}/${encodeURIComponent(targetRepo)}/issues`,
      token,
      body: issuePayload,
      context: `creating GitHub issue for ticket "${ticket.title}"`,
    });

    if (!createdIssue || !createdIssue.id) {
      throw new AppError("Failed to create issue on GitHub", 502);
    }

    // 5. Store mapping and log activity
    return await db.transaction(async (tx) => {
      const mapping = await ticketGithubIssueRepository.create(
        {
          ticketId: ticket.id,
          githubRepositoryId: linkedRepo.githubRepositoryId,
          githubIssueId: String(createdIssue.id),
          githubIssueNumber: createdIssue.number,
          githubIssueUrl: createdIssue.html_url,
          githubIssueState: createdIssue.state || "open",
        },
        tx
      );

      await activityService.log(
        {
          userId: user.id,
          action: "GITHUB_ISSUE_CREATED",
          entityType: "TICKET",
          entityId: ticket.id,
          ticketId: ticket.id,
          squadId: ticket.squadId,
          sprintId: ticket.sprintId,
          description: `Created GitHub issue #${createdIssue.number} in ${targetOwner}/${targetRepo} from ticket "${ticket.title}"`,
        },
        tx
      );

      return {
        ticket,
        githubIssue: mapping,
      };
    });
  }

  // ==========================================
  // 4. GET LINKED GITHUB ISSUE FOR TICKET
  // GET /tickets/:ticketId/github-issue
  // ==========================================
  async getLinkedIssue(user, ticketId) {
    await this.ensureTicketAccess(ticketId, user);

    const mapping = await ticketGithubIssueRepository.findByTicketId(ticketId);
    if (!mapping) {
      throw new AppError("No linked GitHub issue found for this ticket", 404);
    }

    return mapping;
  }

  // ==========================================
  // 5. UNLINK GITHUB ISSUE FROM TICKET
  // DELETE /tickets/:ticketId/github-issue
  // ==========================================
  async unlinkIssue(user, ticketId) {
    const ticket = await this.ensureTicketAccess(ticketId, user);

    const mapping = await ticketGithubIssueRepository.findByTicketId(ticketId);
    if (!mapping) {
      throw new AppError("No linked GitHub issue found for this ticket", 404);
    }

    return await db.transaction(async (tx) => {
      await ticketGithubIssueRepository.deleteByTicketId(ticketId, tx);

      await activityService.log(
        {
          userId: user.id,
          action: "GITHUB_ISSUE_UNLINKED",
          entityType: "TICKET",
          entityId: ticket.id,
          ticketId: ticket.id,
          squadId: ticket.squadId,
          sprintId: ticket.sprintId,
          description: `Unlinked GitHub issue #${mapping.githubIssueNumber} from ticket "${ticket.title}"`,
        },
        tx
      );

      return {
        ticketId,
        message: "GitHub issue unlinked from ticket successfully",
      };
    });
  }
}

export default new GithubIssueService();
