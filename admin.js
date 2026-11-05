let saAdmin = false;
let adminOwner = null;
let adminData = null;
let adminError = "";
let adminLoading = false;
let adminRequest = 0;
let adminTab = "applications";
let adminSelected = null;
function resetAdmin() {
  saAdmin = false;
  adminOwner = null;
  adminData = null;
  adminError = "";
  adminLoading = false;
  adminSelected = null;
  adminRequest++;
}
async function loadAdminAccess() {
  const owner = sharedUser?.id;
  if (!owner) {
    resetAdmin();
    return;
  }
  const { data, error } = await sharedClient
    .rpc("sa_admin_access")
    .abortSignal(AbortSignal.timeout(15000));
  if (sharedUser?.id !== owner) return;
  saAdmin = !error && data === true;
  adminOwner = owner;
  if (page === "account") render();
  if (page === "admin") await loadAdminDashboard();
}
async function loadAdminDashboard() {
  if (page !== "admin" || !sharedReady || !sharedUser) return;
  const request = ++adminRequest,
    owner = sharedUser.id;
  adminLoading = true;
  adminError = "";
  render();
  try {
    const { data, error } = await Promise.race([
      sharedClient
        .rpc("sa_admin_dashboard")
        .abortSignal(AbortSignal.timeout(15000)),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Dashboard connection timed out.")),
          16000,
        ),
      ),
    ]);
    if (request !== adminRequest || owner !== sharedUser?.id) return;
    if (error) throw error;
    saAdmin = true;
    adminOwner = owner;
    adminData = data;
  } catch (error) {
    if (request !== adminRequest) return;
    adminError =
      error.code === "42501"
        ? "This account does not have SA admin access."
        : "Could not load the dashboard. Please try again.";
    adminData = null;
    if (error.code === "42501") saAdmin = false;
  }
  if (request !== adminRequest) return;
  adminLoading = false;
  if (page === "admin") render();
}
function adminDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
}
function adminPage() {
  if (!sharedReady)
    return '<div class="container booking-page"><p role="status">Checking your sign-in…</p></div>';
  if (!sharedUser) {
    sessionStorage.setItem("sa-after-auth", "admin");
    return accountPage();
  }
  if (adminLoading || (!adminData && !adminError))
    return '<div class="container booking-page"><p role="status">Opening SA admin…</p></div>';
  if (adminError)
    return `<div class="container booking-page"><h1>SA admin</h1><p role="alert">${esc(adminError)}</p><button class="button outline" data-admin="refresh">Try again</button><a class="text-btn" href="#account">Your account</a></div>`;
  const rows = adminData.profiles,
    pending = rows.filter((row) => row.pending),
    listed = rows.filter((row) => row.published?.is_listed);
  const tabs = [
    ["applications", "Applications", pending.length],
    ["roster", "Roster", rows.filter((row) => row.published).length],
    ["attention", "Needs attention", adminData.attention.length],
  ];
  let content = "";
  if (adminTab === "attention") {
    content = `<section class="admin-attention"><p class="note">Past delivery dates and projects waiting seven days without activity. This overview does not open private messages or files.</p>${adminData.attention.map((project) => `<article class="journey-card"><div class="eyebrow orange">${esc(project.reason)}</div><h3>${esc(project.name)}</h3><p>${esc(project.pro_email)}</p><p class="note">${esc(statusLabel(project))} · Last activity ${adminDate(project.last_activity)}${project.due_date ? " · Agreed delivery " + esc(project.due_date) : ""}</p></article>`).join("") || '<section class="journey-card"><h2>Nothing needs a nudge.</h2><p>Overdue projects and long waits will appear here.</p></section>'}${adminData.attention.length === 100 ? '<p class="note">Showing the oldest 100 projects that need attention.</p>' : ""}</section>`;
  } else {
    const items =
      adminTab === "roster" ? rows.filter((row) => row.published) : pending;
    content = `<div class="admin-roster-list">${
      items
        .map((row) => {
          const p =
            adminTab === "roster" ? row.published.profile : row.draft_profile;
          return `<article class="journey-card admin-person"><div><div class="eyebrow orange">${adminTab === "roster" ? (row.published.is_listed ? (row.published.featured ? "Featured on SA" : "Live on roster") : "Listing paused") : "Ready for review"}</div><h3>${esc(p.name)}</h3><p>${esc(p.headline)}</p><div class="tags">${p.genres.map((g) => `<span>${esc(g)}</span>`).join("")}</div><p class="note">${esc(p.service)} · From ${money(p.price)} · ${adminDate(row.updated_at)}</p></div><button class="button outline small" data-admin="open" data-id="${row.owner_id}">${adminTab === "roster" ? "Manage profile" : "Review application"}</button></article>`;
        })
        .join("") ||
      `<section class="journey-card"><h2>${adminTab === "roster" ? "Your roster starts here." : "You’re all caught up."}</h2><p>${adminTab === "roster" ? "Approved professionals will appear here." : "New applications will appear when professionals submit their profiles."}</p></section>`
    }</div>`;
  }
  return `<div class="container booking-page sa-admin"><section class="page-title"><div class="eyebrow orange">Song Architect / Admin</div><h1>A little behind the scenes.</h1><p>Good people. Great work. Your seal of approval.</p></section><div class="admin-summary"><div><strong>${pending.length}</strong><span>To review</span></div><div><strong>${listed.length}</strong><span>Live profiles</span></div><div><strong>${adminData.attention.length}</strong><span>Need attention</span></div></div><div class="admin-toolbar"><div class="admin-tabs" role="group" aria-label="Dashboard section">${tabs.map(([id, label, count]) => `<button class="${adminTab === id ? "active" : ""}" data-admin="tab" data-tab="${id}" aria-pressed="${adminTab === id}">${label} <span>${count}</span></button>`).join("")}</div><button class="text-btn" data-admin="refresh">Refresh</button></div>${adminData.profile_total > 200 ? '<p class="note">Showing the first 200 profiles, with submitted applications first.</p>' : ""}${content}<p class="note">Checked ${adminDate(adminData.checked_at)}. Review notes are delivered inside the professional’s profile setup. Email notifications are coming later.</p></div>`;
}
async function openAdminProfile(id) {
  const row = adminData?.profiles.find((item) => item.owner_id === id);
  if (!row) return;
  adminSelected = row;
  const review = adminTab === "applications" && row.pending;
  const profile = review ? row.draft_profile : row.published.profile;
  openModal('<p role="status">Loading work examples…</p>');
  await prepareProSamples(profile, sharedUser?.id);
  if (
    adminSelected !== row ||
    page !== "admin" ||
    !sharedUser ||
    !$("#modal").open
  )
    return;
  const published = row.published;
  const paused = published && !published.is_listed;
  $("#modal-content").innerHTML =
    `<div class="eyebrow orange">${review ? "Application review" : "Roster management"}</div><h2>${esc(profile.name)}</h2><p>${esc(profile.headline)}</p><div class="tags">${profile.genres.map((g) => `<span>${esc(g)}</span>`).join("")}</div><p class="preserve-lines">${esc(profile.bio)}</p><section class="admin-package"><h3>${esc(profile.service)} · ${money(profile.price)}</h3><p class="preserve-lines">${esc(profile.scope)}</p><p class="note">${profile.days} days · ${profile.revisions} revision rounds · ${money(profile.hourly)} / hour for further work</p></section><h3>Previous work</h3>${profile.work.map((work) => `<article class="pro-work-preview"><h4>${esc(work.title)}</h4><p>${esc(work.credit)}</p>${work.audio_path ? (profileSampleURL(work.audio_path) ? `<audio data-pro-sample controls playsinline preload="none" src="${esc(profileSampleURL(work.audio_path))}" aria-label="Listen to ${esc(work.title)}"></audio>` : '<p class="note">Sample unavailable. Refresh the dashboard and try again.</p>') : ""}${work.url && profileWorkLink(work.url) ? `<a class="text-btn" target="_blank" rel="noopener noreferrer" href="${esc(work.url)}">Listen to release</a>` : ""}</article>`).join("")}
  ${row.review ? `<p class="note">Last decision ${esc(row.review.decision.replaceAll("_", " "))} · ${adminDate(row.review.updated_at)}${row.review.note ? "<br>" + esc(row.review.note) : ""}</p>` : ""}
  ${paused ? '<p class="pro-review-note">This listing is paused. Approving new profile copy keeps it paused until you restore it.</p>' : ""}
  <form id="admin-review-form"><label>Note for the professional ${review ? "(required when requesting changes)" : "(required when pausing)"}<textarea name="note" maxlength="1000" placeholder="Be specific and helpful."></textarea></label><p id="admin-review-error" class="note" role="alert"></p><div class="journey-actions">${review ? '<button class="button dark" name="action" value="approve">Approve profile</button><button class="button outline" name="action" value="changes">Request changes</button>' : `<button class="button outline" name="action" value="${paused ? "restore" : "pause"}">${paused ? "Restore listing" : "Pause listing"}</button>${!paused ? `<button class="button ${published.featured ? "outline" : "dark"}" name="action" value="${published.featured ? "unfeature" : "feature"}">${published.featured ? "Remove feature" : "Feature on roster"}</button>` : ""}`}</div></form><p class="note">${review ? "Approve only work and credits you have reviewed." : "Featuring gives the profile priority among matching roster results."} Changes take effect on the roster immediately.</p>`;
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-admin]");
  if (!button) return;
  if (button.dataset.admin === "refresh") loadAdminDashboard();
  if (button.dataset.admin === "tab") {
    adminTab = button.dataset.tab;
    render();
  }
  if (button.dataset.admin === "open")
    openAdminProfile(button.dataset.id).catch(() => {
      toast("Could not load this application. Refresh and try again.");
      closeModal();
    });
});
document.addEventListener("submit", (event) => {
  if (event.target.id !== "admin-review-form") return;
  event.preventDefault();
  const form = event.target,
    action = event.submitter?.value,
    row = adminSelected;
  if (!row || !action || form.dataset.busy) return;
  const note = new FormData(form).get("note").trim();
  if (["changes", "pause"].includes(action) && !note) {
    $("#admin-review-error").textContent =
      "Add a short note so the professional knows what needs to change.";
    return;
  }
  form.dataset.busy = "true";
  form.querySelectorAll("button").forEach((b) => (b.disabled = true));
  audioUploadBusy = true;
  $(".modal-close").disabled = true;
  sharedClient
    .rpc("sa_admin_review", {
      p_owner: row.owner_id,
      p_action: action,
      p_draft_version: row.draft_version,
      p_roster_version: row.published?.roster_version || 0,
      p_note: note,
    })
    .then(async ({ error }) => {
      if (error) throw error;
      audioUploadBusy = false;
      $(".modal-close").disabled = false;
      closeModal();
      adminSelected = null;
      await loadAdminDashboard();
      toast(
        {
          approve: "Profile approved.",
          changes: "Changes requested.",
          pause: "Listing paused.",
          restore: "Listing restored.",
          feature: "Profile featured.",
          unfeature: "Feature removed.",
        }[action],
      );
    })
    .catch((error) => {
      $("#admin-review-error").textContent =
        error.message || "Could not save this decision. Refresh and try again.";
    })
    .finally(() => {
      delete form.dataset.busy;
      form.querySelectorAll("button").forEach((b) => (b.disabled = false));
      audioUploadBusy = false;
      $(".modal-close").disabled = false;
    });
});
window.addEventListener("hashchange", () =>
  queueMicrotask(() => {
    if (page === "admin") {
      adminSelected = null;
      loadAdminDashboard();
    }
  }),
);
