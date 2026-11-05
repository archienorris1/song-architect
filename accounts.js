let returningFromAuth = /access_token=|code=/.test(
  location.hash + location.search,
);
const sharedClient = SAClient.createClient(SA_BACKEND.url, SA_BACKEND.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "sa-market-auth",
  },
});
let sharedUser = null;
let sharedReady = false;
let sharedProjects = [];
let sharedVersions = [];
let sharedMessages = [];
let sharedError = "";
let sharedLoading = false;
let sharedRequest = 0;
let accountMode = "signin";
let accountNotice = "";

function accountPage() {
  if (!sharedReady)
    return '<div class="container booking-page"><p role="status">Checking your sign-in…</p></div>';
  if (sharedUser)
    return `<div class="container booking-page"><section class="page-title"><div class="eyebrow orange">Your account</div><h1>You’re signed in.</h1><p>${esc(sharedUser.email)}</p></section><div class="journey-actions"><a class="button dark" href="#workspace">Open your projects</a><button class="button outline" data-account="signout">Sign out</button></div></div>`;
  const signup = accountMode === "signup",
    verify = accountMode === "verify";
  return `<div class="container booking-page account-page"><section class="page-title"><div class="eyebrow orange">Song Architect / Early access</div><h1>${signup ? "Make room for your next song." : verify ? "Check your email." : "Welcome back."}</h1><p>${verify ? "Open the confirmation email, or enter its verification code below." : "Sign in to share briefs, quotes and song versions with your collaborator."}</p></section>
    <button class="button outline account-google" data-account="google">Continue with Google</button><p class="note">Or use your email and password</p><form id="account-form" class="journey-card">
      ${signup ? '<label>Your name<input name="name" required maxlength="80" autocomplete="name"></label>' : ""}
      <label>Email<input name="email" type="email" required autocomplete="email" maxlength="254"></label>
      ${verify ? '<label>Verification code<input name="code" required inputmode="numeric" autocomplete="one-time-code" minlength="6" maxlength="12"></label>' : '<label>Password<input name="password" type="password" required ' + (signup ? 'minlength="10"' : "") + ' maxlength="128" autocomplete="' + (signup ? "new-password" : "current-password") + '"></label>'}
      <p id="account-notice" class="note" role="status">${esc(accountNotice)}</p>
      <button class="button dark">${signup ? "Create account" : verify ? "Verify email" : "Sign in"}</button>
      <button type="button" class="text-btn" data-account="${signup || verify ? "signin" : "signup"}">${signup || verify ? "Already have an account? Sign in" : "New here? Create an account"}</button>
      ${!signup && !verify ? '<button class="text-btn" type="button" data-account="recover">Forgot your password?</button>' : ""}
    </form>
  </div>`;
}

function signedAccountAction(action, button) {
  if (button.disabled) return;
  button.disabled = true;
  action()
    .catch((error) =>
      toast(error.message || "Could not complete that action. Try again."),
    )
    .finally(() => (button.disabled = false));
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-account]");
  if (!button) return;
  const action = button.dataset.account;
  if (["signin", "signup", "verify"].includes(action)) {
    accountMode = action;
    accountNotice = "";
    go("account");
  } else if (action === "google") {
    signedAccountAction(async () => {
      const { error } = await sharedClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: new URL(location.pathname, location.origin).href,
        },
      });
      if (error) throw error;
    }, button);
  } else if (action === "signout") {
    signedAccountAction(async () => {
      const { error } = await sharedClient.auth.signOut();
      if (error) throw error;
      go("account");
    }, button);
  } else if (action === "recover") {
    openModal(
      '<h2>Reset your password</h2><form id="recovery-form"><label>Your email<input type="email" name="email" required autocomplete="email"></label><button class="button dark">Send reset email</button><p class="note" role="status" id="recovery-status"></p></form>',
    );
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "account-form") {
    event.preventDefault();
    const form = event.target,
      values = Object.fromEntries(new FormData(form));
    signedAccountAction(async () => {
      const redirect = new URL(location.pathname, location.origin).href;
      let result;
      if (accountMode === "signup")
        result = await sharedClient.auth.signUp({
          email: values.email.trim(),
          password: values.password,
          options: {
            data: { display_name: values.name.trim() },
            emailRedirectTo: redirect,
          },
        });
      else if (accountMode === "verify")
        result = await sharedClient.auth.verifyOtp({
          email: values.email.trim(),
          token: values.code.trim(),
          type: "signup",
        });
      else
        result = await sharedClient.auth.signInWithPassword({
          email: values.email.trim(),
          password: values.password,
        });
      if (result.error) {
        $("#account-notice").textContent = result.error.message;
        return;
      }
      if (result.data.session) {
        sharedUser = result.data.user;
        accountNotice = "";
        go("workspace");
        await loadShared();
      } else {
        accountMode = "signin";
        accountNotice =
          "Open the link in your confirmation email, then sign in here. Check your spam folder too.";
        render();
      }
    }, form.querySelector("button[type=submit],button:not([type])"));
  } else if (event.target.id === "recovery-form") {
    event.preventDefault();
    const form = event.target;
    signedAccountAction(async () => {
      const { error } = await sharedClient.auth.resetPasswordForEmail(
        form.elements.email.value.trim(),
        { redirectTo: new URL(location.pathname, location.origin).href },
      );
      $("#recovery-status").textContent = error
        ? error.message
        : "If this account exists, a reset link is on its way. Open it to choose a new password.";
    }, form.querySelector("button"));
  } else if (event.target.id === "new-password-form") {
    event.preventDefault();
    const form = event.target;
    signedAccountAction(async () => {
      const { error } = await sharedClient.auth.updateUser({
        password: form.elements.password.value,
      });
      if (error) {
        $("#new-password-status").textContent = error.message;
        return;
      }
      closeModal();
      go("workspace");
      toast("Password updated.");
    }, form.querySelector("button"));
  }
});

function clearSharedSession() {
  signedAudioCache.clear();
  sharedProjects = [];
  sharedMessages = [];
  sharedVersions = [];
  sharedError = "";
  sharedLoading = false;
  sharedRequest++;
}
async function bootShared() {
  sharedClient.auth.onAuthStateChange((event, session) => {
    // Defer network calls until the Auth callback has released its internal lock.
    setTimeout(async () => {
      if (sharedUser?.id !== session?.user?.id) clearSharedSession();
      sharedUser = session?.user || null;
      sharedReady = true;
      if (returningFromAuth && sharedUser && event !== "PASSWORD_RECOVERY") {
        returningFromAuth = false;
        go("workspace");
      }
      if (event === "PASSWORD_RECOVERY") {
        openModal(
          '<h2>Choose a new password</h2><form id="new-password-form"><label>New password<input name="password" type="password" required minlength="10" maxlength="128" autocomplete="new-password"></label><button class="button dark">Save password</button><p class="note" id="new-password-status" role="status"></p></form>',
        );
      }
      if (
        ["account", "workspace", "project"].includes(page) ||
        page.startsWith("shared-project-")
      )
        render();
      if (sharedUser) await loadShared();
    }, 0);
  });
  try {
    const { data, error } = await Promise.race([
      sharedClient.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Sign-in connection timed out.")), 10000)),
    ]);
    if (error) throw error;
    sharedUser = data.session?.user || null;
  } catch {
    accountNotice = "Could not connect to sign-in. Check your connection and try again.";
  }
  sharedReady = true;
  if (
    ["account", "workspace", "project"].includes(page) ||
    page.startsWith("shared-project-")
  )
    render();
  if (sharedUser) await loadShared();
}
