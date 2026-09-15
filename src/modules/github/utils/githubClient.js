/**
 * githubClient.js
 *
 * Reusable GitHub REST API v3 client.
 *
 * Centralizes:
 *   - Bearer token injection  (token always comes from server-side decryption)
 *   - Required headers        (Accept, X-GitHub-Api-Version, User-Agent)
 *   - Timeout enforcement     (AbortController, 10 s default)
 *   - GitHub error mapping    (401 → 401, 403 → 403, 404 → 404, else → 502)
 *   - Response parsing
 *
 * SECURITY:
 *   - The `token` parameter is ALWAYS supplied by the server from the decrypted
 *     github_connections record. It is NEVER read from the HTTP request.
 *   - This file never logs the token value.
 */

import AppError from "../../../shared/errors/AppError.js";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const DEFAULT_TIMEOUT_MS = 10_000;

// ==========================================
// ERROR MAPPING
// ==========================================

/**
 * Maps a GitHub API HTTP status code to a safe AppError.
 * Never forwards the raw GitHub response body to callers.
 *
 * @param {number} status       — HTTP status from GitHub
 * @param {string} context      — human description of what was being fetched
 * @returns {AppError}
 */
function mapGithubError(status, context) {
  switch (status) {
    case 401:
      return new AppError(
        `GitHub authorization is invalid or expired. Please reconnect your GitHub account. (${context})`,
        401
      );
    case 403:
      return new AppError(
        `GitHub access denied. Your account may lack the required permissions. (${context})`,
        403
      );
    case 404:
      return new AppError(
        `The requested GitHub resource was not found. (${context})`,
        404
      );
    case 429:
      return new AppError(
        "GitHub API rate limit exceeded. Please try again later.",
        429
      );
    default:
      return new AppError(
        `GitHub API returned an unexpected error (HTTP ${status}). (${context})`,
        502
      );
  }
}

// ==========================================
// CORE REQUEST
// ==========================================

/**
 * Makes an authenticated GET request to the GitHub REST API.
 *
 * @param {object} params
 * @param {string}  params.path        — API path, e.g. "/user/orgs"
 * @param {string}  params.token       — Decrypted GitHub access token (server-side only)
 * @param {string}  [params.context]   — Human-readable context for error messages
 * @param {object}  [params.query]     — Additional URL query parameters
 * @param {number}  [params.timeoutMs] — Request timeout in milliseconds (default 10 000)
 * @returns {Promise<any>}             — Parsed JSON response body
 * @throws {AppError}                  — On GitHub errors, timeouts, or parse failures
 */
export async function githubGet({
  path,
  token,
  context = path,
  query = {},
  headers = {},
  responseType = "json",
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const url = new URL(`${GITHUB_API_BASE}${path}`);

  // Append any query parameters
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  // AbortController for timeout
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: {
        // Token injected server-side — NEVER from request input
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "DEVAI-Backend",
        ...headers,
      },
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AppError(
        `GitHub API request timed out after ${timeoutMs / 1000}s. (${context})`,
        504
      );
    }
    // Network-level failure
    throw new AppError(
      `Failed to reach the GitHub API. (${context})`,
      502
    );
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    throw mapGithubError(response.status, context);
  }

  // 204 No Content — return empty object
  if (response.status === 204) {
    return responseType === "text" ? "" : {};
  }

  if (responseType === "text") {
    try {
      return await response.text();
    } catch {
      throw new AppError(
        `GitHub API returned an unreadable response. (${context})`,
        502
      );
    }
  }

  try {
    return await response.json();
  } catch {
    throw new AppError(
      `GitHub API returned an unparseable response. (${context})`,
      502
    );
  }
}


// ==========================================
// CORE POST REQUEST
// ==========================================

/**
 * Makes an authenticated POST request to the GitHub REST API.
 *
 * @param {object} params
 * @param {string} params.path - API path, e.g. "/repos/:owner/:repo/issues"
 * @param {string} params.token - Decrypted GitHub access token (server-side only)
 * @param {object} params.body - JSON body payload
 * @param {string} [params.context] - Human-readable context for error messages
 * @param {number} [params.timeoutMs] - Request timeout in milliseconds (default 10 000)
 * @returns {Promise<any>} - Parsed JSON response body
 * @throws {AppError}
 */
export async function githubPost({
  path,
  token,
  body = {},
  context = path,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const url = new URL(`${GITHUB_API_BASE}${path}`);

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "DEVAI-Backend",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AppError(
        `GitHub API request timed out after ${timeoutMs / 1000}s. (${context})`,
        504
      );
    }
    throw new AppError(
      `Failed to reach the GitHub API. (${context})`,
      502
    );
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    throw mapGithubError(response.status, context);
  }

  if (response.status === 204) {
    return {};
  }

  try {
    return await response.json();
  } catch {
    throw new AppError(
      `GitHub API returned an unparseable response. (${context})`,
      502
    );
  }
}

// ==========================================
// PAGINATION HELPER
// ==========================================

/**
 * Fetches ALL pages of a paginated GitHub API endpoint using cursor-based
 * per_page / page parameters, up to a safety cap.
 *
 * @param {object} params        — same as githubGet, except `query.page` is managed internally
 * @param {number} [maxPages=10] — safety cap to prevent infinite loops
 * @returns {Promise<Array>}     — flat array of all items across all pages
 */
export async function githubGetAll({
  path,
  token,
  context,
  query = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxPages = 10,
}) {
  const perPage = query.per_page || 100;
  let page = 1;
  const allItems = [];

  while (page <= maxPages) {
    const items = await githubGet({
      path,
      token,
      context,
      query: { ...query, per_page: perPage, page },
      timeoutMs,
    });

    if (!Array.isArray(items) || items.length === 0) {
      break;
    }

    allItems.push(...items);

    // If we got fewer results than per_page, we're on the last page
    if (items.length < perPage) {
      break;
    }

    page++;
  }

  return allItems;
}
