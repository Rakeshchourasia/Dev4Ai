/**
 * Dev4AI Enterprise PM Dashboard - Client Application
 * Vanilla JS application for the standalone dashboard UI
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants & State
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = window.location.origin;
let authToken = null;
let currentUser = null;

// ─────────────────────────────────────────────────────────────────────────────
// API Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

async function handleLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    authToken = result.data.accessToken;
    currentUser = result.data.user;
    closeModal("authModal");
    loadBoard();
    loadActivityFeed();
  } catch (err) {
    alert("Login failed: " + err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tickets & Kanban
// ─────────────────────────────────────────────────────────────────────────────

async function handleCreateTicket() {
  const title = document.getElementById("ticketTitle").value;
  const description = document.getElementById("ticketDescription").value;
  const priority = document.getElementById("ticketPriority").value;

  try {
    await apiRequest("/tickets", {
      method: "POST",
      body: JSON.stringify({ title, description, priority, status: "TODO" }),
    });
    closeModal("createTicketModal");
    loadBoard();
  } catch (err) {
    alert("Failed to create ticket: " + err.message);
  }
}

async function changeStatus(ticketId, newStatus) {
  try {
    await apiRequest(`/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    loadBoard();
  } catch (err) {
    console.error("Failed to change status:", err);
  }
}

async function loadBoard() {
  if (!authToken) return;

  try {
    const result = await apiRequest("/tickets");
    const tickets = result.data || [];

    const columns = {
      TODO: document.getElementById("col-todo"),
      IN_PROGRESS: document.getElementById("col-in-progress"),
      DONE: document.getElementById("col-done"),
    };

    // Clear existing cards (keep headers)
    Object.values(columns).forEach((col) => {
      const cards = col.querySelectorAll(".ticket-card");
      cards.forEach((card) => card.remove());
    });

    tickets.forEach((ticket) => {
      const column = columns[ticket.status];
      if (!column) return;

      const card = document.createElement("div");
      card.className = "ticket-card";
      card.innerHTML = `
        <div class="ticket-title">${escapeHtml(ticket.title)}</div>
        <div class="ticket-meta">${ticket.priority} · ${ticket.status}</div>
      `;
      column.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load board:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Feed
// ─────────────────────────────────────────────────────────────────────────────

async function loadActivityFeed() {
  if (!authToken) return;

  try {
    const result = await apiRequest("/activities");
    const activities = result.data || [];
    const list = document.getElementById("activity-feed-list");
    list.innerHTML = "";

    activities.slice(0, 10).forEach((log) => {
      const item = document.createElement("div");
      item.style.cssText =
        "padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text-muted)";
      item.textContent = `${log.action}: ${log.description || ""}`;
      list.appendChild(item);
    });
  } catch (err) {
    console.error("Failed to load activity feed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal Helpers
// ─────────────────────────────────────────────────────────────────────────────

function showModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "flex";
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

// Close modal on backdrop click
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  console.log("Dev4AI Enterprise PM Dashboard initialized");
});
