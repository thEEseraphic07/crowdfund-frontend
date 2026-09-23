const form = document.getElementById("registerForm");
const errorMsg = document.getElementById("errorMsg");
const submitBtn = document.getElementById("submitbtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!name || !email || !password || !confirmPassword) {
    errorMsg.textContent = "All fields are required";
    return;
  }

  if (password !== confirmPassword) {
    errorMsg.textContent = "Passwords do not match";
    return;
  }

  if (password.length < 8 || !/\d/.test(password) || !/[A-Z]/.test(password)) {
    errorMsg.textContent="Password must be at least 8 characters, include a number, a special character (&, $, #, ~, *) and at least one uppercase letter";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, 
        email, 
        password,
        confirmPassword
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.log("BACKEND ERROR:", data);
      errorMsg.textContent=data.message || "Registration failed";
      return;
    }

    window.location.href = "check-email.html";

  } catch (err) {
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account";
  }
});

const brand = "CrowdFund";
const brandContainer = document.getElementById("brand");
const intro = document.getElementById("intro");
const authContainer = document.querySelector(".auth-container");

authContainer.style.opacity = "0";

brand.split("").forEach((letter, i) => {
  const span = document.createElement("span");
  span.textContent = letter;
  span.classList.add("letter");
  span.style.animationDelay = `${i * 0.2}s`;
  brandContainer.appendChild(span);
});

setTimeout(() => {
  brandContainer.classList.add("glow");

  setTimeout(() => {
    intro.style.display = "none";
    authContainer.style.opacity = "1";
    authContainer.style.transition = "opacity 1s ease";
  }, 2000);

}, brand.length * 100 + 200);