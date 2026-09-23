async function forgotPassword() {
  const email = document.getElementById("email").value.trim();
  const msg = document.getElementById("message");

  if (!email) {
    msg.textContent = "Enter your email";
    return;
  }

  try {
    await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    msg.textContent = data.message;
  } catch {
    msg.textContent = "Error sending reset email.";
  }
}
