let ownProDraft = null;
let ownProPublished = null;
let ownProReview = null;
let publicProProfile = null;
let approvedPros = [];
let proPageLoading = false;
let proPageError = "";
let proRequest = 0;
let proOwner = null;
let proEditorKey = null;
const proSampleURLs = new Map();
const portfolioHosts =
  /^(open\.spotify\.com|music\.apple\.com|([a-z0-9-]+\.)?soundcloud\.com|youtu\.be|([a-z0-9-]+\.)?youtube\.com|([a-z0-9-]+\.)?bandcamp\.com)$/i;

function proProfileRoute() {
  return (
    ["my-profile", "profile-preview", "talent"].includes(page) ||
    /^pro-[0-9a-f-]{36}$/.test(page)
  );
}
function resetProProfiles() {
  ownProDraft = null;
  ownProPublished = null;
  ownProReview = null;
  publicProProfile = null;
  proOwner = null;
  proEditorKey = null;
  proPageError = "";
  proRequest++;
  proSampleURLs.clear();
}
function emptyProProfile() {
  return {
    name:
      sharedUser?.user_metadata?.display_name ||
      sharedUser?.user_metadata?.full_name ||
      "",
    headline: "",
    bio: "",
    service: "Production",
    genres: [],
    scope: "",
    price: null,
    days: null,
    revisions: 2,
    hourly: null,
    work: [
      {
        id: crypto.randomUUID(),
        title: "",
        credit: "",
        url: "",
        audio_path: "",
      },
    ],
  };
}
async function loadProProfiles() {
  if (!proProfileRoute() || !sharedReady) return;
  if (["my-profile", "profile-preview"].includes(page) && !sharedUser) return;
  const request = ++proRequest,
    route = page,
    owner = sharedUser?.id;
  proPageLoading = true;
  proPageError = "";
  if (page !== "talent") render();
  try {
    if (["my-profile", "profile-preview"].includes(route)) {
      const [draft, published, review] = await Promise.all([
        sharedClient
          .from("sa_pro_profile_drafts")
          .select("*")
          .eq("owner_id", owner)
          .maybeSingle(),
        sharedClient
          .from("sa_pro_public_profiles")
          .select("*")
          .eq("owner_id", owner)
          .maybeSingle(),
        sharedClient
          .from("sa_pro_review_notes")
          .select("*")
          .eq("owner_id", owner)
          .maybeSingle(),
      ]);
      if (draft.error) throw draft.error;
      if (published.error) throw published.error;
      if (review.error) throw review.error;
      if (request !== proRequest || owner !== sharedUser?.id) return;
      ownProDraft = draft.data;
      ownProPublished = published.data;
      ownProReview = review.data;
      proOwner = owner;
      await prepareProSamples(draft.data?.profile, owner);
    } else if (route === "talent") {
      const { data, error } = await sharedClient
        .from("sa_pro_public_profiles")
        .select("*")
        .eq("is_listed", true)
        .order("featured", { ascending: false })
        .order("approved_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      approvedPros = data;
    } else {
      const { data, error } = await sharedClient
        .from("sa_pro_public_profiles")
        .select("*")
        .eq("owner_id", route.slice(4))
        .maybeSingle();
      if (error) throw error;
      publicProProfile = data;
      await prepareProSamples(data?.profile, owner);
    }
    if (request !== proRequest || route !== page) return;
    proPageLoading = false;
    render();
    if (
      publicProProfile &&
      sharedUser &&
      route === "pro-" + publicProProfile.owner_id &&
      sessionStorage.getItem("sa-profile-quote") === publicProProfile.owner_id
    ) {
      sessionStorage.removeItem("sa-profile-quote");
      sharedBrief({
        profileId: publicProProfile.owner_id,
        name: publicProProfile.profile.name,
      });
    }
  } catch (error) {
    if (request !== proRequest) return;
    proPageLoading = false;
    proPageError = error.message || "Could not load this profile.";
    render();
  }
}
async function prepareProSamples(profile, viewer) {
  if (!profile) return;
  await Promise.all(
    profile.work.map(async (work) => {
      if (!work.audio_path) return;
      const key = (viewer || "public") + ":" + work.audio_path;
      const saved = proSampleURLs.get(key);
      if (saved?.expiresAt > Date.now() + 120000) return;
      const { data, error } = await sharedClient.storage
        .from("sa-pro-samples")
        .createSignedUrl(work.audio_path, 3600);
      if (!error)
        proSampleURLs.set(key, {
          url: data.signedUrl,
          expiresAt: Date.now() + 3600000,
        });
    }),
  );
}
function profileSampleURL(path) {
  const key = (sharedUser?.id || "public") + ":" + path;
  return proSampleURLs.get(key)?.url || "";
}
function proWorkEditor(work, index) {
  return `<fieldset class="pro-work-entry" data-work-id="${esc(work.id || "")}" data-audio-path="${esc(work.audio_path || "")}">
    <legend>Work example ${index + 1}</legend>
    <label>Song title<input name="work_title" maxlength="100" value="${esc(work.title)}"></label>
    <label>Your contribution<input name="work_credit" maxlength="200" placeholder="For example, production and mixing" value="${esc(work.credit)}"></label>
    <label>Released song link<input name="work_url" type="url" maxlength="2000" placeholder="Spotify, Apple Music, SoundCloud, YouTube or Bandcamp" value="${esc(work.url || "")}"></label>
    <details><summary>Or upload a listening sample</summary><label>Audio file<input name="work_audio" type="file" accept=".wav,.mp3,.m4a,.aac,.flac,.ogg"></label><p class="note">Up to 50 MB. Only share work you have permission to showcase.</p></details>
    <p class="note pro-sample-status">${work.audio_path ? "Audio sample attached." : ""}</p>
    <button class="text-btn" type="button" data-pro="remove-work">Remove example</button>
  </fieldset>`;
}
function proSetupPage() {
  if (!sharedReady)
    return '<div class="container booking-page"><p role="status">Checking your sign-in…</p></div>';
  if (!sharedUser) {
    sessionStorage.setItem("sa-after-auth", "my-profile");
    return accountPage();
  }
  if (proPageLoading || proOwner !== sharedUser.id)
    return `<div class="container booking-page"><p role="status">${proPageError ? esc(proPageError) : "Loading your profile…"}</p>${proPageError ? '<button class="button outline" data-pro="reload">Try again</button>' : ""}</div>`;
  const p = ownProDraft?.profile || emptyProProfile();
  proEditorKey = ownProDraft?.row_version || 0;
  return `<div class="container booking-page pro-setup"><section class="page-title"><div class="eyebrow orange">Your professional profile</div><h1>Make it yours.</h1><p>Your sound, your work and a clear starting price.</p></section>
    ${ownProDraft?.review_status === "pending" && JSON.stringify(ownProPublished?.profile) !== JSON.stringify(p) ? '<p class="pro-review-note">Your profile is with SA for review. Saving new changes will create an updated draft.</p>' : ""}
    ${ownProReview ? `<aside class="pro-review-note"><strong>${{ approved: "Your profile has been approved.", changes_requested: "A note from Song Architect", paused: "Your listing is paused.", restored: "Your listing is live again." }[ownProReview.decision]}</strong>${ownProReview.note ? `<p class="preserve-lines">${esc(ownProReview.note)}</p>` : ""}${ownProReview.decision === "changes_requested" && ownProDraft?.review_status !== "pending" ? "<p>Update your draft and submit it again when you’re ready.</p>" : ""}</aside>` : ""}
    ${ownProPublished ? (ownProPublished.is_listed ? `<p class="pro-review-note">Your public page shows your last approved profile. <a href="#pro-${sharedUser.id}">View public page</a></p>` : '<p class="pro-review-note">Your approved listing is paused. It is hidden from the roster until SA restores it.</p>') : ""}
    <form id="pro-profile-form">
    <section class="journey-card"><div class="eyebrow orange">01 / About you</div><h2>What’s your sound?</h2>
      <div class="pro-form-grid"><label>Your professional name<input name="name" required maxlength="80" autocomplete="name" value="${esc(p.name)}"></label>
      <label>One-line introduction<input name="headline" required maxlength="100" placeholder="Indie-pop producer with a love for live guitars" value="${esc(p.headline)}"></label></div>
      <label>A little about you<textarea name="bio" required maxlength="1000" placeholder="Tell artists what you love making and how you work.">${esc(p.bio)}</textarea></label>
      <fieldset class="pro-genres"><legend>Favourite genres to work in <small>Choose up to four</small></legend>
      <div class="tags">${genres
        .slice(1)
        .map(
          (genre) =>
            `<label><input type="checkbox" name="genres" value="${genre}" ${p.genres.includes(genre) ? "checked" : ""}> ${genre}</label>`,
        )
        .join("")}</div></fieldset>
    </section>
    <section class="journey-card"><div class="eyebrow orange">02 / Your main service</div><h2>Keep the offer clear.</h2>
      <label>Main service<select name="service">${services
        .slice(1)
        .map(
          (service) =>
            `<option ${p.service === service ? "selected" : ""}>${service}</option>`,
        )
        .join("")}</select></label>
      <label>What’s included?<textarea name="scope" required maxlength="2000" placeholder="For example, full production, instrumental mix and separate stems.">${esc(p.scope)}</textarea></label>
      <div class="pro-form-grid">
        <label>Starting price in GBP<input name="price" type="number" min="25" max="50000" step="0.01" required value="${p.price ?? ""}"></label>
        <label>Turnaround in days<input name="days" type="number" min="1" max="90" step="1" required value="${p.days ?? ""}"></label>
        <label>Included revision rounds<input name="revisions" type="number" min="0" max="20" step="1" required value="${p.revisions ?? ""}"></label>
        <label>Further work per hour in GBP<input name="hourly" type="number" min="1" max="1000" step="0.01" required value="${p.hourly ?? ""}"></label>
      </div><p class="note" id="pro-fee-note">${p.price ? "At this price, your share is " + bookingAmounts(p.price)[2] + " after the 10% SA fee." : "You set your price. SA takes 10% on booked work."} Before separate processing costs and taxes.</p>
    </section>
    <section class="journey-card"><div class="eyebrow orange">03 / Previous work</div><h2>Let artists hear it.</h2><p>Start with one example. Say exactly what you contributed.</p>
      <div id="pro-work-list">${p.work.map(proWorkEditor).join("")}</div>
      <button class="button outline small" type="button" data-pro="add-work">Add another example</button>
    </section>
    <p class="note" id="pro-profile-error" role="alert">${esc(proPageError)}</p>
    <div class="journey-actions pro-save-actions"><button class="button outline" name="action" value="draft" formnovalidate>Save draft</button><button class="button outline" name="action" value="preview" formnovalidate>Preview profile</button><button class="button dark" name="action" value="submit">Submit for SA review</button></div>
    <p class="note">SA reviews each professional before their profile joins the endorsed roster.</p></form></div>`;
}
function readProForm(form) {
  const values = Object.fromEntries(new FormData(form));
  const profile = {
    name: values.name.trim(),
    headline: values.headline.trim(),
    bio: values.bio.trim(),
    service: values.service,
    scope: values.scope.trim(),
    genres: [...form.querySelectorAll("input[name=genres]:checked")].map(
      (input) => input.value,
    ),
    work: [],
  };
  for (const key of ["price", "days", "revisions", "hourly"])
    profile[key] = values[key] === "" ? null : Number(values[key]);
  for (const row of form.querySelectorAll(".pro-work-entry")) {
    profile.work.push({
      id: row.dataset.workId,
      title: row.querySelector("[name=work_title]").value.trim(),
      credit: row.querySelector("[name=work_credit]").value.trim(),
      url: row.querySelector("[name=work_url]").value.trim(),
      audio_path: row.dataset.audioPath || "",
    });
  }
  return profile;
}
function profileWorkLink(url) {
  try {
    return (
      new URL(url).protocol === "https:" &&
      portfolioHosts.test(new URL(url).hostname)
    );
  } catch {
    return false;
  }
}
async function saveProForm(form, mode) {
  const profile = readProForm(form);
  if (profile.genres.length > 4)
    throw new Error("Choose up to four favourite genres.");
  if (mode === "submit" && (!profile.genres.length || !profile.work.length))
    throw new Error("Choose a genre and add at least one work example.");
  const rows = [...form.querySelectorAll(".pro-work-entry")];
  for (const [i, work] of profile.work.entries()) {
    const file = rows[i].querySelector("[name=work_audio]").files[0];
    if (work.url && !profileWorkLink(work.url))
      throw new Error(
        "Use a Spotify, Apple Music, SoundCloud, YouTube or Bandcamp song link.",
      );
    if (
      mode === "submit" &&
      (!work.title || !work.credit || (!work.url && !work.audio_path && !file))
    )
      throw new Error(
        "Add a title, your contribution and a link or listening sample for each work example.",
      );
    if (file) {
      const ext = file.name.split(".").at(-1).toLowerCase();
      if (!audioTypes[ext] || !file.size || file.size > 50 * 1024 * 1024)
        throw new Error("Choose a supported audio file up to 50 MB.");
    }
  }
  const owner = sharedUser.id;
  openModal(
    '<h2>Saving your profile…</h2><progress id="audio-upload-progress" max="100" value="0" hidden></progress><p class="note" role="status" id="audio-upload-status">Keeping your changes together.</p><p class="note" role="alert" id="pro-save-error"></p>',
  );
  audioUploadBusy = true;
  document.querySelector(".modal-close").disabled = true;
  try {
    for (const [i, work] of profile.work.entries()) {
      const row = rows[i],
        file = row.querySelector("[name=work_audio]").files[0];
      if (file && !row.dataset.audioPath) {
        const { data, error } = await sharedClient.auth.getSession();
        if (error || !data.session)
          throw new Error("Sign in again before uploading.");
        const path =
          row.dataset.uploadPath ||
          owner +
            "/" +
            crypto.randomUUID() +
            "." +
            file.name.split(".").at(-1).toLowerCase();
        row.dataset.uploadPath = path;
        $("#audio-upload-progress").hidden = false;
        await resumableAudioUpload(
          file,
          path,
          audioTypes[file.name.split(".").at(-1).toLowerCase()],
          data.session.access_token,
          owner,
          "sa-pro-samples",
        );
        row.dataset.audioPath = path;
        delete row.dataset.uploadPath;
        work.audio_path = path;
        work.url = "";
        row.querySelector("[name=work_url]").value = "";
        row.querySelector(".pro-sample-status").textContent =
          "Audio sample attached.";
      }
    }
    if (sharedUser?.id !== owner)
      throw new Error("Your account changed. Sign in again before saving.");
    const row = {
      owner_id: owner,
      profile,
      review_status: mode === "submit" ? "pending" : "draft",
      row_version: proEditorKey + 1,
    };
    const query = proEditorKey
      ? sharedClient
          .from("sa_pro_profile_drafts")
          .update(row)
          .eq("owner_id", owner)
          .eq("row_version", proEditorKey)
      : sharedClient.from("sa_pro_profile_drafts").insert(row);
    const { data, error } = await query.select("*").maybeSingle();
    if (error)
      throw new Error(
        error.code === "23514"
          ? "Check your profile details, prices and work examples before submitting."
          : error.message,
      );
    if (!data)
      throw new Error(
        "This profile was updated elsewhere. Reload before saving again.",
      );
    ownProDraft = data;
    proEditorKey = data.row_version;
    await prepareProSamples(profile, owner);
    audioUploadBusy = false;
    document.querySelector(".modal-close").disabled = false;
    closeModal();
    if (mode === "preview") go("profile-preview");
    else {
      render();
      toast(
        mode === "submit"
          ? "Profile submitted for SA review."
          : "Profile draft saved.",
      );
    }
  } catch (error) {
    $("#pro-save-error").textContent =
      error.message || "Could not save. Your form is still here to retry.";
    $("#audio-upload-status").textContent =
      "Close this message to return to your form.";
  } finally {
    audioUploadBusy = false;
    document.querySelector(".modal-close").disabled = false;
  }
}
function renderProProfile(row, preview = false) {
  const p = row.profile;
  const own = row.owner_id === sharedUser?.id;
  const initials =
    p.name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] || "")
      .join("")
      .toUpperCase() || "SA";
  return `<div class="container booking-page">
    ${preview ? '<a class="text-btn" href="#my-profile">Back to profile setup</a>' : '<a class="text-btn" href="#talent">Back to roster</a>'}
    <section class="profile-intro"><div class="profile-avatar" aria-hidden="true">${esc(initials)}</div><div><div class="eyebrow orange">${preview ? "Your profile preview" : "Song Architect roster"}</div><h1>${esc(p.name || "Your professional name")}</h1><p>${esc(p.headline || "Your one-line introduction")}</p>
    ${preview ? '<span class="pill">Preview / SA review required</span>' : '<span class="endorsement">SA Endorsed</span>'}
    <div class="tags">${p.genres.map((genre) => `<span>${esc(genre)}</span>`).join("")}</div></div></section>
    <div class="booking-columns"><div><section class="journey-card"><h2>About me</h2><p class="preserve-lines">${esc(p.bio || "A little about your sound and how you work.")}</p></section>
    <section class="journey-card"><h2>Previous work</h2>${
      p.work
        .filter((work) => work.title || work.audio_path || work.url)
        .map(
          (
            work,
          ) => `<article class="pro-work-preview"><h3>${esc(work.title || "Song title")}</h3><p>${esc(work.credit || "Your contribution")}</p>
      ${work.audio_path ? (profileSampleURL(work.audio_path) ? `<audio data-pro-sample controls playsinline preload="none" src="${esc(profileSampleURL(work.audio_path))}" aria-label="Listen to ${esc(work.title)}"></audio>` : '<p class="note">Sample unavailable. Refresh this profile to try again.</p>') : ""}
      ${work.url && profileWorkLink(work.url) ? `<a class="text-btn" href="${esc(work.url)}" target="_blank" rel="noopener noreferrer">Listen to the release</a>` : ""}
    </article>`,
        )
        .join("") || "<p>Add a song example to show your work here.</p>"
    }</section></div>
    <aside class="journey-card"><div class="eyebrow orange">${esc(p.service)}</div><h2>${p.price ? "From " + money(p.price) : "Your starting price"}</h2><p class="preserve-lines">${esc(p.scope || "The deliverables included in your main service.")}</p>
      <dl class="scope-grid"><div><dt>Turnaround</dt><dd>${p.days ?? "—"} days</dd></div><div><dt>Revisions</dt><dd>${p.revisions ?? "—"} rounds</dd></div><div><dt>Extra work</dt><dd>${p.hourly ? money(p.hourly) : "—"} / hour</dd></div></dl>
      ${preview || own ? '<a class="button outline" href="#my-profile">Edit profile</a>' : `<button class="button dark" data-pro="book" data-id="${row.owner_id}">Tell me about your song</button>`}
      <p class="note">Confirm the scope, credits and rights in your quote before work starts.</p>
    </aside></div></div>`;
}
function proProfilePage(preview = false) {
  if (preview && !sharedUser) return accountPage();
  if (proPageLoading || (preview && !proOwner && !proPageError))
    return '<div class="container booking-page"><p role="status">Loading profile…</p></div>';
  const row = preview ? ownProDraft : publicProProfile;
  if (!row)
    return `<div class="container booking-page"><h1>${preview ? "Create your profile first." : "Profile unavailable."}</h1><p>${esc(proPageError || "This profile is being prepared for the roster.")}</p><a class="button dark" href="${preview ? "#my-profile" : "#talent"}">${preview ? "Set up my profile" : "Explore the roster"}</a></div>`;
  if (!preview && !row.is_listed)
    return '<div class="container booking-page"><h1>Profile unavailable.</h1><p>This listing is currently paused.</p><a class="button outline" href="#talent">Explore the roster</a></div>';
  return renderProProfile(row, preview);
}
function liveRosterContent() {
  return (
    approvedPros
      .filter((row) => row.is_listed)
      .filter((row) => {
        const p = row.profile;
        return (
          (genre === "All genres" || p.genres.includes(genre)) &&
          (role === "All services" || p.service === role) &&
          (!search ||
            [p.name, p.headline, p.bio, p.service, ...p.genres]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase()))
        );
      })
      .map(
        (row) =>
          `<article class="journey-card"><span class="endorsement">SA Endorsed</span><h3>${esc(row.profile.name)}</h3><p>${esc(row.profile.headline)}</p><div class="tags">${row.profile.genres.map((genre) => `<span>${esc(genre)}</span>`).join("")}</div><p>From ${money(row.profile.price)} · ${row.profile.days} days</p><a class="button outline small" href="#pro-${row.owner_id}">View profile</a></article>`,
      )
      .join("") ||
    '<p class="note">No endorsed profiles match these filters.</p>'
  );
}
function liveRosterSection() {
  return approvedPros.length
    ? `<section class="artist-proof"><h2>Meet the roster.</h2><div class="release-visual-grid" id="live-roster">${liveRosterContent()}</div></section>`
    : "";
}
document.addEventListener("submit", (event) => {
  if (event.target.id !== "pro-profile-form") return;
  event.preventDefault();
  const form = event.target,
    button = event.submitter,
    mode = button?.value || "draft";
  if (button?.disabled) return;
  if (button) button.disabled = true;
  saveProForm(form, mode)
    .catch((error) => ($("#pro-profile-error").textContent = error.message))
    .finally(() => {
      if (button) button.disabled = false;
    });
});
document.addEventListener("change", (event) => {
  const form = event.target.closest("#pro-profile-form");
  if (!form) return;
  if (
    event.target.name === "genres" &&
    form.querySelectorAll("[name=genres]:checked").length > 4
  ) {
    event.target.checked = false;
    toast("Choose up to four favourite genres.");
  }
  const row = event.target.closest(".pro-work-entry");
  if (row && event.target.name === "work_audio") {
    row.dataset.audioPath = "";
    delete row.dataset.uploadPath;
    row.querySelector("[name=work_url]").value = "";
    row.querySelector(".pro-sample-status").textContent = "";
  }
});
document.addEventListener("input", (event) => {
  if (
    event.target.name === "price" &&
    event.target.closest("#pro-profile-form")
  ) {
    $("#pro-fee-note").textContent = event.target.validity.valid
      ? "Your share is " +
        bookingAmounts(event.target.valueAsNumber)[2] +
        " after the 10% SA fee, before separate processing costs or taxes."
      : "Set a price from £25 to £50,000.";
  }
  if (event.target.name === "work_url" && event.target.value) {
    const row = event.target.closest(".pro-work-entry");
    row.dataset.audioPath = "";
    delete row.dataset.uploadPath;
    row.querySelector("[name=work_audio]").value = "";
    row.querySelector(".pro-sample-status").textContent = "";
  }
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pro]");
  if (!button) return;
  switch (button.dataset.pro) {
    case "add-work": {
      const list = $("#pro-work-list"),
        count = list.children.length;
      if (count >= 4) {
        toast("Start with your four strongest examples.");
        break;
      }
      list.insertAdjacentHTML(
        "beforeend",
        proWorkEditor(
          {
            id: crypto.randomUUID(),
            title: "",
            credit: "",
            url: "",
            audio_path: "",
          },
          count,
        ),
      );
      break;
    }
    case "remove-work":
      button.closest(".pro-work-entry").remove();
      $$(".pro-work-entry legend").forEach(
        (legend, index) => (legend.textContent = "Work example " + (index + 1)),
      );
      break;
    case "reload":
      loadProProfiles();
      break;
    case "book":
      if (publicProProfile?.owner_id === button.dataset.id)
        sharedBrief({
          profileId: publicProProfile.owner_id,
          name: publicProProfile.profile.name,
        });
      break;
  }
});
window.addEventListener("hashchange", () => {
  queueMicrotask(() => {
    if (proProfileRoute()) loadProProfiles();
  });
});

document.addEventListener(
  "error",
  (event) => {
    if (!event.target.matches?.("audio[data-pro-sample]")) return;
    if (event.target.parentElement.querySelector(".pro-audio-error")) return;
    const note = document.createElement("p");
    note.className = "note pro-audio-error";
    note.textContent =
      "This sample could not play. Refresh the profile to try again.";
    event.target.after(note);
  },
  true,
);
