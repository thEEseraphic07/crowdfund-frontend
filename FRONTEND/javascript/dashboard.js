const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

const socket = io(SOCKET_URL, {
  auth: {
    token
  }
});

const userNameEl = document.getElementById("userName");
const userEmailEl = document.getElementById("userEmail");
const totalRaisedEl = document.getElementById("totalRaised");
const activeCampaignsEl = document.getElementById("activeCampaigns");
const totalDonorsEl = document.getElementById("totalDonors");
const campaignGrid = document.getElementById("campaignGrid");
const campaignSearchInput = document.getElementById("searchCampaign");
const walletBalanceEl = document.getElementById("walletBalance");
const transactionsList = document.getElementById("transactionsList");
const logoutBtn = document.getElementById("logoutBtn");
const toastEl = document.getElementById("toast");
const allCampaignsGrid = document.getElementById("allCampaignsGrid");
const allSearchInput = document.getElementById("allCampaignSearch");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");
const themeToggleBtn = document.getElementById("themeToggle");
const notificationCount = document.getElementById("notifCount");
const profileForm = document.getElementById("profileForm");
const notifBtn = document.getElementById("notifBtn");
const notifDropdown = document.getElementById("notifDropdown");
const uploadBtn = document.getElementById("uploadBtn");
const removeBtn = document.getElementById("removeBtn");
const profileImage = document.getElementById("profileImage");

let selectedCampaignId = null;
let allCampaigns = [];
let currentUser = null;
let notifCount = 0;
let notifications = [];
let currentFilter = "all";

let savedCampaigns = JSON.parse(localStorage.getItem("savedCampaigns")) || [];

notifBtn.addEventListener("click", () => {
  document.querySelector('[data-section="notifications"]').click();
});

async function loadRecentActivity() {
  try {
    const data = await authFetch("/activity");

    const container = document.getElementById("activityList");

    container.innerHTML = data.map(item => `
      <div class="activity-item">
        <div class="activity-icon">
          ${getActivityIcon(item.type)}
        </div>

        <div class="activity-text">
          <h4>${item.title}</h4>
          <p>${item.message}</p>
          <small>${formatTime(item.time)}</small>
        </div>
      </div>
    `).join("");

  } catch (err) {
    console.error("Activity load failed:", err);
  }
}

function getActivityIcon(type) {
  switch (type) {
    case "transaction": return `<i class="fa-solid fa-coins"></i>`;
    case "notification": return `<i class="fa-solid fa-bell"></i>`;
    default: return `<i class="fa-solid fa-circle-info"></i>`;
  }
}

function addNotification(n) {
  notifications.unshift({
    id: crypto.randomUUID(),
    title: n.title,
    message: n.message,
    type: n.type,
    read: false,
    time: new Date().toISOString()
  });
  renderNotifications();
  updateCounts();
}

function renderNotifications() {
  const container = document.getElementById("notificationsContainer");

  let filtered = notifications.map((n, index) => ({
    ...n,
  }));

  if (currentFilter === "unread") {
    filtered = filtered.filter(n => !n.read);
  }

  container.innerHTML = filtered.map(n => `
    <div class="notif-card ${n.read ? "" : "unread"}">

      <div class="notif-icon">${getIcon(n.type)}</div>

      <div class="notif-content">
        <h4>${n.title}</h4>
        <p>${n.message}</p>
        <small>${formatTime(n.time)}</small>
      </div>
      <div class="notif-actions">
      ${!n.read ? `
        <button class="read-btn" onclick="markAsRead('${n.id}')">✓</button>
      ` : ""}
      <button class="delete-btn" onclick="deleteNotification('${n.id}')">🗑️</button>
      </div>
    </div>
  `).join("");

  updateCounts();
}


async function markAsRead(id) {
  const notif = notifications.find(n => n.id === id);
  if (!notif) return;

  notif.read = true;
  renderNotifications();
  updateCounts();

  try {
    await authFetch(`/notifications/${id}`, {
      method: "PUT"
    });
  } catch (err) {
    console.error(err);
  }
}

async function markAllAsRead() {
  notifications.forEach(n => n.read = true);

  renderNotifications();
  updateCounts();

  try {
    await Promise.all(
      notifications.map(n =>
        authFetch(`/notifications/${n.id}`, {
          method: "PUT"
        })
      )
    );
  } catch (err) {
    console.error(err);
  }
}

