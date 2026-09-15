import AppError from "../../../shared/errors/AppError.js";
import squadRepository from "../repositories/squad.repository.js";
import squadGithubRepoRepository from "../repositories/squadGithubRepo.repository.js";
import githubConnectionService from "../../github/services/githubConnection.service.js";
import { githubGet } from "../../github/utils/githubClient.js";

class SquadGithubRepoService {
  /**
   * Links a GitHub repository to a DEVAI squad.
   *
   * 1. Authenticate user & verify squad access (handled by middleware)
   * 2. Verify user has GitHub access (via decrypted token)
   * 3. Fetch authoritative repository information from GitHub API
   * 4. Prevent duplicate linking (409 Conflict)
   * 5. Create relationship
   */
  async linkRepository(userId, squadId, { githubRepositoryId, owner, repo }) {
    // 1. Verify squad exists
    const squad = await squadRepository.findById(squadId);
    if (!squad) {
      throw new AppError("Squad not found", 404);
    }

    // 2. Verify user has an active GitHub connection
    const token = await githubConnectionService.getDecryptedAccessToken(userId);

    // 3. Prevent duplicate linking by input repository ID
    const existing = await squadGithubRepoRepository.findBySquadAndRepoId(
      squadId,
      githubRepositoryId
    );
    if (existing) {
      throw new AppError("This GitHub repository is already linked to this squad", 409);
    }

    // 4. Fetch authoritative repository information from GitHub API
    // (Never trust repository metadata supplied by the frontend)
    const rawRepo = await githubGet({
      path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      token,
      context: `verifying repository "${owner}/${repo}" for squad link`,
    });

    if (!rawRepo || typeof rawRepo !== "object") {
      throw new AppError("GitHub repository unavailable or not found", 404);
    }

    const authoritativeId = String(rawRepo.id);

    // If the authoritative ID differs from client input, check duplicate against authoritative ID too
    if (authoritativeId !== String(githubRepositoryId)) {
      const existingByAuthId = await squadGithubRepoRepository.findBySquadAndRepoId(
        squadId,
        authoritativeId
      );
      if (existingByAuthId) {
        throw new AppError("This GitHub repository is already linked to this squad", 409);
      }
    }

    // 5. Create relationship with authoritative data
    const linkedRepo = await squadGithubRepoRepository.create({
      squadId,
      githubRepositoryId: authoritativeId,
      githubRepositoryName: rawRepo.name,
      githubOwner: rawRepo.owner?.login || owner,
      githubFullName: rawRepo.full_name,
      githubUrl: rawRepo.html_url,
    });

    return linkedRepo;
  }

  /**
   * Lists all GitHub repositories linked to a squad.
   */
  async listRepositories(squadId) {
    const squad = await squadRepository.findById(squadId);
    if (!squad) {
      throw new AppError("Squad not found", 404);
    }

    return await squadGithubRepoRepository.findAllBySquadId(squadId);
  }

  /**
   * Removes a linked GitHub repository from a squad.
   */
  async deleteRepository(squadId, id) {
    const squad = await squadRepository.findById(squadId);
    if (!squad) {
      throw new AppError("Squad not found", 404);
    }

    const record = await squadGithubRepoRepository.findById(id);
    if (!record || record.squadId !== squadId) {
      throw new AppError("Linked repository not found for this squad", 404);
    }

    await squadGithubRepoRepository.deleteById(id);
    return { id, message: "Repository unlinked successfully" };
  }
}

export default new SquadGithubRepoService();
