const campaignForm = document.getElementById("campaignForm");

campaignForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token")
  sessionStorage.getItem("token");
  if (!token) {
    alert("You must be logged in to create a campaign");
    window.location.href = "./login.html";
    return;
  }

  const title = campaignForm.querySelector('[name="title"]').value.trim();
  const description = campaignForm.querySelector('[name="description"]').value.trim();
  const targetAmount = Number(campaignForm.querySelector('[name="targetAmount"]').value);
  const deadline = campaignForm.querySelector('[name="deadline"]').value;
  const category = campaignForm.querySelector('[name="category"]').value;
  const image = campaignForm.querySelector('[name="image"]').value.trim();

  if (!title || !description || !targetAmount || !deadline || !category) {
    return alert("All fields are required");
  }

  try {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        title, 
        description, 
        targetAmount, 
        deadline, 
        category, 
        image 
      }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Failed to create campaign");

    alert("Campaign created successfully 🚀");
    window.location.href = "./dashboard.html";

  } catch (error) {
    console.error(error);
    alert("Something went wrong");
  }
});