function saveNotifications() {
  localStorage.setItem("notifications", JSON.stringify(notifications));
}

async function loadNotifications() {
  try {
    const data = await authFetch("/notifications");

    console.log("NOTIFICATIONS:", data);

    const list = data.notifications || data;

    notifications = list.map(n => ({
      id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.isRead,
      time: n.createdAt
    }));

    renderNotifications();
    updateCounts();

  } catch (err) {
    console.error("Notifications error:", err.message);
  }
}

async function deleteNotification(id) {
  try {
    await authFetch(`/notifications/${id}`, {
      method: "DELETE"
    });

    notifications = notifications.filter(n => n.id !== id);

    renderNotifications();
    updateCounts();

  } catch (err) {
    console.error("Delete failed:", err.message);
  }
}

function formatTime(date) {
  const diff = (Date.now() - new Date(date)) / 1000;

  if (diff < 60) return "Just now";
  if (diff < 3600) return Math.floor(diff / 60) + " min ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hr ago";

  return new Date(date).toLocaleDateString();
}

function getIcon(type) {
  switch (type) {
    case "donation": return "💰";
    case "withdrawal": return "💸";
    case "campaign": return "📢";
    case "profile": return "👤";
    case "admin": return "🛠️";
    default: return "🔔";
  }
}

document.getElementById("markAllRead")?.addEventListener("click", markAllAsRead);

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentFilter = btn.dataset.tab;
    renderNotifications();
  });
});

function updateCounts() {
  const unread = notifications.filter(n => !n.read).length;

  const notifCountEl = document.getElementById("notifCount");
  if (!notifCountEl) return; 

  notifCountEl.textContent = unread;
  notifCountEl.style.display = unread > 0 ? "inline-block" : "none";
  
}

profileForm.addEventListener("submit", async (e) =>{
  e.preventDefault();

  const updatedData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    bio: document.getElementById("bio").value,
    location: document.getElementById("location").value
  };

  try{
    const res = await authFetch("/auth/update", {
      method: "PUT",
      body: JSON.stringify(updatedData)
    });

    showToast("Profile updated successfully");
    loadUser();
  }catch(err){
    console.error(err);
    showToast("Update failed")
  }
});

async function authFetch(endpoint, options = {}) {

  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return null;
  }

  const config = {
    method: options.method || "GET",

    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  };

  if (options.body) {
    config.body = options.body;
  }

  try {

    const res = await fetch(`${API_BASE}${endpoint}`, config);

    if (res.status === 401) {

      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      showToast("Session expired");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);

      return null;
    }

    let data;

    try {
      data = await res.json();
    } catch {
      throw new Error("Invalid server response");
    }

    if (!res.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;

  } catch (err) {

    console.error(`API ERROR (${endpoint}):`, err);

    showToast(err.message || "Something went wrong");

    return null;
  }
}

function formatCurrency(num) {
  if(num === undefined || num === null) return "₦0";
  return `₦${num.toLocaleString("en-NG")}`;
}

