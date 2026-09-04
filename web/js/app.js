// ─── CONFIG ─────────────────────────────────────────────────────────────────
// Replace with your actual Railway URL after deployment.
// Example: "https://kmpay-monitor.up.railway.app"
const RAILWAY_URL = "https://koneba-production.up.railway.app";
const API_URL = `${RAILWAY_URL}/status`;
const REFRESH_SECS = 35;   // match bot INTERVAL (30s) + small buffer

// ─── STATE ──────────────────────────────────────────────────────────────────
let countdown = REFRESH_SECS;
let timer = null;
let isFetching = false;

// ─── FETCH ──────────────────────────────────────────────────────────────────
async function fetchStatus() {
  if (isFetching) return;
  isFetching = true;
  setBtn(true);
  setBadge("connecting");

  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderData(data);
    hideError();
    setBadge(data.online ? "live" : "error");
  } catch (err) {
    console.error("[KMPay] Fetch failed:", err);
    showError();
    setBadge("error");
  } finally {
    isFetching = false;
    setBtn(false);
  }
}

// ─── RENDER ─────────────────────────────────────────────────────────────────
function renderData(d) {
  // Header
  setText("cycle-number", d.cycle > 0 ? `#${d.cycle}` : "—");
  setText("timestamp", d.timestamp ? `${d.timestamp} PHT` : "—");

  // Services
  setService("status-saveopt", d.services?.saveOpt);
  setService("status-phoneauth", d.services?.phoneAuth);

  // Homepage
  const hp = d.homepage || {};
  setText("hp-deposit", fmt(hp.deposit));
  setText("hp-wallet", fmt(hp.walletBalance));
  setText("hp-total", fmt(hp.totalBalance));
  setText("hp-income", fmt(hp.income));

  // Index info
  const ix = d.indexInfo || {};
  setText("idx-self-income", fmt(ix.selfIncome));
  setText("idx-team-income", fmt(ix.teamIncome));
  setText("idx-self-orders", ix.selfOrderQty ?? "N/A");
  setText("idx-team-orders", ix.teamOrderQty ?? "N/A");
  setText("idx-self-acc", ix.selfAccountNum ?? "N/A");
  setText("idx-team-acc", ix.teamAccountNum ?? "N/A");

  // Phone accounts
  renderPhones(d.phoneAccounts || []);
}

function renderPhones(accounts) {
  const container = document.getElementById("phone-accounts-list");
  if (!accounts.length) {
    container.innerHTML = '<div class="loading-state">No phone accounts found</div>';
    return;
  }
  container.innerHTML = accounts.map(acc => {
    const statusClass = acc.status === "enabled" ? "enabled" : "disabled";
    return `
      <div class="phone-card">
        <div class="phone-header">
          <span class="phone-icon">📱</span>
          <span class="phone-number">${esc(acc.phone)}</span>
          <span class="phone-bank">${esc(acc.bank)}</span>
          <span class="phone-status-badge ${statusClass}">${esc(acc.status)}</span>
        </div>
        <div class="phone-meta">
          <div class="phone-meta-item">
            <span class="phone-meta-label">Day Income</span>
            <span class="phone-meta-value">${fmt(acc.dayIncome)}</span>
          </div>
          <div class="phone-meta-item">
            <span class="phone-meta-label">Balance</span>
            <span class="phone-meta-value">${fmt(acc.balance)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? "—";
}

function setService(id, isOnline) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = isOnline ? "● ONLINE" : "● OFFLINE";
  el.className = `service-status ${isOnline ? "online" : "offline"}`;
}

function setBadge(state) {
  const badge = document.getElementById("live-badge");
  const label = document.getElementById("live-label");
  if (!badge || !label) return;
  badge.className = `live-badge ${state === "live" ? "" : state}`.trim();
  label.textContent =
    state === "live" ? "LIVE" :
      state === "error" ? "OFFLINE" :
        state === "connecting" ? "CONNECTING" : "LIVE";
}

function fmt(num) {
  if (num == null || num === "") return "—";
  const n = Number(num);
  if (isNaN(n)) return String(num);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setBtn(disabled) {
  const btn = document.getElementById("refresh-btn");
  if (btn) btn.disabled = disabled;
}

function showError() {
  const el = document.getElementById("error-banner");
  if (el) el.style.display = "block";
}

function hideError() {
  const el = document.getElementById("error-banner");
  if (el) el.style.display = "none";
}

// ─── COUNTDOWN ──────────────────────────────────────────────────────────────
function startCountdown() {
  clearInterval(timer);
  countdown = REFRESH_SECS;
  updateProgress();

  timer = setInterval(() => {
    countdown = Math.max(0, countdown - 1);
    setText("countdown", countdown);
    updateProgress();
    if (countdown <= 0) fetchNow();
  }, 1000);
}

function updateProgress() {
  const bar = document.getElementById("progress-fill");
  if (bar) bar.style.width = `${(countdown / REFRESH_SECS) * 100}%`;
}

// ─── PUBLIC ─────────────────────────────────────────────────────────────────
function fetchNow() {
  fetchStatus().then(() => startCountdown());
}

// ─── INIT ────────────────────────────────────────────────────────────────────
fetchNow();
