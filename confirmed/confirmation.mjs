export function confirmationState(search, hash) {
  const params = [new URLSearchParams(search), new URLSearchParams(hash.replace(/^#/, ""))];
  const has = (name) => params.some((p) => p.has(name));
  if (has("error") || has("error_code") || has("error_description")) {
    return {
      title: "This link could not be confirmed",
      message: "It may have expired or already been used. Return to Grindset and request a fresh confirmation email. If you already confirmed your email, try signing in instead.",
    };
  }
  if (params.some((p) => p.get("code") || (p.get("type") === "signup" && p.get("access_token")))) {
    return {
      title: "Email confirmed",
      message: "Return to Grindset, open Settings and sign in with your email and password. You can close this browser tab. This page does not sign you in automatically.",
    };
  }
  return {
    title: "Return to Grindset",
    message: "Open the confirmation link from your email first, then return to Grindset Settings and sign in. Visiting this page alone does not confirm an account.",
  };
}

// A password reset link that landed here (the sign-in server's default page)
// belongs to the reset page, which needs the one-time sign-in it carries.
export function recoveryRedirect(hash) {
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery"
    ? `../reset-password/${hash}`
    : null;
}

if (typeof window !== "undefined" && recoveryRedirect(window.location.hash)) {
  window.location.replace(recoveryRedirect(window.location.hash));
} else if (typeof window !== "undefined") {
  const state = confirmationState(window.location.search, window.location.hash);
  // Never persist, exchange, display or forward credentials from the callback.
  window.history.replaceState(null, "", window.location.pathname);
  document.getElementById("status-title").textContent = state.title;
  document.getElementById("status-message").textContent = state.message;
}