function showToast(message){
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

async function loadUser(){
  try {
    const res = await authFetch("/auth/me");

    if (!res || res.message) {
      console.error("User not authenticated");
      return;
    }

    const user = res.user || res;
    currentUser = user;

    const userId = user._id || user.id;
    if (!userId) return;

    const nameEl = document.getElementById("userName");
    const emailEl = document.getElementById("userEmail");

    if (nameEl) nameEl.textContent = user.name || "";
    if (emailEl) emailEl.textContent = user.email || "";

    socket.emit("joinUser");

    setAvatar(user);

  } catch (err) {
    console.error("loadUser failed:", err);
  }
}

async function loadCampaigns() {
  try {
    const campaigns = await authFetch("/campaigns/mine");
    if (!Array.isArray(campaigns)) return;

    let totalRaised = 0, donors = 0;

    campaignGrid.innerHTML = campaigns.map(c => {
      totalRaised += c.currentAmount || 0;
      donors += c.donations?.length || 0;

      const progress = ((c.currentAmount || 0) / c.targetAmount) * 100;
      const daysLeft = Math.ceil((new Date(c.deadline) - new Date()) / (1000 * 60 * 60 * 24));

      let progressColor = 'green';
      if (daysLeft <= 3) progressColor = 'red';
      else if (progress >= 100) progressColor = 'blue';

      return `
  <div class="campaign-card" data-id="${c._id}">
    
    <img 
      src="${c.image && c.image.startsWith('http') 
        ? c.image 
        : 'https://via.placeholder.com/300'}" 
      alt="${c.title}" 
      class="campaign-image"
    />

    <div class="campaign-card-content">

      <h3>${c.title}</h3>

      <p class="campaign-description">
        ${c.description.substring(0, 90)}...
      </p>

      <p>
        ${formatCurrency(c.currentAmount || 0)} raised of 
        ${formatCurrency(c.targetAmount)}
      </p>

      <p>
        Deadline: ${daysLeft} day(s) left
      </p>

      <div class="progress-bar">
        <div 
          class="progress" 
          style="
            width:${progress}%;
            background-color:${progressColor};
          ">
        </div>
      </div>

      <div class="campaign-actions">

        <button 
          class="edit-btn" 
          data-id="${c._id}">
          Edit
        </button>

        <button 
          class="donate-btn" 
          data-id="${c._id}"
          ${c.status === "ended" ? "disabled" : ""}>

          ${
            c.status === "ended"
              ? "Campaign Ended"
              : "Donate"
          }

        </button>

      </div>

    </div>
  </div>
`;
    }).join("");

    totalRaisedEl.textContent = formatCurrency(totalRaised);
    activeCampaignsEl.textContent = campaigns.length;
    totalDonorsEl.textContent = donors;

  } catch (err) {
    console.error(err);
  }
}

async function loadAllCampaigns() {
  console.log("LOAD ALL CAMPAIGNS CALLED");
  try {
    const campaigns = await authFetch("/campaigns");
    console.log("ALL CAMPAIGNS:", campaigns);
    allCampaigns = campaigns;
    renderAllCampaigns(allCampaigns, currentUser?._id);
  } catch (err) {
    console.error("Failed to load all campaigns:", err);
  }
}

function renderAllCampaigns(campaigns, currentUserId) {
  console.log("RENDERING:", campaigns);
  if(campaigns.length === 0){
    allCampaignsGrid.innerHTML = `
    <div class="empty-state">
      <h3>No campaigns found</h3>
      <p>Try adjusting your filters or check back later.</p>
    </div>
    `;
    return;
  }

  allCampaignsGrid.innerHTML = campaigns.map(c => {
    const isOwner = c.user?._id === currentUserId;
    const isSaved = savedCampaigns.includes(c._id);
    const progress = ((c.currentAmount || 0) / c.targetAmount) * 100;
    const daysLeft = Math.ceil((new Date(c.deadline) - new Date()) / (1000*60*60*24));

    return `
      <div class="campaign-card" data-id="${c._id}">
        <img src="${c.image || 'placeholder.jpg'}" alt="${c.title}" class="campaign-image"/>
        <div class="campaign-card-content">
        <h3>${c.title}</h3>
        <p class="campaign-description">${c.description.substring(0,90)}...</p>
        <p>${formatCurrency(c.currentAmount || 0)} raised of ${formatCurrency(c.targetAmount)}</p>
        <p>Deadline: ${daysLeft} day(s) left</p>
        <div class="progress-bar">
          <div class="progress" style="width: ${progress}%;"></div>
        </div>
        <div class="campaign-actions">
        <button class="see-more-btn" data-id="${c._id}"> See More</button>

        <button class="donate-btn" data-id="${c._id}" ${c.status === "ended" ? "disabled" : ""}> ${c.status === "ended"
          ? "Campaign Ended"
          : "Donate"
        }
        </button>
        </div>

        <div class="campaign-extra-actions">
        <button class="share-btn" data-id="${c._id}"><i class="fa-solid fa-share-nodes"></i>
        </button>

        <button class="p-save-btn ${isSaved ? "saved" : ""}" data-id="${c._id}"><i class="${isSaved ? "fa-solid fa-heart" : "fa-regular fa-heart"}"></i>
        </button>
        </div>
        </div>
      </div>
    `;
  }).join("");
}

categoryFilter.addEventListener("change", applyFilters);
statusFilter.addEventListener("change", applyFilters);

const resultsCount = document.getElementById("resultsCount");

async function loadDonations() {
  try {
    const campaigns = await authFetch("/campaigns/mine");
    let allDonations = [];

    campaigns.forEach(c => {
      (c.donations || []).forEach(d => {
        allDonations.push({
          name: d.user?.name || "Anonymous",
          amount: d.amount,
          campaign: c.title,
          date: d.donatedAt,
          status: "Completed"
        });
      });
    });

    const tbody = document.querySelector("#donationsTable");
    tbody.innerHTML = allDonations.map(d => `
      <tr>
        <td>${new Date(d.date).toLocaleString()}</td>
        <td>${d.name}</td>
        <td>${d.campaign}</td>
        <td>${formatCurrency(d.amount)}</td>
        <td>${d.status}</td>
      </tr>
    `).join("");
  } catch (err) {
    console.error(err);
  }
}

async function loadWallet() {
  try {
    const wallet = await authFetch("/wallet")
    document.getElementById("walletBalance").textContent = formatCurrency(wallet.balance ?? wallet.data?.balance ?? 0);
    document.getElementById("availableBalance").textContent = formatCurrency(wallet.balance || 0);
    document.getElementById("totalWithdrawn").textContent = formatCurrency(wallet.withdrawn ?? wallet.data?.withdrawn ?? 0);

    transactionsList.innerHTML = (wallet.transactions || []).map(t => `
      <li>
        ${new Date(t.createdAt).toLocaleString()} • 
        ${t.type.toUpperCase()}  • 
        ${t.status.toUpperCase()} •
        ${formatCurrency(t.amount)}
      </li>
    `).join("");
  } catch (err) {
    console.error(err);
  }
}

async function loadAnalytics() {
  try {
    const campaigns = await authFetch("/campaigns/mine");

    let totalDonations = 0, totalAmount = 0;
    campaigns.forEach(c => (c.donations || []).forEach(d => {
      totalDonations++;
      totalAmount += d.amount;
    }));

    document.getElementById("analyticsTotalDonations").textContent = totalDonations;
    document.getElementById("analyticsTotalAmount").textContent = formatCurrency(totalAmount);
    document.getElementById("avgDonation").textContent = formatCurrency(totalAmount / totalDonations || 0);

    const top = campaigns.sort((a,b)=> (b.currentAmount || 0) - (a.currentAmount || 0)).slice(0,3);
    const container = document.getElementById("topCampaigns");
    container.innerHTML = top.map(c =>{
      const progress = ((c.currentAmount || 0) / c.targetAmount) * 100;
      return`
      <div class="campaign-card" data-id="${c._id}">
      <img src="${c.image || 'placeholder.jpg'}" alt="${c.title}" class="campaign-image"/>

      <div class="campaign-card-content">
      <h3>${c.title}</h3>
      <p class="campaign-desription">${c.description.substring(0,90)}...</p>
      <p> ${formatCurrency(c.currentAmount || 0)} raised of ${formatCurrency(c.targetAmount)}</p>
      <div class="progress-bar">
      <div class="progress" style="width:${progress}%"></div>
      </div>

      <div class="campaign-actions">
      <button class="see-more-btn" data-id="${c._id}"> See More </button>
      <button class="donate-btn" data-id="${c._id}"> Donate </button>
      </div>
      </div>
      </div>
      `
    }).join("");
  } catch (err) {
    console.error(err);
  }
}

async function loadProfileDashboard() {
  try {
    const userRes = await authFetch("/auth/me");
    const wallet = await authFetch("/wallet");
    const campaigns = await authFetch("/campaigns/mine");

    const user = userRes.user || userRes;

    currentUser = user;

  
    document.getElementById("profileNameDisplay").textContent = user.name;
    document.getElementById("profileEmailDisplay").textContent = user.email;

    const joinDate = user.createdAt || user._id;
    document.getElementById("memberSince").textContent =
    user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "Recently joined";

    console.log("USER:", userRes);
    console.log("WALLET:", wallet);
    console.log("CAMPAIGNS:", campaigns);

    document.getElementById("walletBalance").textContent =
      formatCurrency(wallet.balance || 0);

    document.getElementById("totalWithdrawn").textContent =
      formatCurrency(wallet.withdrawn || 0);

    let totalDonated = 0;

    campaigns.forEach(c => {
      (c.donations || []).forEach(d => {
        totalDonated += Number(d.amount || 0);
      });
    });

  } catch (err) {
    console.error("Profile dashboard error:", err);
  }
}

socket.on("connect", () => console.log("Connected to server"));
socket.on("userNotification", (data) => {
  notifications.unshift({
   id: data._id,
   title: data.title,
   message: data.message,
   type: data.type,
   time: data.createdAt,
   read: data.isRead
 });

  renderNotifications();
  updateCounts();
});

socket.on("newDonation", donation =>{
  addNotification({
    title: "New donation",
    message: `₦${donation.amount} donated to ${donation.campaign}`,
    type: "donation"
  });

  showToast(`₦${donation.amount} donated`);
  loadCampaigns();
  loadWallet();
});

socket.on("newNotification",(data) =>{
  addNotification({
    title: data.title,
    message: data.message,
    type: data.type
  });

  displayMessage(data.message, "success");
});

socket.on("withdrawalApproved", data =>{
  addNotification({
    title: "Withdrawal approved",
    message: `₦${data.amount} withdrawal approved`,
    type: "withdrawal"
  });

  showToast("Withdrawal approved");
  loadWallet();
});

socket.on("newCampaign", campaign => {
  allCampaigns.unshift(campaign);
  renderAllCampaigns(allCampaigns, currentUser?._id);
});

socket.on("accountStatusChanged", (data) => {
  if (data.isSuspended) {
    alert("Your account has been suspended");

    localStorage.removeItem("token");
    window.location.href = "login.html";
  }
});

socket.on("campaignUpdated", (data) => {
  const campaign = adminState.campaigns.find(c => c._id === data.campaignId);

  if (campaign) {
    campaign.status = data.status;
    renderCampaigns();
  }
});

document.querySelectorAll(".nav li").forEach(item => {
  item.addEventListener("click", () => {
    const sectionId = item.dataset.section;
    if (!sectionId) return;
    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
    document.getElementById(sectionId).classList.add("active");
    document.querySelectorAll(".nav li").forEach(i => i.classList.remove("active"));
    item.classList.add("active");
  });
});

campaignSearchInput?.addEventListener("input", () => {
  const term = campaignSearchInput.value.toLowerCase();
  campaignGrid.querySelectorAll(".campaign-card").forEach(card => {
    const title = card.querySelector("h3").textContent.toLowerCase();
    const description = card.querySelector("p").textContent.toLowerCase();
    card.style.display = title.includes(term) || description.includes(term) ? "" : "none";
  });
});

function applyFilters() {
  console.log("APPLY FILTERS CALLED");
  const searchTerm = allSearchInput.value.toLowerCase();
  const selectedCategory = categoryFilter.value;
  const selectedStatus = statusFilter.value;
  console.log("Selected Category:", selectedCategory);
  console.log("Selected Status:", selectedStatus);

  allCampaigns.forEach(c =>{
    console.log(
      c.title,
      "| Category:", c.category,
      "| Status:", c.status
    );
  });

  const filtered = allCampaigns.filter(c => {

    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm) ||
      c.description.toLowerCase().includes(searchTerm);

    const matchesCategory =
      selectedCategory === "all" ||
      c.category?.toLowerCase().trim() === selectedCategory.toLowerCase().trim();

    const matchesStatus =
      selectedStatus === "all" ||
      c.status?.toLowerCase().trim() === selectedStatus.toLowerCase().trim();
      console.log(
       c.title,
       matchesCategory,
       matchesStatus,
       c.category,
       selectedCategory,
       c.status,
       selectedStatus
      )

    return matchesSearch && matchesCategory && matchesStatus;
  });
  console.log("Filtering campaign:", filtered);

  renderAllCampaigns(filtered, currentUser?._id);
}

