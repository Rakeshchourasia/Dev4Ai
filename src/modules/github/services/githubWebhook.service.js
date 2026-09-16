import { db } from "../../../db/index.js";
import { eq } from "drizzle-orm";
import githubWebhookEventRepository from "../repositories/githubWebhookEvent.repository.js";
import ticketGithubIssueRepository from "../repositories/ticketGithubIssue.repository.js";
import ticketGithubPrRepository from "../repositories/ticketGithubPr.repository.js";
import ticketRepository from "../../tickets/repositories/ticket.repository.js";
import { squadGithubRepositories } from "../../../db/schema/squadGithubRepositories.schema.js";
import { squadMembers } from "../../../db/schema/squadMembers.schema.js";
import activityService from "../../activity/services/activity.service.js";

class GithubWebhookService {
  /**
   * Main webhook entry point.
   * Handles idempotency, event routing, and status synchronizations.
   */
  async processWebhook({ deliveryId, event, payload }) {
    // 1. Idempotency Check: Don't process the same delivery twice
    const existing = await githubWebhookEventRepository.findByDeliveryId(deliveryId);
    if (existing && existing.processed) {
      return {
        duplicate: true,
        message: "Delivery already processed",
        deliveryId,
      };
    }

    if (!existing) {
      await githubWebhookEventRepository.create({
        deliveryId,
        event,
        processed: false,
      });
    }

    // 2. Event Router
    switch (event) {
      case "issues":
        await this.handleIssueEvent(payload);
        break;
      case "pull_request":
        await this.handlePullRequestEvent(payload);
        break;
      case "push":
        await this.handlePushEvent(payload);
        break;
      default:
        // Safely ignore unsupported events
        break;
    }

    // 3. Mark delivery as processed
    await githubWebhookEventRepository.markProcessed(deliveryId);

    return {
      processed: true,
      deliveryId,
      event,
      action: payload.action || null,
    };
  }

  // ==========================================
  // ISSUES EVENT HANDLER
  // ==========================================
  async handleIssueEvent(payload) {
    const { action, issue, repository } = payload;
    if (!issue?.id || !repository?.id) return;

    const mapping = await ticketGithubIssueRepository.findByRepoAndIssueId(
      repository.id,
      issue.id
    );

    if (!mapping) return;

    // Update issue state in mapping table
    await ticketGithubIssueRepository.updateState(mapping.id, issue.state || "open");

    const ticket = await ticketRepository.findById(mapping.ticketId);
    if (!ticket) return;

    if (action === "closed") {
      await ticketRepository.update(ticket.id, { status: "DONE" });
      await activityService.log({
        userId: ticket.createdBy,
        action: "TICKET_STATUS_SYNCED_FROM_GITHUB",
        entityType: "TICKET",
        entityId: ticket.id,
        ticketId: ticket.id,
        squadId: ticket.squadId,
        sprintId: ticket.sprintId,
        description: `GitHub issue #${issue.number} was closed; ticket status updated to DONE`,
      });
    } else if (action === "reopened") {
      await ticketRepository.update(ticket.id, { status: "TODO" });
      await activityService.log({
        userId: ticket.createdBy,
        action: "TICKET_STATUS_SYNCED_FROM_GITHUB",
        entityType: "TICKET",
        entityId: ticket.id,
        ticketId: ticket.id,
        squadId: ticket.squadId,
        sprintId: ticket.sprintId,
        description: `GitHub issue #${issue.number} was reopened; ticket status updated to TODO`,
      });
    } else if (action === "opened") {
      await activityService.log({
        userId: ticket.createdBy,
        action: "GITHUB_ISSUE_OPENED",
        entityType: "TICKET",
        entityId: ticket.id,
        ticketId: ticket.id,
        squadId: ticket.squadId,
        sprintId: ticket.sprintId,
        description: `GitHub issue #${issue.number} was opened`,
      });
    }
  }

  // ==========================================
  // PULL REQUEST EVENT HANDLER
  // ==========================================
  async handlePullRequestEvent(payload) {
    const { action, pull_request: pr, repository } = payload;
    if (!pr?.id || !repository?.id) return;

    const mappings = await ticketGithubPrRepository.findAllByRepoAndPrId(
      repository.id,
      pr.id
    );

    if (!mappings || mappings.length === 0) return;

    for (const mapping of mappings) {
      await ticketGithubPrRepository.updateState(mapping.id, pr.state || "open");

      const ticket = await ticketRepository.findById(mapping.ticketId);
      if (!ticket) continue;

      if (action === "opened") {
        await activityService.log({
          userId: ticket.createdBy,
          action: "GITHUB_PR_OPENED",
          entityType: "TICKET",
          entityId: ticket.id,
          ticketId: ticket.id,
          squadId: ticket.squadId,
          sprintId: ticket.sprintId,
          description: `GitHub PR #${pr.number} was opened`,
        });
      } else if (action === "closed" && pr.merged) {
        await ticketRepository.update(ticket.id, { status: "DONE" });
        await activityService.log({
          userId: ticket.createdBy,
          action: "GITHUB_PR_MERGED",
          entityType: "TICKET",
          entityId: ticket.id,
          ticketId: ticket.id,
          squadId: ticket.squadId,
          sprintId: ticket.sprintId,
          description: `GitHub PR #${pr.number} was merged; ticket status updated to DONE`,
        });
      } else if (action === "closed") {
        await activityService.log({
          userId: ticket.createdBy,
          action: "GITHUB_PR_CLOSED",
          entityType: "TICKET",
          entityId: ticket.id,
          ticketId: ticket.id,
          squadId: ticket.squadId,
          sprintId: ticket.sprintId,
          description: `GitHub PR #${pr.number} was closed`,
        });
      } else if (action === "reopened") {
        await activityService.log({
          userId: ticket.createdBy,
          action: "GITHUB_PR_REOPENED",
          entityType: "TICKET",
          entityId: ticket.id,
          ticketId: ticket.id,
          squadId: ticket.squadId,
          sprintId: ticket.sprintId,
          description: `GitHub PR #${pr.number} was reopened`,
        });
      } else if (action === "synchronize") {
        await activityService.log({
          userId: ticket.createdBy,
          action: "GITHUB_PR_SYNCHRONIZED",
          entityType: "TICKET",
          entityId: ticket.id,
          ticketId: ticket.id,
          squadId: ticket.squadId,
          sprintId: ticket.sprintId,
          description: `GitHub PR #${pr.number} was updated with new commits`,
        });
      }
    }
  }

  // ==========================================
  // PUSH EVENT HANDLER
  // ==========================================
  async handlePushEvent(payload) {
    const { ref, commits, repository } = payload;
    if (!repository?.id) return;

    const squadRepos = await db
      .select()
      .from(squadGithubRepositories)
      .where(eq(squadGithubRepositories.githubRepositoryId, String(repository.id)));

    if (!squadRepos || squadRepos.length === 0) return;

    const commitCount = Array.isArray(commits) ? commits.length : 0;
    const branchName = ref ? ref.replace("refs/heads/", "") : "unknown";

    for (const squadRepo of squadRepos) {
      const [member] = await db
        .select()
        .from(squadMembers)
        .where(eq(squadMembers.squadId, squadRepo.squadId))
        .limit(1);

      if (member) {
        await activityService.log({
          userId: member.userId,
          action: "GITHUB_PUSH_RECEIVED",
          entityType: "SQUAD",
          entityId: squadRepo.squadId,
          squadId: squadRepo.squadId,
          description: `Push received on ${repository.full_name} (${branchName}, ${commitCount} commits)`,
        });
      }
    }
  }
}

export default new GithubWebhookService();
