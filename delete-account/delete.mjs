// Deletes a Grindset account from the web, for people who no longer have the
// app. Uses the same server function as the app; nothing is stored here.
export const project = "https://fajonmibrspfdozldjap.supabase.co";
// Public client key: the same one every app build ships with.
export const publicKey = "sb_publishable_vZzc9bEIG0f5im__x8A4RA_VAnCElrD";

export async function deleteAccount(fetch, email, password) {
  const headers = { apikey: publicKey, "Content-Type": "application/json" };
  let response;
  try {
    response = await fetch(`${project}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { ok: false, message: "Could not reach Grindset's server. Check your connection and try again." };
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const unconfirmed = /not confirmed/i.test(body.msg ?? body.error_description ?? body.message ?? "");
    return {
      ok: false,
      message: unconfirmed
        ? "This email was never confirmed, so there is no synced data. Confirm it first if you still want the account removed."
        : "That email and password did not match an account. Nothing was deleted.",
    };
  }
  const { access_token: token } = await response.json();
  try {
    response = await fetch(`${project}/rest/v1/rpc/delete_account`, {
      method: "POST",
      headers: { ...headers, Authorization: `Bearer ${token}` },
      body: "{}",
    });
  } catch {
    return { ok: false, message: "Could not reach Grindset's server. Nothing was deleted. Try again." };
  }
  if (!response.ok) {
    return { ok: false, message: "The server could not delete the account. Nothing was deleted. Try again later." };
  }
  return { ok: true, message: "Your account and all of its synced data are deleted. Devices keep what is stored on them until you reset them in Grindset Settings." };
}

if (typeof document !== "undefined") {
  const form = document.getElementById("delete-form");
  const status = document.getElementById("status");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    status.textContent = "Deleting...";
    const result = await deleteAccount(globalThis.fetch.bind(globalThis), form.email.value.trim(), form.password.value);
    form.password.value = "";
    status.textContent = result.message;
    if (result.ok) form.hidden = true;
    else button.disabled = false;
  });
}