allSearchInput?.addEventListener("input", applyFilters);
categoryFilter?.addEventListener("change", applyFilters);
statusFilter?.addEventListener("change", applyFilters);

function handleCampaignClick(e, section) {
  const button = e.target.closest("button");
  if(!button) return;

  const id = button.dataset.id;

  if(button.classList.contains("see-more-btn")){
    window.location.href = `campaign-details.html?id=${id}`;
  }

  if(button.classList.contains("save-btn")){
    const campaignId = id;

    if(savedCampaigns.includes(campaignId)){

      savedCampaigns = savedCampaigns.filter(c => c !== campaignId);
      
      showToast("Campaign removed");
    }else{
      savedCampaigns.push(campaignId);
      showToast("Campaign Saved ❤️");
    }

    localStorage.setItem("savedCampaigns", JSON.stringify(savedCampaigns));

    renderAllCampaigns(allCampaigns);
    renderSavedCampaigns();
  }

  if(e.target.closest(".share-btn")){
    const url = `${window.location.origin}/campaign-details.html?id=${id}`;

    navigator.clipboard.writeText(url);
    showToast("Campaign link copied!");
  }

  if (e.target.classList.contains("donate-btn")) {

  const campaign = allCampaigns.find(c => c._id === id);

  if (campaign && campaign.status === "ended") {
    showToast("This campaign has ended. Thank you for your support ❤️");
    return;
  }

  selectedCampaignId = id;
  const modal = document.getElementById("donateModal");
  if (modal) {
    modal.classList.remove("hidden")
  };
}

  if(e.target.classList.contains("edit-btn") && section === "mine"){
    authFetch(`/campaigns/${id}`).then(campaign => {
      const updatedData = {};
      const newTitle = prompt("Edit title:", campaign.title);
      const newDesc = prompt("Edit description:", campaign.description);
      const newTarget = prompt("Edit targetAmount:", campaign.targetAmount);
      const newImage = prompt("Edit image URL:", campaign.image);

      if(newTitle !== null) updatedData.title = newTitle;
      if(newDesc !== null) updatedData.description = newDesc;
      if(newTarget !== null) updatedData.targetAmount = newTarget;
      if(newImage !== null) updatedData.image = newImage;

      authFetch(`/campaigns/${id}`, { method: "PUT", body: JSON.stringify(updatedData) })
        .then(() => {
          showToast("Campaign updated");
          loadCampaigns();
          loadAllCampaigns();
        });
    });
  }
}

