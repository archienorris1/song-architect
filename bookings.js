const proTerms = {
  eli: {
    days: 14,
    revisions: 2,
    hourly: 50,
    scope: "Production and arrangement, instrumental mix and separate stems",
  },
  maya: {
    days: 5,
    revisions: 2,
    hourly: 40,
    scope: "Lead vocal, harmonies and dry vocal stems",
  },
  noah: {
    days: 7,
    revisions: 2,
    hourly: 45,
    scope: "Stereo mix, instrumental mix and final master",
  },
  jules: {
    days: 14,
    revisions: 2,
    hourly: 50,
    scope: "Production with live instruments and separate stems",
  },
  imani: {
    days: 7,
    revisions: 2,
    hourly: 45,
    scope: "Songwriting session, lyric sheet and melody guide",
  },
  lucas: {
    days: 14,
    revisions: 2,
    hourly: 50,
    scope:
      "Production and guitar arrangement, instrumental mix and separate stems",
  },
};

function allBookings() {
  return Array.isArray(state.bookings) ? state.bookings : [];
}
function activeBooking() {
  return allBookings().find((item) => item.id === state.activeBookingId);
}
function commitBooking(booking) {
  const next = {
    ...state,
    bookings: [
      ...allBookings().filter((item) => item.id !== booking.id),
      booking,
    ],
    activeBookingId: booking.id,
  };
  try {
    localStorage.setItem("sa-concept", JSON.stringify(next));
    Object.assign(state, next);
    return true;
  } catch {
    toast("Could not save. Free some browser storage and try again.");
    return false;
  }
}
function todayDate() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
function dateLabel(date) {
  return date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(date + "T12:00:00"))
    : "To agree";
}
function statusLabel(booking) {
  return {
    brief: "Brief ready",
    quoted: "Quote ready",
    active: "In progress",
    review: "Ready for approval",
    complete: "Completed",
  }[booking.status];
}
function bookingProfile(person) {
  const terms = proTerms[person.id];
  return `<div class="container booking-page"><a class="text-btn" href="#talent">Back to roster</a>
    <section class="profile-intro"><div class="profile-avatar" style="background:${person.bg}" aria-hidden="true">${person.initials}</div>
    <div><div class="eyebrow orange">Illustrative professional profile</div><h1>${person.name}</h1><p>${person.role}</p>${endorsement()}<div class="tags">${person.genres.map((genre) => `<span>${genre}</span>`).join("")}</div></div></section>
    <div class="booking-columns"><section class="journey-card"><h2>Hear the direction.</h2><p>${person.style}</p>
      <audio controls preload="metadata" src="assets/daylight-v2.wav" aria-label="Site demonstration instrumental"></audio>
      <p class="note">Site demonstration audio. This is an illustrative profile, and this audio is not presented as ${person.name}’s portfolio.</p>
      <h3>Before we start</h3><p>Share your demo and references. We’ll agree the deliverables, credits and rights in the quote.</p></section>
    <section class="journey-card"><div class="eyebrow orange">${person.roles[0]}</div><h2>From ${money(person.rate)}</h2><p>${terms.scope}.</p>
      <dl class="scope-grid"><div><dt>Turnaround</dt><dd>${terms.days} days</dd></div><div><dt>Revisions</dt><dd>${terms.revisions} rounds</dd></div><div><dt>Extra work</dt><dd>${money(terms.hourly)} / hour</dd></div></dl>
      <button class="button dark" data-booking="brief" data-person="${person.id}">Tell ${person.name.split(" ")[0]} about your song</button><p class="note">Review a quote before booking. Extra work needs your approval.</p></section></div></div>`;
}
function localBookingBrief(person) {
  const draft = state.bookingDrafts?.[person.id] || {};
  openModal(`<div class="eyebrow orange">Your brief / ${person.name}</div><h2>Tell us about your song.</h2><p class="modal-intro">A few details to help scope the work. This demo saves on your device.</p>
    <form id="brief-form" class="form-grid">
    <label class="full">Song or project name<input name="name" required maxlength="70" value="${esc(draft.name || "")}" placeholder="Working titles are welcome"></label>
    <label>Your sound<select name="genre">${genres
      .slice(1)
      .map(
        (genre) =>
          `<option ${genre === (draft.genre || person.genres[0]) ? "selected" : ""}>${genre}</option>`,
      )
      .join("")}</select></label>
    <label>What do you have so far?<select name="start">${["An idea or voice note", "A written song / demo", "A produced track", "A finished master", "I need session vocals", "I need session instruments", "I need mixing / mastering", "I need artwork or marketing"].map((start) => `<option ${start === draft.start ? "selected" : ""}>${start}</option>`).join("")}</select></label>
    <label class="full">What would you like help with?<textarea name="brief" required maxlength="1500" placeholder="Your sound, your references and what you need next…">${esc(draft.brief || "")}</textarea></label>
    <label class="full">Demo or reference link (optional)<input type="url" name="reference" value="${esc(draft.reference || "")}" placeholder="https://"></label>
    <label>Budget<select name="budget">${["Under £500", "£500–£1,500", "£1,500–£3,000", "£3,000+", "Help me scope it"].map((budget) => `<option ${budget === (draft.budget || "Help me scope it") ? "selected" : ""}>${budget}</option>`).join("")}</select></label>
    <label>Preferred completion date (optional)<input name="date" type="date" min="${todayDate()}" value="${esc(draft.date || "")}"></label>
    <div class="full journey-actions"><button class="button dark">Create brief</button><button class="text-btn" type="button" id="booking-save-draft">Save for later</button></div></form>`);
  const form = $("#brief-form");
  $("#booking-save-draft").onclick = () => {
    const drafts = {
      ...state.bookingDrafts,
      [person.id]: Object.fromEntries(new FormData(form)),
    };
    try {
      localStorage.setItem(
        "sa-concept",
        JSON.stringify({ ...state, bookingDrafts: drafts }),
      );
      state.bookingDrafts = drafts;
      closeModal();
      toast("Draft saved on this device.");
    } catch {
      toast("Could not save. Free some browser storage and try again.");
    }
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    const brief = Object.fromEntries(new FormData(form));
    brief.name = brief.name.trim();
    brief.brief = brief.brief.trim();
    if (!brief.name || !brief.brief) return;
    const booking = {
      id: crypto.randomUUID(),
      personId: person.id,
      brief,
      status: "brief",
      messages: [],
      versions: [],
      revisionRequests: 0,
    };
    if (!commitBooking(booking)) return;
    closeModal();
    go("project");
  };
}
function projectIndex() {
  return `<div class="container booking-page"><section class="page-title"><div class="eyebrow orange">${audience === "pro" ? "Professional workspace" : "Your workspace"}</div><h1>Your songs.</h1><p>Briefs, quotes and the work in progress.</p></section>
    <p class="note">Working demo. Projects stay on this device. Switch between artist and pro to try both sides.</p>
    <div class="booking-project-list">${
      allBookings()
        .slice()
        .reverse()
        .map(
          (booking) =>
            `<button class="journey-card project-link" data-booking="open" data-id="${booking.id}"><span><strong>${esc(booking.brief.name)}</strong><small>${people.find((person) => person.id === booking.personId).name}</small></span><span class="pill">${statusLabel(booking)}</span></button>`,
        )
        .join("") ||
      '<div class="journey-card"><h2>Start with the right person.</h2><p>Find a pro whose sound fits, then share a short brief.</p><a class="button dark" href="#talent">Find a music pro</a></div>'
    }</div>
    <details class="booking-legacy"><summary>Explore the original release demo</summary><p><a href="#release-demo">Artist release journey</a> · <a href="#pro-demo">Pro workspace example</a></p></details></div>`;
}
function referenceLink(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      ? `<a class="text-btn" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">Open reference</a>`
      : "";
  } catch {
    return "";
  }
}
function quotePanel(booking) {
  const quote = booking.quote;
  return `<section class="journey-card"><div class="eyebrow orange">Scope &amp; quote</div><h2>${money(quote.price)} <small class="quote-currency">GBP</small></h2><p class="preserve-lines">${esc(quote.scope)}</p>
    <dl class="scope-grid"><div><dt>Completion</dt><dd>${dateLabel(quote.date)}</dd></div><div><dt>Revisions</dt><dd>${quote.revisions} rounds</dd></div><div><dt>Extra work</dt><dd>${money(quote.hourly)} / hour</dd></div></dl><h3>Credits and rights</h3><p class="preserve-lines">${esc(quote.rights)}</p>
    ${audience === "pro" ? `<p class="note">SA fee 10% · ${bookingAmounts(quote.price)[1]}<br>Your share ${bookingAmounts(quote.price)[2]} before separate processing costs or taxes.</p>` : ""}
    ${booking.status === "quoted" ? `<button class="button dark" data-booking="${audience === "pro" ? "quote" : "accept"}">${audience === "pro" ? "Edit quote" : "Accept scope in demo"}</button><p class="note">Accepting starts the demo project. No payment is collected.</p>` : ""}
    <p class="note">${booking.revisionRequests} revision requests used. Extra work requires an approved estimate.</p></section>`;
}
function projectMessages(booking, person) {
  return (
    booking.messages
      .map(
        (
          message,
        ) => `<article class="booking-message"><strong>${message.sender === "pro" ? person.name : "You / artist"}</strong><small>${new Date(message.at).toLocaleString("en-GB")}</small>
    ${message.versionId ? `<button class="time-link" data-booking="seek" data-id="${message.versionId}" data-seconds="${message.seconds}">${esc(booking.versions.find((version) => version.id === message.versionId)?.name || "Version")} · ${formatSongTime(message.seconds)}</button>` : ""}
    <p class="preserve-lines">${esc(message.text)}</p></article>`,
      )
      .join("") ||
    '<p class="note">Ask a question or clarify the brief here.</p>'
  );
}
function projectPage() {
  const booking = activeBooking();
  if (!booking) return projectIndex();
  const person = people.find((person) => person.id === booking.personId);
  const isPro = audience === "pro";
  const working = ["active", "review", "complete"].includes(booking.status);
  const selected =
    booking.versions.find((version) => version.id === state.bookingVersionId) ||
    booking.versions.at(-1);
  return `<div class="container booking-page"><a class="text-btn" href="#workspace">All projects</a>
    <section class="page-title"><div class="eyebrow orange">${isPro ? "Professional view" : "Artist view"} / ${person.name}</div><h1>${esc(booking.brief.name)}</h1><p>${statusLabel(booking)}</p></section>
    <div class="booking-view-switch"><span>Try the other side of this demo</span><button class="text-btn" data-booking="switch">${isPro ? "View as artist" : "View as " + person.name.split(" ")[0]}</button></div>
    <ol class="booking-progress">${["Brief", "Quote", "Make the song"].map((label, index) => `<li ${index === (booking.status === "brief" ? 0 : booking.status === "quoted" ? 1 : 2) ? 'aria-current="step"' : ""}>${index + 1} · ${label}</li>`).join("")}</ol>
    <div class="booking-columns"><div>
    ${
      working
        ? `<section class="journey-card"><h2>Listen &amp; leave notes</h2>
      ${selected ? `<div class="journey-actions">${booking.versions.map((version) => `<button class="chip" aria-pressed="${selected.id === version.id}" data-booking="version" data-id="${version.id}">${esc(version.name)}</button>`).join("")}</div><audio id="booking-audio" controls preload="metadata" src="${esc(selected.url)}" aria-label="${esc(selected.name)}"></audio><p>${esc(selected.notes)}</p>` : `<p>${isPro ? "Add the first version when it’s ready." : person.name.split(" ")[0] + " will add the first version here."}</p>`}
      ${isPro && booking.status !== "complete" ? '<button class="button outline small" data-booking="delivery">Add an audio version</button>' : ""}
      ${booking.status === "review" && !isPro ? '<div class="journey-actions"><button class="button dark small" data-booking="approve">Approve delivery</button><button class="button outline small" data-booking="revision">Request changes</button></div>' : ""}
      ${booking.status === "complete" ? '<p class="pill">Delivery approved</p>' : ""}</section>`
        : ""
    }
    <section class="journey-card"><h2>Project messages</h2><div class="booking-messages" aria-label="Project conversation">${projectMessages(booking, person)}</div>
      <form id="booking-message-form"><label>Message<textarea name="message" maxlength="2000" required placeholder="Keep everything about the song here…"></textarea></label>
      ${selected ? '<label class="setting-check"><input type="checkbox" name="timestamp"> Attach current playback time</label>' : ""}<button class="button dark small">Save message</button></form><p class="note">Saved on this device in the demo.</p></section></div>
    <aside>${booking.quote ? quotePanel(booking) : `<section class="journey-card"><h2>${isPro ? "Ready to quote?" : "Your brief is ready."}</h2><p>${isPro ? "Confirm what you’ll deliver, what it costs and when it will be ready." : "The pro can prepare an offer. Try their view to continue the demo."}</p>${isPro ? '<button class="button dark" data-booking="quote">Create a quote</button>' : ""}</section>`}
    <details class="journey-card" ${working ? "" : "open"}><summary><strong>The brief</strong></summary><p>${esc(booking.brief.genre)} · ${esc(booking.brief.start)}</p><p class="preserve-lines">${esc(booking.brief.brief)}</p><p>Budget ${esc(booking.brief.budget)}<br>Preferred date ${dateLabel(booking.brief.date)}</p>${referenceLink(booking.brief.reference)}</details></aside></div></div>`;
}
function editQuote(booking) {
  const person = people.find((person) => person.id === booking.personId),
    terms = proTerms[person.id];
  const quote = booking.quote || {
    price: person.rate,
    scope: terms.scope,
    date: "",
    revisions: terms.revisions,
    hourly: terms.hourly,
    rights: "",
  };
  openModal(`<div class="eyebrow orange">Quote / ${esc(booking.brief.name)}</div><h2>Make the offer clear.</h2><form id="quote-form" class="form-grid">
    <label class="full">What you’ll deliver<textarea required name="scope" maxlength="2000">${esc(quote.scope)}</textarea></label>
    <label>Total price in GBP<input name="price" type="number" min="25" max="50000" step="0.01" required value="${quote.price}"></label>
    <label>Completion date<input name="date" type="date" min="${todayDate()}" required value="${quote.date}"></label>
    <label>Included revision rounds<input name="revisions" type="number" min="0" max="20" step="1" required value="${quote.revisions}"></label>
    <label>Extra work per hour in GBP<input name="hourly" type="number" min="1" max="1000" step="0.01" required value="${quote.hourly}"></label>
    <label class="full">Credits, usage rights and any splits<textarea name="rights" required maxlength="2000" placeholder="What can the artist release and monetise? What credits and ownership or songwriting splits are agreed?">${esc(quote.rights)}</textarea></label>
    <p class="note full" id="quote-net">SA fee 10% · You receive ${bookingAmounts(quote.price)[2]} before separate processing costs or taxes.</p>
    <button class="button dark full">Save quote for artist review</button></form>`);
  const form = $("#quote-form");
  form.elements.price.oninput = (event) =>
    ($("#quote-net").textContent = event.target.validity.valid
      ? "SA fee 10% · You receive " +
        bookingAmounts(event.target.valueAsNumber)[2] +
        " before separate processing costs or taxes."
      : "Enter a price between £25 and £50,000.");
  form.onsubmit = (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.scope.trim() || !data.rights.trim()) return;
    const quote = {
      ...data,
      price: Number(data.price),
      revisions: Number(data.revisions),
      hourly: Number(data.hourly),
    };
    if (!commitBooking({ ...booking, quote, status: "quoted" })) return;
    closeModal();
    render();
  };
}
function addDelivery(booking) {
  openModal(`<div class="eyebrow orange">Delivery</div><h2>Add an audio version.</h2><p class="modal-intro">Use a direct HTTPS audio file link, or try the sample audio.</p>
    <form id="delivery-form"><label>Version name<input name="name" required maxlength="70" placeholder="First mix"></label>
    <label>Audio file URL<input name="url" type="url" required placeholder="https://…/mix.wav"></label>
    <label>What’s changed?<textarea name="notes" required maxlength="1000"></textarea></label><button class="button dark">Save for artist review</button><button type="button" class="text-btn" id="sample-delivery">Use a demo audio version</button></form>`);
  const form = $("#delivery-form");
  $("#sample-delivery").onclick = () => {
    form.elements.name.value =
      "Demo arrangement " + (booking.versions.length + 1);
    form.elements.url.value = new URL(
      "assets/daylight-" + (booking.versions.length ? "v2" : "v1") + ".wav",
      location.href,
    ).href;
    form.elements.notes.value =
      "Daylight demonstration instrumental. Added to try version feedback.";
  };
  form.elements.url.oninput = (event) => event.target.setCustomValidity("");
  form.onsubmit = (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form)),
      url = new URL(data.url);
    if (url.protocol !== "https:" && url.origin !== location.origin) {
      form.elements.url.setCustomValidity("Use an HTTPS audio file URL.");
      form.elements.url.reportValidity();
      return;
    }
    const version = { ...data, id: crypto.randomUUID() };
    if (
      !commitBooking({
        ...booking,
        versions: [...booking.versions, version],
        status: "review",
      })
    )
      return;
    closeModal();
    render();
  };
}
document.addEventListener("submit", (event) => {
  if (event.target.id !== "booking-message-form") return;
  event.preventDefault();
  const booking = activeBooking(),
    form = event.target,
    text = form.elements.message.value.trim();
  if (!booking || !text) return;
  const message = { text, sender: audience, at: Date.now() };
  const version =
    booking.versions.find((item) => item.id === state.bookingVersionId) ||
    booking.versions.at(-1);
  if (form.elements.timestamp?.checked && version)
    Object.assign(message, {
      versionId: version.id,
      seconds: Math.floor($("#booking-audio").currentTime),
    });
  if (!commitBooking({ ...booking, messages: [...booking.messages, message] }))
    return;
  $(".booking-messages").innerHTML = projectMessages(
    activeBooking(),
    people.find((person) => person.id === booking.personId),
  );
  form.reset();
  toast("Message saved on this device.");
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-booking]");
  if (!button) return;
  const booking = activeBooking();
  switch (button.dataset.booking) {
    case "brief":
      bookingBrief(
        people.find((person) => person.id === button.dataset.person),
      );
      break;
    case "open":
      state.activeBookingId = button.dataset.id;
      persist();
      go("project");
      break;
    case "switch":
      audience = audience === "pro" ? "artist" : "pro";
      render();
      break;
    case "quote":
      if (
        audience === "pro" &&
        booking &&
        ["brief", "quoted"].includes(booking.status)
      )
        editQuote(booking);
      break;
    case "accept":
      if (
        audience === "artist" &&
        booking?.status === "quoted" &&
        commitBooking({ ...booking, status: "active" })
      )
        render();
      break;
    case "delivery":
      if (
        audience === "pro" &&
        booking &&
        ["active", "review"].includes(booking.status)
      )
        addDelivery(booking);
      break;
    case "approve":
      if (
        audience === "artist" &&
        booking?.status === "review" &&
        commitBooking({ ...booking, status: "complete" })
      )
        render();
      break;
    case "revision":
      if (audience !== "artist" || booking?.status !== "review") break;
      if (booking.revisionRequests >= booking.quote.revisions) {
        toast(
          "Included rounds are used. Ask the pro for an estimate in messages before agreeing extra work.",
        );
        break;
      }
      openModal(
        `<h2>What needs changing?</h2><form id="revision-form"><label>Keep your notes together<textarea name="notes" required maxlength="2000"></textarea></label><p class="note">${booking.quote.revisions - booking.revisionRequests} included rounds remaining.</p><button class="button dark">Save revision request</button></form>`,
      );
      $("#revision-form").onsubmit = (event) => {
        event.preventDefault();
        const text = event.target.elements.notes.value.trim();
        if (!text) return;
        if (
          !commitBooking({
            ...booking,
            status: "active",
            revisionRequests: booking.revisionRequests + 1,
            messages: [
              ...booking.messages,
              {
                sender: "artist",
                at: Date.now(),
                text: "Revision request — " + text,
              },
            ],
          })
        )
          return;
        closeModal();
        render();
      };
      break;
    case "version":
    case "seek": {
      if (
        !booking?.versions.some((version) => version.id === button.dataset.id)
      )
        break;
      state.bookingVersionId = button.dataset.id;
      render();
      if (button.dataset.booking === "seek") {
        const audio = $("#booking-audio");
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
  }
});

document.addEventListener(
  "error",
  (event) => {
    if (event.target.id !== "booking-audio") return;
    const notice = document.createElement("p");
    notice.className = "note";
    notice.setAttribute("role", "status");
    notice.textContent =
      "This audio link could not be played. Ask the pro for a direct audio file link.";
    event.target.after(notice);
  },
  true,
);

function bookingBrief(person) { sharedBrief(person); }
