function sharedId() {
  return page.startsWith("shared-project-")
    ? page.slice("shared-project-".length)
    : null;
}
function sharedCurrent() {
  return sharedProjects.find((project) => project.id === sharedId());
}
function isProjectPro(project) {
  return sharedUser && project.pro_email === sharedUser.email.toLowerCase();
}
function sharedRoute() {
  return page === "workspace" || page.startsWith("shared-project-");
}

async function loadShared(quiet = false) {
  if (!sharedUser) return;
  const request = ++sharedRequest,
    owner = sharedUser.id;
  if (!quiet) {
    sharedLoading = true;
    sharedError = "";
    if (sharedRoute()) render();
  }
  try {
    const { data: projects, error } = await sharedClient
      .from("sa_market_projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    let versions = [],
      messages = [];
    if (sharedId()) {
      const results = await Promise.all([
        sharedClient
          .from("sa_market_versions")
          .select("*")
          .eq("project_id", sharedId())
          .order("created_at"),
        sharedClient
          .from("sa_market_messages")
          .select("*")
          .eq("project_id", sharedId())
          .order("created_at"),
      ]);
      for (const result of results) if (result.error) throw result.error;
      versions = await Promise.all(
        results[0].data.map(async (version) => ({
          ...version,
          audio_url: await audioVersionURL(version, owner),
        })),
      );
      messages = results[1].data;
    }
    if (request !== sharedRequest || owner !== sharedUser?.id) return;
    const changed =
      JSON.stringify([sharedProjects, sharedVersions, sharedMessages]) !==
      JSON.stringify([projects, versions, messages]);
    sharedProjects = projects;
    sharedVersions = versions;
    sharedMessages = messages;
    sharedError = "";
    sharedLoading = false;
    // Preserve drafts and playback during automatic refreshes.
    if (sharedRoute() && (!quiet || changed)) {
      const draft = $("#shared-message-form textarea")?.value;
      const audio = $("#shared-audio"),
        position = audio?.currentTime,
        paused = audio?.paused;
      const sourceVersion = audio?.dataset.versionId;
      const modal = $("#modal").open;
      if (!quiet || !modal) {
        render();
        if (draft && $("#shared-message-form textarea"))
          $("#shared-message-form textarea").value = draft;
        const replacement = $("#shared-audio");
        if (
          replacement &&
          sourceVersion === replacement.dataset.versionId &&
          position
        ) {
          replacement.addEventListener(
            "loadedmetadata",
            () => {
              replacement.currentTime = position;
              if (!paused) replacement.play().catch(() => {});
            },
            { once: true },
          );
        }
      }
    }
  } catch (error) {
    if (request !== sharedRequest || owner !== sharedUser?.id) return;
    sharedLoading = false;
    sharedError = error.message || "Could not load projects.";
    if (sharedRoute() && !quiet) render();
  }
}
function sharedIndex() {
  if (!sharedReady)
    return '<div class="container booking-page"><p role="status">Checking your sign-in…</p></div>';
  if (!sharedUser) return accountPage();
  return `<div class="container booking-page"><section class="page-title"><div class="eyebrow orange">Your workspace</div><h1>Your songs.</h1><p>Signed in as ${esc(sharedUser.email)}</p></section>
    <div class="journey-actions"><button class="button dark" data-shared="new">Start a project</button><button class="button outline small" data-shared="refresh">Refresh</button><a class="text-btn" href="#my-profile">My pro profile</a><a class="text-btn" href="#account">Your account</a></div>
    ${sharedError ? `<p role="alert">${esc(sharedError)}</p>` : ""}
    ${sharedLoading ? '<p role="status">Loading your projects…</p>' : `<div class="booking-project-list">${sharedProjects.map((project) => `<a class="journey-card project-link" href="#shared-project-${project.id}"><span><strong>${esc(project.name)}</strong><small>${isProjectPro(project) ? "You’re the professional" : "Artist · with " + esc(project.pro_email)}</small></span><span class="pill">${statusLabel(project)}</span></a>`).join("") || '<section class="journey-card"><h2>Your next song starts here.</h2><p>Create a brief and invite your professional by email. If you’ve been invited, sign in with that same email to see the project here.</p></section>'}</div>`}
    <p class="note">Projects are visible only to the artist and invited professional. Changes refresh automatically while you’re in the workspace.</p></div>`;
}
function sharedBrief(person) {
  if (!sharedUser) {
    accountMode = "signin";
    accountNotice = "Sign in or create an account to share your brief.";
    if (person?.profileId) {
      sessionStorage.setItem("sa-after-auth", "pro-" + person.profileId);
      sessionStorage.setItem("sa-profile-quote", person.profileId);
    }
    go("account");
    return;
  }
  openModal(`<div class="eyebrow orange">New project</div><h2>Tell us about your song.</h2>
    <p class="modal-intro">${person?.profileId ? "Request a quote from " + esc(person.name) + "." : "Invite the professional you want to work with using their sign-in email."}${person && !person.profileId ? " You came from " + esc(person.name) + "’s illustrative profile. Choose your actual collaborator below." : ""}</p>
    <form id="shared-brief-form" class="form-grid">
      <label class="full">Project name<input name="name" required maxlength="100"></label>
      ${person?.profileId ? '<input type="hidden" name="professional_id" value="' + person.profileId + '">' : '<label class="full">Professional’s email<input name="pro_email" type="email" required maxlength="254" placeholder="Your collaborator’s sign-in email"></label>'}
      <label>Your sound<select name="genre">${genres
        .slice(1)
        .map((genre) => `<option>${genre}</option>`)
        .join("")}</select></label>
      <label>What do you have so far?<select name="start">${[...startingPoints, { label: "I need mixing / mastering" }, { label: "I need session instruments" }, { label: "I need artwork or marketing" }].map((point) => `<option>${point.label}</option>`).join("")}</select></label>
      <label class="full">What would you like help with?<textarea name="brief" required maxlength="2000" placeholder="Your sound, your references and what you need next…"></textarea></label>
      <label class="full">Reference link (optional)<input type="url" name="reference" placeholder="https://"></label>
      <label>Budget<select name="budget"><option>Help me scope it</option><option>Under £500</option><option>£500–£1,500</option><option>£1,500–£3,000</option><option>£3,000+</option></select></label>
      <label>Preferred completion (optional)<input name="date" type="date" min="${todayDate()}"></label>
      <p class="note full">${person?.profileId ? "This brief goes to " + esc(person.name) + " in their workspace." : "Your collaborator will see this project when they sign in with the email above. Share the project link with them."}</p>
      <p class="note full" id="shared-form-error" role="alert"></p><button class="button dark full">Share brief</button>
    </form>`);
}
function quoteShared(project) {
  const selectedPackage = project.brief.package;
  const q = project.quote ||
    (selectedPackage
      ? {
          price: selectedPackage.price,
          scope: selectedPackage.scope,
          date: "",
          revisions: selectedPackage.revisions,
          hourly: selectedPackage.hourly,
          rights: "",
        }
      : null) || {
      price: 650,
      scope: "",
      date: "",
      revisions: 2,
      hourly: 50,
      rights: "",
    };
  openModal(`<div class="eyebrow orange">Quote / ${esc(project.name)}</div><h2>Make the offer clear.</h2><form id="shared-quote-form" data-project-version="${project.row_version}" class="form-grid">
    <label class="full">What you’ll deliver<textarea name="scope" required maxlength="2000">${esc(q.scope)}</textarea></label>
    <label>Total price in GBP<input name="price" type="number" min="25" max="50000" step="0.01" required value="${q.price}"></label>
    <label>Completion date<input name="date" type="date" min="${todayDate()}" required value="${q.date}"></label>
    <label>Included revision rounds<input name="revisions" type="number" min="0" max="20" step="1" required value="${q.revisions}"></label>
    <label>Extra work per hour in GBP<input name="hourly" type="number" min="1" max="1000" step="0.01" required value="${q.hourly}"></label>
    <label class="full">Credits, usage rights and any splits<textarea required name="rights" maxlength="2000" placeholder="Agree what the artist can release and monetise, credits and any ownership or songwriting splits.">${esc(q.rights)}</textarea></label>
    <p class="note full" id="shared-quote-net">SA fee 10% · Your share ${bookingAmounts(q.price)[2]} before separate processing costs or taxes.</p>
    <p class="note full" id="shared-form-error" role="alert"></p><button class="button dark full">Send quote for review</button></form>`);
  $("#shared-quote-form").elements.price.oninput = (event) => {
    $("#shared-quote-net").textContent = event.target.validity.valid
      ? "SA fee 10% · Your share " +
        bookingAmounts(event.target.valueAsNumber)[2] +
        " before separate processing costs or taxes."
      : "Enter a price between £25 and £50,000.";
  };
}
function sharedQuotePanel(project) {
  const q = project.quote,
    pro = isProjectPro(project);
  return `<section class="journey-card"><div class="eyebrow orange">Scope &amp; quote</div><h2>${money(q.price)} <small class="quote-currency">GBP</small></h2><p class="preserve-lines">${esc(q.scope)}</p>
    <dl class="scope-grid"><div><dt>Completion</dt><dd>${dateLabel(q.date)}</dd></div><div><dt>Revisions</dt><dd>${q.revisions} rounds</dd></div><div><dt>Extra work</dt><dd>${money(q.hourly)} / hour</dd></div></dl>
    <h3>Credits and rights</h3><p class="preserve-lines">${esc(q.rights)}</p>
    ${pro ? `<p class="note">SA fee 10% · ${bookingAmounts(q.price)[1]}<br>Your share ${bookingAmounts(q.price)[2]} before separate processing costs or taxes.</p>` : ""}
    ${project.status === "quoted" ? `<button class="button dark" data-shared="${pro ? "quote" : "accept"}">${pro ? "Edit quote" : "Accept scope"}</button><p class="note">This is an early access test. No payment is collected.</p>` : ""}
    <p class="note">${project.revision_requests} of ${q.revisions} revision rounds used. Extra work needs a separate agreed estimate.</p></section>`;
}
function sharedProjectPage() {
  if (!sharedReady || !sharedUser) return accountPage();
  const project = sharedCurrent();
  if (sharedLoading && !project)
    return '<div class="container booking-page"><p role="status">Loading your project…</p></div>';
  if (!project)
    return `<div class="container booking-page"><h1>Project unavailable.</h1><p>Sign in with the email invited to this project, or ask your collaborator to check the address.</p>${sharedError ? `<p role="alert">${esc(sharedError)}</p>` : ""}<a class="button dark" href="#workspace">Your projects</a></div>`;
  const pro = isProjectPro(project),
    working = ["active", "review", "complete"].includes(project.status);
  const selected =
    sharedVersions.find((version) => version.id === state.sharedVersionId) ||
    sharedVersions.at(-1);
  return `<div class="container booking-page"><a class="text-btn" href="#workspace">All projects</a><section class="page-title"><div class="eyebrow orange">${pro ? "Your role / Professional" : "Your role / Artist"}</div><h1>${esc(project.name)}</h1><p>${statusLabel(project)}</p></section>
    <div class="journey-actions"><button class="text-btn" data-shared="copy">Copy project link</button><button class="text-btn" data-shared="refresh">Refresh</button></div>
    ${sharedError ? `<p role="alert">${esc(sharedError)}</p>` : ""}
    <ol class="booking-progress">${["Brief", "Quote", "Make the song"].map((label, index) => `<li ${index === (project.status === "brief" ? 0 : project.status === "quoted" ? 1 : 2) ? 'aria-current="step"' : ""}>${index + 1} · ${label}</li>`).join("")}</ol>
    <div class="booking-columns"><div>
    ${
      working
        ? `<section class="journey-card"><h2>Listen &amp; leave notes</h2>
      ${selected ? `<div class="journey-actions">${sharedVersions.map((version) => `<button class="chip" aria-pressed="${selected.id === version.id}" data-shared="version" data-id="${version.id}">${esc(version.name)}</button>`).join("")}</div>${audioVersionPlayer(selected)}<p>${esc(selected.notes)}</p>` : `<p>${pro ? "Add your first version when it’s ready." : "Your professional will add the first version here."}</p>`}
      ${pro && project.status !== "complete" ? '<button class="button outline small" data-shared="delivery">Upload audio version</button>' : ""}
      ${project.status === "review" && !pro ? '<div class="journey-actions"><button class="button dark small" data-shared="approve">Approve delivery</button><button class="button outline small" data-shared="revision">Request changes</button></div>' : ""}
      ${project.status === "complete" ? '<p class="pill">Delivery approved</p>' : ""}</section>`
        : ""
    }
    <section class="journey-card"><h2>Project messages</h2><div class="booking-messages" aria-label="Project conversation">
      ${sharedMessages.map((message) => `<article class="booking-message"><strong>${message.author_id === sharedUser.id ? "You" : message.sender_role === "pro" ? "Professional" : "Artist"}</strong><small>${new Date(message.created_at).toLocaleString("en-GB")}</small>${message.version_id ? `<button class="time-link" data-shared="seek" data-id="${message.version_id}" data-seconds="${message.seconds}">${esc(sharedVersions.find((version) => version.id === message.version_id)?.name || "Version")} · ${formatSongTime(message.seconds)}</button>` : ""}<p class="preserve-lines">${esc(message.body)}</p></article>`).join("") || '<p class="note">Ask a question or clarify the brief here.</p>'}</div>
      <form id="shared-message-form"><label>Message<textarea name="message" required maxlength="4000"></textarea></label>${selected ? '<label class="setting-check"><input type="checkbox" name="timestamp"> Attach current playback time</label>' : ""}<button class="button dark small">Send message</button><p class="note" role="alert" id="shared-message-error"></p></form>
    </section></div><aside>
      ${project.quote ? sharedQuotePanel(project) : `<section class="journey-card"><h2>${pro ? "Ready to quote?" : "Your brief is shared."}</h2><p>${pro ? "Confirm what you’ll deliver, what it costs and when it’s ready." : "Your professional can now review the brief and prepare an offer."}</p>${pro ? '<button class="button dark" data-shared="quote">Create quote</button>' : ""}</section>`}
      <details class="journey-card" ${working ? "" : "open"}><summary><strong>The brief</strong></summary><p>${esc(project.brief.genre)} · ${esc(project.brief.start)}</p><p class="preserve-lines">${esc(project.brief.brief)}</p><p>Budget ${esc(project.brief.budget)}<br>Preferred date ${dateLabel(project.brief.date)}</p>${referenceLink(project.brief.reference)}</details>
    </aside></div></div>`;
}
async function updateSharedProject(project, changes) {
  const { data, error } = await sharedClient
    .from("sa_market_projects")
    .update({ ...changes, row_version: project.row_version + 1 })
    .eq("id", project.id)
    .eq("row_version", project.row_version)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error(
      "This project has changed. Refresh to see the latest version before trying again.",
    );
}
function sharedDeliveryForm(project) {
  openModal(audioDeliveryFields());
  bindAudioDelivery($("#shared-delivery-form"));
}
async function sharedFormAction(form, action) {
  const button = form.querySelector("button:not([type]),button[type=submit]");
  if (button.disabled) return;
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    const notice = form.querySelector("[role=alert]");
    if (notice)
      notice.textContent = error.message || "Could not save. Try again.";
    else toast(error.message || "Could not save. Try again.");
  } finally {
    button.disabled = false;
  }
}
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (
    ![
      "shared-brief-form",
      "shared-quote-form",
      "shared-delivery-form",
      "shared-message-form",
      "shared-revision-form",
    ].includes(form.id)
  )
    return;
  event.preventDefault();
  const current = sharedCurrent(),
    values = Object.fromEntries(new FormData(form));
  const project =
    current && form.dataset.projectVersion
      ? { ...current, row_version: Number(form.dataset.projectVersion) }
      : current;
  sharedFormAction(form, async () => {
    if (form.id === "shared-brief-form") {
      if (
        values.pro_email?.trim().toLowerCase() ===
        sharedUser.email.toLowerCase()
      )
        throw new Error(
          "Invite a different email so each collaborator has their own login.",
        );
      const id = form.dataset.requestId || crypto.randomUUID();
      form.dataset.requestId = id;
      if (values.professional_id) {
        const { error } = await sharedClient.rpc("sa_request_profile_quote", {
          p_pro: values.professional_id,
          p_request: id,
          p_brief: values,
        });
        if (error) throw error;
        closeModal();
        go("shared-project-" + id);
        await loadShared();
        return;
      }
      const row = {
        id,
        artist_id: sharedUser.id,
        pro_email: values.pro_email.trim().toLowerCase(),
        name: values.name.trim(),
        brief: values,
      };
      const { error } = await sharedClient
        .from("sa_market_projects")
        .insert(row);
      if (error && error.code !== "23505") throw error;
      closeModal();
      go("shared-project-" + id);
      await loadShared();
      return;
    }
    if (!project) throw new Error("Refresh this project before continuing.");
    if (form.id === "shared-quote-form") {
      await updateSharedProject(project, {
        status: "quoted",
        quote: {
          ...values,
          price: Number(values.price),
          revisions: Number(values.revisions),
          hourly: Number(values.hourly),
        },
      });
      closeModal();
    } else if (form.id === "shared-delivery-form") {
      if (form.dataset.source !== "link") {
        await uploadAudioDelivery(form, project, values);
      } else {
        if (new URL(values.url).protocol !== "https:")
          throw new Error("Use a direct HTTPS audio file URL.");
        const id = form.dataset.requestId || crypto.randomUUID();
        form.dataset.requestId = id;
        const { error } = await sharedClient.rpc("sa_market_deliver", {
          p_id: project.id,
          p_version: project.row_version,
          p_delivery_id: id,
          p_name: values.name.trim(),
          p_url: values.url,
          p_notes: values.notes.trim(),
        });
        if (error) throw error;
      }
      closeModal();
    } else if (form.id === "shared-revision-form") {
      const id = form.dataset.requestId || crypto.randomUUID();
      form.dataset.requestId = id;
      const { error } = await sharedClient.rpc("sa_market_revision", {
        p_id: project.id,
        p_version: project.row_version,
        p_message_id: id,
        p_body: "Revision request — " + values.notes.trim(),
      });
      if (error) throw error;
      closeModal();
    } else {
      const id = form.dataset.requestId || crypto.randomUUID();
      form.dataset.requestId = id;
      const row = {
        id,
        project_id: project.id,
        author_id: sharedUser.id,
        sender_role: isProjectPro(project) ? "pro" : "artist",
        body: values.message.trim(),
      };
      const version =
        sharedVersions.find(
          (version) => version.id === state.sharedVersionId,
        ) || sharedVersions.at(-1);
      if (values.timestamp && version)
        Object.assign(row, {
          version_id: version.id,
          seconds: Math.floor($("#shared-audio").currentTime),
        });
      const { error } = await sharedClient
        .from("sa_market_messages")
        .insert(row);
      if (error && error.code !== "23505") throw error;
      form.reset();
      delete form.dataset.requestId;
    }
    if (form.id === "shared-message-form") {
      await loadShared(true);
    } else await loadShared();
  });
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-shared]");
  if (!button) return;
  const project = sharedCurrent();
  switch (button.dataset.shared) {
    case "new":
      sharedBrief();
      break;
    case "refresh-audio":
      signedAudioCache.clear();
      loadShared();
      break;
    case "refresh":
      loadShared();
      break;
    case "quote":
      if (project && isProjectPro(project)) quoteShared(project);
      break;
    case "copy":
      navigator.clipboard
        .writeText(location.href)
        .then(() => toast("Project link copied."))
        .catch(() => toast("Copy the project address from your browser."));
      break;
    case "accept":
    case "approve":
      if (!project || isProjectPro(project)) break;
      signedAccountAction(async () => {
        await updateSharedProject(project, {
          status: button.dataset.shared === "accept" ? "active" : "complete",
        });
        await loadShared();
      }, button);
      break;
    case "delivery":
      if (project && isProjectPro(project)) {
        sharedDeliveryForm(project);
        $("#shared-delivery-form").dataset.projectVersion = project.row_version;
      }
      break;
    case "revision":
      if (!project || isProjectPro(project)) break;
      if (project.revision_requests >= project.quote.revisions) {
        toast(
          "Included rounds are used. Agree an estimate in messages before any extra work.",
        );
        break;
      }
      openModal(
        '<h2>What needs changing?</h2><form id="shared-revision-form"><label>Keep your notes together<textarea name="notes" required maxlength="2000"></textarea></label><p class="note" id="shared-form-error" role="alert"></p><button class="button dark">Send revision request</button></form>',
      );
      $("#shared-revision-form").dataset.projectVersion = project.row_version;
      break;
    case "sample": {
      const form = $("#shared-delivery-form");
      form.elements.name.value =
        "Sample version " + (sharedVersions.length + 1);
      form.elements.url.value =
        "https://songarchitect.co.uk/assets/daylight-" +
        (sharedVersions.length ? "v2" : "v1") +
        ".wav";
      form.elements.notes.value =
        "Daylight sample instrumental, added for testing.";
      break;
    }
    case "version":
    case "seek":
      if (!sharedVersions.some((version) => version.id === button.dataset.id))
        break;
      state.sharedVersionId = button.dataset.id;
      render();
      if (button.dataset.shared === "seek") {
        const audio = $("#shared-audio");
        const seek = () =>
          (audio.currentTime = Math.min(
            Number(button.dataset.seconds),
            audio.duration || 0,
          ));
        if (audio.readyState) seek();
        else audio.addEventListener("loadedmetadata", seek, { once: true });
      }
      break;
  }
});
window.addEventListener("hashchange", () => {
  queueMicrotask(() => {
    if (sharedRoute() && sharedUser) loadShared();
  });
});
window.addEventListener("focus", () => {
  if (sharedRoute() && sharedUser) loadShared(true);
});
setInterval(() => {
  if (sharedRoute() && sharedUser && document.visibilityState === "visible")
    loadShared(true);
}, 6000);
document.addEventListener(
  "error",
  (event) => {
    if (event.target.id !== "shared-audio") return;
    const note = document.createElement("p");
    note.className = "note";
    note.setAttribute("role", "status");
    note.textContent =
      "This audio could not be played. Refresh the project to renew playback, or ask your collaborator for an MP3 version.";
    event.target.after(note);
  },
  true,
);
