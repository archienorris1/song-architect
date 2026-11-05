const projectAudioBucket = "sa-project-audio";
const signedAudioCache = new Map();
const audioTypes = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
};
let audioUploadBusy = false;

async function audioVersionURL(version, owner) {
  if (!version.storage_path) return version.url;
  const key = owner + ":" + version.storage_path;
  const saved = signedAudioCache.get(key);
  if (saved && saved.expiresAt > Date.now() + 120000) return saved.url;
  const { data, error } = await sharedClient.storage
    .from(projectAudioBucket)
    .createSignedUrl(version.storage_path, 3600);
  if (error) return null;
  signedAudioCache.set(key, {
    url: data.signedUrl,
    expiresAt: Date.now() + 3600000,
  });
  return data.signedUrl;
}

function audioVersionPlayer(version) {
  if (!version.audio_url)
    return '<p role="status">This audio is temporarily unavailable.</p><button class="button outline small" data-shared="refresh-audio">Refresh audio</button>';
  return `<audio id="shared-audio" data-version-id="${version.id}" controls preload="metadata" playsinline src="${esc(version.audio_url)}" aria-label="${esc(version.name)}"></audio>`;
}

function audioDeliveryFields() {
  return (
    '<h2>Share an audio version.</h2><form id="shared-delivery-form">' +
    '<label id="audio-file-label">Choose your audio<input type="file" name="audio" accept=".wav,.mp3,.m4a,.aac,.flac,.ogg" required></label>' +
    '<p class="note" id="audio-file-help">WAV, MP3, M4A, AAC, FLAC or OGG · Up to 50 MB. Only people on this project can listen.</p>' +
    '<label id="audio-link-label" hidden>Audio file URL<input name="url" type="url" maxlength="2000" placeholder="https://…/mix.wav"></label>' +
    '<label>Version name<input name="name" required maxlength="100" placeholder="First mix"></label>' +
    '<label>Notes for the artist<textarea name="notes" required maxlength="2000" placeholder="What’s new, or what should they listen out for?"></textarea></label>' +
    '<button type="button" class="text-btn" id="audio-source-switch">Use an audio link instead</button>' +
    '<button type="button" class="text-btn" id="audio-sample-button" data-shared="sample" hidden>Use sample audio for testing</button>' +
    '<progress id="audio-upload-progress" max="100" value="0" hidden aria-label="Audio upload progress"></progress>' +
    '<p class="note" id="audio-upload-status" role="status"></p>' +
    '<p class="note" id="shared-form-error" role="alert"></p>' +
    '<button class="button dark">Upload &amp; share version</button></form>'
  );
}

function bindAudioDelivery(form) {
  form.dataset.source = "file";
  form.elements.audio.onchange = () => {
    delete form.dataset.requestId;
    const file = form.elements.audio.files[0];
    if (file && !form.elements.name.value.trim())
      form.elements.name.value = file.name
        .replace(/\.[^.]+$/, "")
        .slice(0, 100);
    $("#shared-form-error").textContent = "";
  };
  $("#audio-source-switch").onclick = () => {
    const useLink = form.dataset.source !== "link";
    form.dataset.source = useLink ? "link" : "file";
    form.elements.audio.required = !useLink;
    form.elements.url.required = useLink;
    $("#audio-file-label").hidden = useLink;
    $("#audio-file-help").hidden = useLink;
    $("#audio-link-label").hidden = !useLink;
    $("#audio-sample-button").hidden = !useLink;
    $("#audio-source-switch").textContent = useLink
      ? "Upload a file instead"
      : "Use an audio link instead";
    form.querySelector("button:not([type])").textContent = useLink
      ? "Share for artist review"
      : "Upload & share version";
  };
}

