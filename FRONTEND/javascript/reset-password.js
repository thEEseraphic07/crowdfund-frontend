const params = new URLSearchParams(window.location.search);
const token = params.get("token");

const form = document.getElementById("resetForm");
const msg = document.getElementById("message");
const btn = document.getElementById("resetBtn");

if (!token) {
  msg.textContent = "Invalid or missing reset token.";
  btn.disabled = true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  msg.textContent = "";

  if (password !== confirmPassword) {
    msg.textContent = "Passwords do not match";
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = "Resetting...";

    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, password, confirmPassword }),
    });

    const data = await res.json();

    if (res.ok) {
      msg.textContent = "Password reset successful! Redirecting...";

      setTimeout(() => {
        window.location.href = "../pages/login.html";
      }, 1500);
    } else {
      msg.textContent = data.message || "Reset failed";
      btn.disabled = false;
      btn.textContent = "Reset Password";
    }
  } catch (error) {
    msg.textContent = "Something went wrong. Try again.";
    btn.disabled = false;
    btn.textContent = "Reset Password";
  }
});

document.getElementById("resendForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const msg = document.getElementById("message");

  try {
    const res = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    msg.textContent = data.message;

  } catch {
    msg.textContent = "Something went wrong";
  }
});