function renderSavedCampaigns() {

  const grid =
    document.getElementById("savedCampaignsGrid");

  if (!grid) return;

  const saved = allCampaigns.filter(c =>
    savedCampaigns.includes(c._id)
  );

  renderCampaignCards(saved, grid);
}

campaignGrid?.addEventListener("click", e => handleCampaignClick(e, "mine"));
allCampaignsGrid?.addEventListener("click", e => handleCampaignClick(e, "all"));

document.getElementById("logoutBtn").addEventListener("click", async () => {
  console.log("Logout clicked");

  const confirmed = await showConfirm(
    "Logout",
    "Are you sure you want to logout?"
  );

  if (!confirmed) return;

  localStorage.removeItem("token");
  sessionStorage.removeItem("token");

  showToast("Logged out successfully", "success");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 1000);

});

const donationInput =
document.getElementById(
"donationAmount"
);

document
.querySelectorAll(
".quick-amounts button"
)

.forEach(btn=>{

btn.onclick=()=>{

donationInput.value =
btn.dataset.value;

updateSummary();

};

});

function updateSummary(){

const amount =
Number(
donationInput.value
)||0;

const fee =
amount*0.05;

document.getElementById(
"summaryAmount"
).textContent =
formatCurrency(
amount
);

document.getElementById(
"summaryFee"
).textContent =
formatCurrency(
fee
);

document.getElementById(
"summaryCreator"
).textContent =
formatCurrency(
amount-fee
);

}

