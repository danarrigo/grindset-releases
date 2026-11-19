// Password reset for Grindset accounts. Step 1 asks Grindset's sign-in server
// to email a reset link; step 2 (opened from that link) sets the new password.
// Nothing is stored; the one-time sign-in from the link stays in memory.
import { project, publicKey } from "../delete-account/delete.mjs";

const page = "https://danarrigo.github.io/grindset-releases/reset-password/";

export function recoveryToken(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("type") === "recovery" ? params.get("access_token") : null;
}

export async function requestReset(fetch, email) {
  try {
    const response = await fetch(`${project}/auth/v1/recover?redirect_to=${encodeURIComponent(page)}`, {
      method: "POST",
      headers: { apikey: publicKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (response.status === 429) {
      return { ok: false, message: "Too many emails were sent just now. Wait an hour, then try again." };
    }
    if (!response.ok) return { ok: false, message: "Could not send the email. Check the address and try again." };
  } catch {
    return { ok: false, message: "Could not reach Grindset's server. Check your connection and try again." };
  }
  // The same answer whether or not the account exists, so this page cannot be
  // used to find out who has one.
  return { ok: true, message: "If that email has a Grindset account, a reset link is on its way. Open it on this device." };
}

export async function setPassword(fetch, token, password) {
  if (password.length < 6) return { ok: false, message: "Use at least 6 characters." };
  try {
    const response = await fetch(`${project}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: publicKey, "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password }),
    });
    if (response.ok) return { ok: true, message: "Password changed. Open Grindset and sign in with your new password." };
    const body = await response.json().catch(() => ({}));
    if (/weak|short|characters/i.test(body.msg ?? body.message ?? "")) {
      return { ok: false, message: "That password is too weak. Try a longer one." };
    }
    if (/same|different/i.test(body.msg ?? body.message ?? "")) {
      return { ok: false, message: "Choose a password different from your old one." };
    }
    return { ok: false, message: "This reset link has expired or was already used. Request a new one below." };
  } catch {
    return { ok: false, message: "Could not reach Grindset's server. Check your connection and try again." };
  }
}

if (typeof document !== "undefined") {
  const token = recoveryToken(window.location.hash);
  // Remove the one-time sign-in from the address bar and history at once.
  window.history.replaceState(null, "", window.location.pathname);
  const request = document.getElementById("request-form");
  const change = document.getElementById("change-form");
  const status = document.getElementById("status");
  if (token) {
    request.hidden = true;
    change.hidden = false;
    document.getElementById("title").textContent = "Choose a new password";
  }
  async function submit(form, work) {
    const button = form.querySelector("button");
    button.disabled = true;
    status.textContent = "Working...";
    const result = await work();
    status.textContent = result.message;
    if (result.ok) form.hidden = true;
    else button.disabled = false;
  }
  request.addEventListener("submit", (event) => {
    event.preventDefault();
    submit(request, () => requestReset(globalThis.fetch.bind(globalThis), request.email.value.trim()));
  });
  change.addEventListener("submit", (event) => {
    event.preventDefault();
    if (change.password.value !== change.confirm.value) {
      status.textContent = "The two passwords don't match.";
      return;
    }
    submit(change, () => setPassword(globalThis.fetch.bind(globalThis), token, change.password.value));
  });
}