function resumableAudioUpload(
  file,
  path,
  type,
  token,
  owner,
  bucket = projectAudioBucket,
) {
  return new Promise((resolve, reject) => {
    const storageOrigin = SA_BACKEND.url.replace(
      ".supabase.co",
      ".storage.supabase.co",
    );
    const upload = new SAClient.Upload(file, {
      endpoint: storageOrigin + "/storage/v1/upload/resumable",
      headers: { authorization: "Bearer " + token, apikey: SA_BACKEND.key },
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: type,
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      fingerprint: async () =>
        ["sa-audio", bucket, owner, path, file.size, file.lastModified].join(
          ":",
        ),
      onProgress: (sent, total) => {
        const percent = total ? Math.floor((sent / total) * 100) : 0;
        $("#audio-upload-progress").value = percent;
        $("#audio-upload-status").textContent =
          percent < 100
            ? "Uploading " + percent + "% · Keep this page open."
            : "Upload complete. Saving your audio…";
      },
      onError: (error) => {
        const status = error.originalResponse?.getStatus();
        reject(
          new Error(
            status === 413
              ? "This file is too large. Choose audio under 50 MB."
              : status === 401
                ? "Your sign-in has expired. Sign in again and retry."
                : "The upload was interrupted. Check your connection and try again.",
          ),
        );
      },
      onSuccess: resolve,
    });
    upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      })
      .catch(() => reject(new Error("Could not start the upload. Try again.")));
  });
}

async function uploadAudioDelivery(form, project, values) {
  if (!values.name.trim() || !values.notes.trim())
    throw new Error("Add a version name and a short note for the artist.");
  const file = form.elements.audio.files[0];
  const extension = file?.name.split(".").at(-1).toLowerCase();
  if (!file || !audioTypes[extension])
    throw new Error("Choose a WAV, MP3, M4A, AAC, FLAC or OGG audio file.");
  if (!file.size || file.size > 50 * 1024 * 1024)
    throw new Error("Choose a non-empty audio file under 50 MB.");
  const id = form.dataset.requestId || crypto.randomUUID();
  form.dataset.requestId = id;
  const path = project.id + "/" + id + "." + extension;
  const owner = sharedUser.id;
  const inputs = [...form.querySelectorAll("input,textarea,button")];
  const disabled = inputs.map((input) => input.disabled);
  audioUploadBusy = true;
  const closeButton = document.querySelector(".modal-close");
  closeButton.disabled = true;
  inputs.forEach((input) => (input.disabled = true));
  $("#audio-upload-progress").hidden = false;
  let uploaded = false;
  try {
    const { data: existing, error: lookupError } = await sharedClient
      .from("sa_market_versions")
      .select("id,storage_path")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.storage_path === path) return;
    const { data, error: sessionError } = await sharedClient.auth.getSession();
    if (sessionError || !data.session)
      throw new Error("Sign in again before uploading.");
    await resumableAudioUpload(
      file,
      path,
      audioTypes[extension],
      data.session.access_token,
      owner,
    );
    uploaded = true;
    if (sharedUser?.id !== owner)
      throw new Error(
        "Your account changed. Sign in with the uploading account to continue.",
      );
    const { error } = await sharedClient.rpc("sa_market_deliver_upload", {
      p_id: project.id,
      p_version: project.row_version,
      p_delivery_id: id,
      p_name: values.name.trim(),
      p_storage_path: path,
      p_notes: values.notes.trim(),
    });
    if (error) throw error;
  } catch (error) {
    if (uploaded && sharedUser?.id === owner) {
      // Published audio is protected from deletion by the storage policy.
      await sharedClient.storage
        .from(projectAudioBucket)
        .remove([path])
        .catch(() => {});
    }
    $("#audio-upload-status").textContent =
      "Your version has not been confirmed as shared. Retry to check and finish.";
    throw error;
  } finally {
    audioUploadBusy = false;
    closeButton.disabled = false;
    inputs.forEach((input, index) => (input.disabled = disabled[index]));
  }
}

document.querySelector("#modal").addEventListener("cancel", (event) => {
  if (audioUploadBusy) event.preventDefault();
});