donationInput.addEventListener(
"input",
updateSummary
);

document
.getElementById(
"closeDonate"
)

.onclick=()=>{

document
.getElementById(
"donateModal"
)

.classList.add(
"hidden"
);

};

document.getElementById("payBtn")
?.addEventListener(
"click",
async ()=>{

const amount =
Number(
document
.getElementById(
"donationAmount"
)
.value
);

if(
!amount
||
amount<=0
){

showToast(
"Enter a valid amount"
);

return;

}

const payNowBtn =
document
.getElementById(
"payBtn"
);

payNowBtn.disabled =
true;

try{

const data =
await authFetch(
"/payments/initialize",
{
method:"POST",

body:
JSON.stringify({

campaignId:
selectedCampaignId,

amount

})
}
);

if(
!data?.authorization_url
){

showToast(
"Payment initialization failed"
);

payNowBtn.disabled =
false;

return;

}

window.location.href =
data.authorization_url;

}

catch(err){

console.error(
err
);

showToast(
"Payment failed"
);

payNowBtn.disabled =
false;

}

});

function displayMessage(message, type = "success") {
  const box = document.getElementById("messageBox");

  box.style.display = "block";
  box.className = type; // success or error
  box.innerText = message;
}

const withdrawBtn = document.getElementById("withdrawBtn");

