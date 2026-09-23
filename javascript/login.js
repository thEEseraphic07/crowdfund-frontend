const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");
const loginBtn = form.querySelector("button");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("rememberMe").checked;

  if (!email || !password) {
    errorMsg.textContent = "All fields are required";
    return;
  }

  const loginBtn = document.getElementById("loginBtn");

  loginBtn.textContent = "Logging in...";
  loginBtn.disabled = true;

  try {
    loginBtn.disabled = true;

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorMsg.textContent = data.message || "Invalid email or password";
      loginBtn.disabled = false;
      return;
    }

    if(data.twoFactorRequired){
      localStorage.setItem("tempEmail", data.email);
      window.location.href = "../pages/verify-otp.html";
      return;
    }

    localStorage.setItem("token", data.token);

    if (data.user.isAdmin) {
      window.location.href = "../pages/admin.html";
    } else {
      window.location.href = "../pages/dashboard.html";
    }

    document.getElementById("email").value = localStorage.getItem("tempEmail");

  } catch (err) {
    errorMsg.textContent = "Server error. Try again.";
  }finally {
    loginBtn.textContent = "Login";
    loginBtn.disabled = false;
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