withdrawBtn?.addEventListener("click", async () => {
  const amount = parseFloat(document.getElementById("withdrawAmount").value);
  const bankName = document.getElementById("bankName").value.trim();
  const accountNumber = document.getElementById("accountNumber").value.trim();

  if (!amount || amount <= 0) {
    return showToast("Enter a valid amount");
  }

  if (!bankName || !accountNumber) {
    return showToast("Enter bank details");
  }

  withdrawBtn.disabled = true;
  withdrawBtn.textContent = "Processing...";

try {
  const token = localStorage.getItem("token") ||
  sessionStorage.getItem("token");

  console.log("WITHDRAW DATA:", {
    amount,
    bankName,
    accountNumber
  });

  const res = await fetch(`${API_BASE}/withdraw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      amount,
      bankName,
      accountNumber
    })
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = { message: "Unexpected server response" };
  }

  console.log("RESPONSE:", data);

  if (res.status === 401) {
    displayMessage("Session expired. Please log in again.", "error");
    localStorage.removeItem("token");
    window.location.href = "login.html";
    return;
  }

  if (!res.ok) {
    displayMessage(data.message || "Unable to process withdrawal", "error");
    return;
  }

  displayMessage(data.message || "Withdrawal submitted successfully", "success");
  loadWallet();

} catch (err) {
  console.error(err);
  displayMessage("Network error. Try again.", "error");

} finally {
  withdrawBtn.disabled = false;
  withdrawBtn.textContent = "Withdraw";
}
});

themeToggleBtn?.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const icon = themeToggleBtn.querySelector("i");

  if (document.body.classList.contains("dark")) {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
  } else {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
  }
});

const sidebarToggle = document.getElementById("sidebarToggle");
const dashboard = document.querySelector(".dashboard");
const sidebar = document.querySelector(".sidebar");

sidebarToggle?.addEventListener("click", () => {

  if (window.innerWidth <= 768) {

    sidebar.classList.toggle("active");

    const icon = sidebarToggle.querySelector("i");

    if (sidebar.classList.contains("active")) {
      icon.classList.remove("fa-bars");
      icon.classList.add("fa-xmark");
    } else {
      icon.classList.remove("fa-xmark");
      icon.classList.add("fa-bars");
    }

    return;
  }

  dashboard.classList.toggle("collapsed");

  const icon = sidebarToggle.querySelector("i");

  if (dashboard.classList.contains("collapsed")) {
    icon.classList.remove("fa-bars");
    icon.classList.add("fa-chevron-right");
  } else {
    icon.classList.remove("fa-chevron-right");
    icon.classList.add("fa-bars");
  }

});

const avatar = document.getElementById("avatar");
const fileInput = document.getElementById("fileInput");

function setAvatar(user) {
  const name = user?.name || "User";
  const image = user?.image;

  if (image) {
    avatar.innerHTML = `<img src="${image}" />`;
  } else {
    const initials = name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();

    avatar.textContent = initials;
  }

  document.getElementById("profileNameDisplay").textContent = name;
  document.getElementById("profileEmailDisplay").textContent = user?.email || "";
}

document.getElementById("uploadBtn")?.addEventListener("click", () => {
  fileInput.click();
});

fileInput?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async () => {
    const base64 = reader.result;

    avatar.innerHTML = `<img src="${base64}" />`;

    try {
      await authFetch("/auth/update", {
        method: "PUT",
        body: JSON.stringify({ image: base64 })
      });

      showToast("Profile image updated");
    } catch (err) {
      showToast("Upload failed");
    }
  };

  reader.readAsDataURL(file);
});

document.getElementById("removeBtn")?.addEventListener("click", async () => {
  try {
    await authFetch("/auth/update", {
      method: "PUT",
      body: JSON.stringify({ image: "" })
    });

    avatar.textContent = currentUser?.name?.[0] || "U";
    showToast("Profile image removed");
  } catch (err) {
    showToast("Failed to remove image");
  }
});

(async function init(){
  try {
    await loadProfileDashboard();
  } catch (err) {
    console.error("User load failed", err);
  }


  try { await loadCampaigns(); } catch(e){ console.error(e); }
  try { await loadWallet(); } catch(e){ console.error(e); }
  try { await loadDonations(); } catch(e){ console.error(e); }
  try { await loadAnalytics(); } catch(e){ console.error(e); }
  try { await loadAllCampaigns(); } catch(e){ console.error(e); }
  try { await loadNotifications(); } catch(e){ console.error(e); }
  try { await loadRecentActivity(); } catch(e){ console.error(e); }

})();




