const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../pages/login.html";
}

const socket = io(SOCKET_URL, {
  auth: {
    token
  }
});

socket.on("connect", () =>{
  console.log("Socket connected:", socket.id);
  socket.emit("joinAdmin");
});

let adminState = {
  users: [],
  campaigns: [],
  donations: [],
  withdrawals: [],
  transactions: [],
  notifications: []
};

let announcements = [];
let selectedAnnouncements = null;

let editingAnnouncementId = null;

let contactMessages = [];

let notificationFilter = "all";

function renderNotifications() {

    const container = document.getElementById("adminNotifications");

    if (!container) return;

    let filteredNotifications = adminState.notifications;

    if (notificationFilter === "unread") {
        filteredNotifications = adminState.notifications.filter(
            n => !n.isRead
        );
    }

    if (!filteredNotifications.length) {

        container.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications found</p>
            </div>
        `;

        return;
    }

    container.innerHTML = filteredNotifications.map(n => `

        <div class="notification-card ${n.isRead ? "" : "unread"}">

            <div class="notification-left">

                <div class="notification-icon ${n.type}">
                   <i class="${getNotificationIcon(n.type)}"></i>
                </div>

                <div class="notification-content">
                  <div class="notification-header">
                    <h4>${n.title}</h4>
                    <span class="notification-time">
                      ${new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p>${n.message}</p>
                </div>

            </div>

            ${
                !n.isRead
                ? `<span class="unread-dot"></span>`
                : ""
            }

        </div>

    `).join("");

}

let campaignFilters = {
  search: "",
  status: "all",
  category: "all"
};

let campaignCategories = [];

let startX = 0;

document.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", (e) => {
  const endX = e.changedTouches[0].clientX;

  const diff = startX - endX;

  if (diff > 80) {
    const card = e.target.closest(".notification-card");
    if (card) {
      const id = card.dataset.id;
      deleteNotification(id);
    }
  }
});


socket.on(
  "adminNotification",
  (data) => {

    adminState.notifications.unshift({

      id: data._id,

      title: data.title,

      message: data.message,

      type: data.type,

      time: data.createdAt,

      read: data.isRead

    });

    renderNotifications();
    updateNotificationBadge();
  }
);

socket.on("campaignUpdated", (data) => {
  const campaign = adminState.campaigns.find(c => c._id === data.campaignId);
  if (campaign) {
    campaign.status = data.status;
    renderCampaigns();
  }
});

const toggleBtn = document.getElementById("toggleSidebar");
const sidebar = document.getElementById("adminSidebar");
const overlay = document.getElementById("sidebarOverlay");

function toggleSidebar() {
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
}

toggleBtn.addEventListener("click", toggleSidebar);
overlay.addEventListener("click", toggleSidebar);


async function authFetch(endpoint, options = {}) {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("API ERROR BODY:", data);
      return data;
    }

    return data;

  } catch (err) {
    console.error("Fetch failed:", err);
    return null;
  }
}

async function loadNotifications() {
  const data = await authFetch("/notifications");

  console.log("NOTIFICATIONS FROM API:", data);
  if (!data) return;

  adminState.notifications = data.map(n => ({
    id: n._id,
    title: n.title || "New Notification",
    message: n.message,
    type: n.type,
    createdAt: n.createdAt,
    isRead: n.isRead || false
  }));

  renderNotifications();
}

function updateNotificationBadge() {
  const count = adminState.notifications.filter(n => !n.isRead).length;

  const badge = document.getElementById("notifBadge");

  if (!badge) return;

  badge.textContent = count;
  badge.style.display = count > 0 ? "block" : "none";
}

async function loadContactMessages(){

  const messages = await authFetch("/contact");

  contactMessages = messages;

  const tbody = document.querySelector("#contactTable tbody");

  tbody.innerHTML = "";

  if(messages.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="6"  class="no-messages">
          No contact messages found.
        </td>
      </tr>
    `;
    return;
  }

  messages.forEach(message=>{
    tbody.innerHTML += `
       <tr>
         <td>${message.name}</td>
         <td>${message.email}</td>
         <td>${message.phone}</td>
         <td><span class="${message.status === "replied"
          ? "status-replied"
          : message.status === "read"
          ? "status-read"
          : "status-unread"
         }">
         ${message.status}
         </span>
         </td>
         <td>${new Date(message.createdAt).toLocaleDateString()}</td>

         <td>
           <button class="view-contact" data-id="${message._id}">View</button>
          </td>
         </tr> 
    `;
  });
  
  document.querySelectorAll(".view-contact").forEach(button=>{
  button.addEventListener("click", ()=>{
    console.log("View button clicked");
    const id = button.dataset.id;
    openContactModal(id);
  });
  });
}

document.getElementById("deleteMessageBtn").addEventListener("click", async () => {

    if (!selectedContactId) return;

    const confirmed = await showConfirm(
        "Delete Contact Message",
        "Are you sure you want to delete this message? This action cannot be undone."
    );

    if (!confirmed) return;

    const result = await authFetch(
        `/contact/${selectedContactId}`,
        {
            method: "DELETE"
        }
    );

    console.log(result);

    if (!result || result.message === "Unable to delete message.") {
        showToast("Unable to delete message.", "error");
        return;
    }

    document.getElementById("contactModal").style.display = "none";

    contactMessages = contactMessages.filter(
        msg => msg._id !== selectedContactId
    );

    selectedContactId = null;

    await loadContactMessages();

    showToast("Message deleted successfully!", "success");

});

document.getElementById("markReadBtn").addEventListener("click", async () => {

  if (!selectedContactId) return;

    const result = await authFetch(

        `/contact/${selectedContactId}/read`,

        {

            method: "PATCH"

        }

    );
    console.log(result);

    if (result.message === "Unable to update message") return;

    const message = contactMessages.find(
      msg => msg._id === selectedContactId
    );

    if(message){
      message.status =  "read";
    }

    await  loadContactMessages();

    document.getElementById("contactModal").style.display = "none";
});

document.getElementById("sendReplyBtn")
.addEventListener("click", async () => {

    if (!selectedContactId) return;

    const subject = document.getElementById("replySubject").value;

    const reply = document.getElementById("replyMessage").value.trim();

    if (!reply) {
      showToast("Please type a reply first.", "error");
       return;

    }

    const result = await authFetch(

        `/contact/${selectedContactId}/reply`,

        {

            method: "PATCH",

            body: JSON.stringify({
                subject,
                reply
            })

        }

    );

    if (!result || result.message === "Unable to send reply.") {

        showToast(
            "Unable to send reply.",
            "error"
        );

        return;

    }

    showToast(
        "Reply sent successfully!",
        "success"
    );

    document.getElementById("replyModal").style.display = "none";

    document.getElementById("contactModal").style.display = "none";

    await loadContactMessages();

});

document.getElementById("replyMessageBtn")
.addEventListener("click", () => {

    const message = contactMessages.find(
        msg => msg._id === selectedContactId
    );

    if(!message) return;

    document.getElementById("replyUserName").textContent =
        message.name;

    document.getElementById("replyUserEmail").textContent =
        message.email;

    document.getElementById("replyMessage").value = "";

    document.getElementById("replyModal").style.display =
        "flex";

});

document.getElementById("closeReplyModal").addEventListener("click", () => {

  document.getElementById("replyModal").style.display = "none";

});

document.getElementById("cancelReplyBtn").addEventListener("click", () => {
  
  document.getElementById("replyModal").style.display = "none";

});

let selectedContactId = null;

function openContactModal(id){

  console.log("Opening modal", id);

    const message = contactMessages.find(
        msg => msg._id === id
    );

    if(!message) return;

    selectedContactId = id;

    document.getElementById("modalContactName").textContent =
        message.name;

    document.getElementById("modalContactEmail").textContent =
        message.email;

    document.getElementById("modalContactPhone").textContent =
        message.phone;

    document.getElementById("modalContactDate").textContent =
        new Date(message.createdAt)
            .toLocaleString();

    document.getElementById("modalContactMessage").textContent =
        message.message;

    document.getElementById("contactModal").style.display =
        "flex";

}

document.getElementById("closeContactModal")
.addEventListener("click", ()=>{

    document.getElementById("contactModal")
        .style.display = "none";

});

document.getElementById("contactModal")
.addEventListener("click",(e)=>{

    if(e.target.id==="contactModal"){

        document.getElementById("contactModal")
            .style.display="none";

    }

});

async function createAnnouncement() {

    const title =
        document.getElementById("announcementTitle").value.trim();

    const message =
        document.getElementById("announcementMessage").value.trim();

    const expiresAt =
        document.getElementById("announcementExpiry").value;

    if (!title || !message) {

        showToast(
            "Please fill in all required fields.",
            "error"
        );

        return;
    }

    const result = await authFetch(

        "/announcements",

        {

            method: "POST",

            body: JSON.stringify({

                title,
                message,
                expiresAt

            })

        }

    );

    if (!result || result.message === "Unable to create announcement.") {

        showToast(
            "Unable to create announcement.",
            "error"
        );

        return;
    }

    showToast(
        "Announcement saved as draft!",
        "success"
    );

    document.getElementById("announcementTitle").value = "";

    document.getElementById("announcementMessage").value = "";

    document.getElementById("announcementExpiry").value = "";

    loadAnnouncements();

}

document.getElementById("createAnnouncementBtn").addEventListener("click", createAnnouncement);

function renderAnnouncements() {

    const container = document.getElementById("announcementContainer");

    container.innerHTML = "";

    if (announcements.length === 0) {

        container.innerHTML = `
            <div class="announcement-empty">

                <i class="fas fa-bullhorn"></i>

                <h3>No announcements yet</h3>

                <p>Create your first announcement to notify users.</p>

            </div>
        `;

        return;
    }

    announcements.forEach(announcement => {

        container.innerHTML += `

            <div class="announcement-card">

                <div class="announcement-card-header">

                    <h3>${announcement.title}</h3>

                    <span class="${
                        announcement.published
                        ? "published-badge"
                        : "draft-badge"
                    }">

                        ${
                            announcement.published
                            ? "Published"
                            : "Draft"
                        }

                    </span>

                </div>

                <p class="announcement-message">
                    ${announcement.message}
                </p>

                <div class="announcement-footer">

                    <small>
                        ${new Date(
                            announcement.createdAt
                        ).toLocaleDateString()}
                    </small>

                    <div class="announcement-actions">

                        <button
                            class="edit-announcement"
                            data-id="${announcement._id}"
                        >
                            Edit
                        </button>

                        <button
                            class="${
                                announcement.published
                                ? "unpublish-announcement"
                                : "publish-announcement"
                            }"
                            data-id="${announcement._id}"
                        >
                            ${
                                announcement.published
                                ? "Unpublish"
                                : "Publish"
                            }
                        </button>

                        <button
                            class="delete-announcement"
                            data-id="${announcement._id}"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            </div>
        `;
    });

    document.querySelectorAll(".edit-announcement").forEach(button => {

        button.addEventListener("click", () => {

            editAnnouncement(button.dataset.id);

        });

    });

    document.querySelectorAll(".delete-announcement").forEach(button => {

        button.addEventListener("click", () => {

            deleteAnnouncement(button.dataset.id);

        });

    });

    document.querySelectorAll(".publish-announcement").forEach(button => {

        button.addEventListener("click", () => {

            publishAnnouncement(button.dataset.id);

        });

    });

    document.querySelectorAll(".unpublish-announcement").forEach(button => {

        button.addEventListener("click", () => {

            unpublishAnnouncement(button.dataset.id);

        });

    });

}

function renderFeaturedAnnouncement(announcement) {

    const featured = document.getElementById("featuredAnnouncement");

    featured.innerHTML = `
        <div class="featured-card">

            <span class="announcement-badge">
                📢 Latest Update
            </span>

            <h2>${announcement.title}</h2>

            <p>

                ${announcement.message.substring(0,180)}
                ${announcement.message.length > 180 ? "..." : ""}

            </p>

            <div class="announcement-footer">

                <span>

                    ${new Date(
                        announcement.createdAt
                    ).toLocaleDateString()}

                </span>

                <button
                    class="read-more-btn"
                    data-id="${announcement._id}"
                >
                    Read More
                </button>

            </div>

        </div>
    `;
    featured.querySelector(".read-more-btn").addEventListener("click", () =>{
      openAnnouncementModal(announcement);
    });

}

document.querySelectorAll(".delete-announcement").forEach(button => {

  button.addEventListener("click", () => {
    
    console.log("Delete button clicked");
    console.log("Announcement Id:", button.dataset.id);

    deleteAnnouncement(button.dataset.id);

  });
});



document.querySelectorAll(".publish-announcement").forEach(button => {

    button.addEventListener("click", () => {

        publishAnnouncement(button.dataset.id);

    });

});

document.querySelectorAll(".unpublish-announcement").forEach(button => {

    button.addEventListener("click", () => {

        unpublishAnnouncement(button.dataset.id);

    });

});

async function deleteAnnouncement(id) {

    const confirmed = await showConfirm(

        "Delete Announcement",

        "Are you sure you want to delete this announcement? This action cannot be undone."

    );

    if (!confirmed) return;

    const result = await authFetch(

        `/announcements/${id}`,

        {

            method: "DELETE"

        }

    );

    if (!result || result.message === "Unable to delete announcement.") {

        showToast(
            "Unable to delete announcement.",
            "error"
        );

        return;

    }

    showToast(
        "Announcement deleted successfully!",
        "success"
    );

    loadAnnouncements();

}

async function publishAnnouncement(id){

    const result = await authFetch(

        `/announcements/${id}/publish`,

        {

            method:"PATCH"

        }

    );

    if(!result){

        showToast(
            "Unable to publish announcement.",
            "error"
        );

        return;

    }

    showToast(
        "Announcement published!",
        "success"
    );

    loadAnnouncements();

}

async function unpublishAnnouncement(id){

    const result = await authFetch(

        `/announcements/${id}/unpublish`,

        {

            method:"PATCH"

        }

    );

    if(!result){

        showToast(
            "Unable to unpublish announcement.",
            "error"
        );

        return;

    }

    showToast(
        "Announcement moved to drafts.",
        "success"
    );

    loadAnnouncements();

}

async function updateAnnouncement(){

    const title =
        document.getElementById("announcementTitle").value.trim();

    const message =
        document.getElementById("announcementMessage").value.trim();

    const expiresAt =
        document.getElementById("announcementExpiry").value;

    const result = await authFetch(

        `/announcements/${editingAnnouncementId}`,

        {

            method:"PUT",

            body:JSON.stringify({

                title,
                message,
                expiresAt

            })

        }

    );

    if(!result){

        showToast(
            "Unable to update announcement.",
            "error"
        );

        return;

    }

    showToast(
        "Announcement updated successfully!",
        "success"
    );

    editingAnnouncementId = null;

    document.querySelector(".announcement-form h3").textContent =
        "Create Announcement";

    document.getElementById("createAnnouncementBtn").textContent =
        "Save as Draft";

    document.getElementById("announcementTitle").value = "";

    document.getElementById("announcementMessage").value = "";

    document.getElementById("announcementExpiry").value = "";

    loadAnnouncements();

}

function editAnnouncement(id){

    const announcement = announcements.find(
        a => a._id === id
    );

    if(!announcement) return;

    if(editingAnnouncementId){
      return updateAnnouncement();
    }

    editingAnnouncementId = id;

    document.getElementById("announcementTitle").value =
        announcement.title;

    document.getElementById("announcementMessage").value =
        announcement.message;

    document.getElementById("announcementExpiry").value =
        announcement.expiresAt
            ? announcement.expiresAt.split("T")[0]
            : "";

    document.querySelector(".announcement-form h3").textContent =
        "Edit Announcement";

    document.getElementById("createAnnouncementBtn").textContent =
        "Update Announcement";

}



async function loadAnnouncements() {

  const data = await authFetch("/announcements");

  announcements = data;

  renderAnnouncements();

  document.getElementById("totalAnnouncements").textContent = announcements.length;

  document.getElementById("publishedAnnouncements").textContent = announcements.filter(a => a.published).length;

  document.getElementById("draftAnnouncements").textContent = announcements.filter(a => !a.published).length;

  console.log(announcements);

}

function renderAnnouncementList(announcements) {

    const list = document.getElementById("announcementList");

    announcements.forEach(announcement => {

        const item = document.createElement("div");

        item.className = "announcement-item";

        item.innerHTML = `
            <h4>${announcement.title}</h4>

            <small>
                ${new Date(
                    announcement.createdAt
                ).toLocaleDateString()}
            </small>

            <button class="read-more-btn">
                Read More
            </button>
        `;

        item.querySelector(".read-more-btn")
            .addEventListener("click", () => {

                openAnnouncementModal(announcement);

            });

        list.appendChild(item);

    });



}

// async function loadHomepageAnnouncements() {

//     const announcements = await fetch(`${API_BASE}/announcements/public`)
//         .then(res => res.json());

//     const featured = document.getElementById("featuredAnnouncement");
//     const list = document.getElementById("announcementList");

//     featured.innerHTML = "";
//     list.innerHTML = "";

//     if (!announcements.length) {

//         featured.innerHTML = `
//             <div class="announcement-placeholder">
//                 <i class="fas fa-bullhorn"></i>
//                 <h3>No announcements yet</h3>
//                 <p>Check back later for platform updates.</p>
//             </div>
//         `;

//         return;
//     }

//     renderFeaturedAnnouncement(announcements[0]);

//     renderAnnouncementList(announcements.slice(1));

// }

// function openAnnouncementModal(announcement) {

//   document.getElementById("modalAnnouncementTitle").textContent = announcement.title;

//   document.getElementById("modalAnnouncementDate").textContent = new Date(announcement.createdAt).toLocaleDateString();

//   document.getElementById("modalAnnouncementMessage").textContent = announcement.message;

//   document.getElementById("announcementModal").classList.add("active");

// }

// document.getElementById("closeAnnouncementModal").addEventListener("click", () => {
//   document.getElementById("announcementModal").classList.remove("active");
// });

// document.getElementById("announcementModal").addEventListener("click", (e) => {
//   if(e.target.id === "announcementModal"){
//     e.currentTarget.classList.remove("active");
//   }
// });

async function loadHomepageAnnouncements() {

    console.log("Loading homepage announcements...");

    const announcements = await fetch(
        `${API_BASE}/announcements/public`
    ).then(res => res.json());

    console.log("Homepage announcements:", announcements);

    const featured = document.getElementById("featuredAnnouncement");
    const list = document.getElementById("announcementList");

    console.log("Featured element:", featured);
    console.log("List element:", list);

    featured.innerHTML = "";
    list.innerHTML = "";

    if (!announcements.length) {

        featured.innerHTML = `
            <div class="announcement-placeholder">
                <i class="fas fa-bullhorn"></i>
                <h3>No announcements yet</h3>
                <p>Check back later for platform updates.</p>
            </div>
        `;

        return;
    }

    renderFeaturedAnnouncement(announcements[0]);

    renderAnnouncementList(announcements.slice(1));
}

async function loadSettings() {

  try {

    const settings = await authFetch("/settings");

    if (!settings) return;

    console.log(settings);

    document.querySelector("#platformName").value = settings.platformName || "";

    document.querySelector("#platformFee").value = settings.platformFee || "";

    document.querySelector("#currency").value = settings.currency || "NGN";

    document.querySelector("#minGoal").value = settings.minGoal || "";

    document.querySelector("#maxGoal").value = settings.maxGoal || "";

    document.querySelector("#maxDuration").value = settings.maxDuration || "";

    document.querySelector("#autoApprove").checked = settings.autoApproveCampaigns || false;

    document.querySelector("#maintenanceMode").checked = settings.maintenanceMode || false;

    document.querySelector("#guestDonations").checked = settings.guestDonations || false;

    document.querySelector("#minWithdrawal").value = settings.minWithdrawal || "";

    document.querySelector("#withdrawalFee").value = settings.withdrawalFee || "";

    document.querySelector("#payoutDelay").value = settings.payoutDelay || "";

    document.querySelector("#enable2FA").checked = !!settings.enable2FA;

    document.querySelector("#emailVerification").checked = !!settings.emailVerification;

    campaignCategories = settings.campaignCategories || [];

    renderCategories();

  } catch (error) {
     console.log(error);
  }
}



async function saveSettings(){

    const settingsData = {

        platformName:
        document.querySelector("#platformName").value,

        platformFee:
        Number(document.querySelector("#platformFee").value),

        currency:
        document.querySelector("#currency").value,

        minGoal:
        Number(document.querySelector("#minGoal").value),

        maxGoal:
        Number(document.querySelector("#maxGoal").value),

        maxDuration:
        Number(document.querySelector("#maxDuration").value),

        autoApproveCampaigns:
        document.querySelector("#autoApprove").checked,

        maintenanceMode:
        document.querySelector("#maintenanceMode").checked,

        guestDonations:
        document.querySelector("#guestDonations").checked,

        minWithdrawal:
        Number(document.querySelector("#minWithdrawal").value),

        withdrawalFee:
        Number(document.querySelector("#withdrawalFee").value),

        payoutDelay:
        Number(document.querySelector("#payoutDelay").value),

        enable2FA:
        document.querySelector("#enable2FA").checked,

        emailVerification:
        document.querySelector("#emailVerification").checked,

        campaignCategories

    };

    const saveBtn = document.querySelector(".save-settings-btn");
    
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    try{

        const response = await authFetch(
            "/settings",
            {
              method: "PUT",

              headers: {
                  "Content-Type": "application/json"
                },

              body: JSON.stringify(settingsData)
            }
        );
        if (!response) {
          showToast("Failed to save settings. Please try again.", "error");
          return;
        }

    } catch(error){

      console.log(error);

    }finally{
      saveBtn.textContent = "Save Changes ";
      saveBtn.disabled = false;
    }

}

document
.querySelector(".save-settings-btn")
.addEventListener("click", saveSettings);

async function loadCampaignCategories() {

  const settings = await authFetch("/settings");

  if (!settings) return;

  const select =
    document.getElementById("campaignCategory");

  if (!select) return;

  select.innerHTML =
    settings.campaignCategories.map(cat => `
      <option value="${cat}">
        ${cat}
      </option>
    `).join("");

}

async function loadAdminData() {
  const [users, campaigns, donations, withdrawals, transactions] =
    await Promise.all([
      authFetch("/admin/users"),
      authFetch("/admin/campaigns"),
      authFetch("/admin/donations"),
      authFetch("/admin/withdrawals"),
      authFetch("/admin/transactions")
    ]);

  adminState.users = users || [];
  adminState.campaigns = campaigns || [];
  adminState.donations = donations || [];
  adminState.withdrawals = withdrawals || [];
  adminState.transactions = transactions || [];

  renderAllAdminUI();
}

async function loadBanks(){

    const banks = await authFetch("/admin/banks");

    const select = document.getElementById("withdrawBank");

    if (!select) {
        console.log("Bank select not found");
        return;
    }

    if (!Array.isArray(banks)) {
        console.log("Invalid banks response:", banks);
        return;
    }

    select.innerHTML =
        `<option value="">Select Bank</option>`;

    banks.forEach(bank=>{

        select.innerHTML += `
            <option value="${bank.code}">
                ${bank.name}
            </option>
        `;

    });

}

accountNumberInput.addEventListener("blur", async ()=>{

    if(accountNumberInput.value.length !== 10) return;

    const result = await authFetch(

        "/admin/resolve-account",

        {

            method:"POST",

            body:JSON.stringify({

                accountNumber:accountNumberInput.value,

                bankCode:withdrawBank.value

            })

        }

    );
    console.log(result);
    if(!result){
      console.log("No account data returned");
      return;
    }
    document.getElementById("accountName").value =
        result.account_name;

});

async function loadPlatformWallet(){

    const data = await authFetch("/admin/platform-wallet");

    console.log(data);
    document.getElementById("walletBalance").textContent =
        `₦${data.balance.toLocaleString()}`;

    document.getElementById("totalFees").textContent =
        `₦${data.totalFees.toLocaleString()}`;

    document.getElementById("walletTransactionCount").textContent =
        data.transactionCount;

    document.getElementById("platformWalletTable").innerHTML =
        data.transactions.map(tx=>`

        <tr>
            <td>${new Date(tx.createdAt).toLocaleString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}</td>

            <td>${tx.type === "platform-withdrawal"
              ? "Platform Withdrawal"
              : tx.type || "-"
            }</td>

            <td>${
              tx.type ===  "platform-withdrawal"
              ? "Platform Withdrawal"
              : tx.campaign?.title || "-"
            }</td>

            <td>${
              tx.type === "platform-withdrawal"
              ? "Platform"
              : tx.user?.name || "-"
            }</td>

            <td class="${
              tx.type === "platform-withdrawal"
              ? "money-out"
              : "money-in"
            }">${
              tx.type === "platform-withdrawal"
              ? `-₦${tx.amount.toLocaleString()}`
              : `₦${tx.platformFee.toLocaleString()}`
            }</td>

            <td><span class=" statuss${tx.status}">${tx.status}</span></td>

        </tr>

        `).join("");

}

async function loadAdminStats() {
  const res = await authFetch("/admin/stats");
  if (!res) return;

  const stats = res.stats || {};

  setText("totalUsers", stats.totalUsers);
  setText("totalDonors", stats.totalDonors);
  setText("totalCampaigns", stats.totalCampaigns);
  setText("activeCampaigns", stats.activeCampaigns);
  setText("totalDonationsCount", stats.totalDonations);
  setText("pendingApprovals", stats.pendingApprovals);

  setCurrency("totalDonations", stats.totalRaised);
  setCurrency("platformProfit", stats.platformProfit);

  const growthEl = document.getElementById("platformGrowth");
  if (growthEl) {
    const g = stats.platformGrowth || 0;
    growthEl.textContent = g + "%";
    growthEl.style.color = g > 0 ? "green" : g < 0 ? "red" : "gray";
  }

  const revenue = res.platformHealth?.revenue;

  if (revenue) {
    document.getElementById("thisMonthRevenue").textContent = `₦${revenue.thisMonth.toLocaleString()}`;

    document.getElementById("lastMonthRevenue").textContent = `₦${revenue.lastMonth.toLocaleString()}`;

    document.getElementById("totalPlatformFees").textContent = `₦${revenue.totalFees.toLocaleString()}`;

    document.getElementById("walletBalance").textContent = `Wallet Balance: ₦${revenue.walletBalance.toLocaleString()}`;

    drawRevenueChart(revenue.monthlyRevenue);
  }

  console.log("Stats loaded:", res);
}

let revenueChart;

function drawRevenueChart(monthlyRevenue) {

    const ctx = document
        .getElementById("revenueChart")
        .getContext("2d");

    if (revenueChart)
        revenueChart.destroy();

    revenueChart = new Chart(ctx,{
        type:"bar",

        data:{
            labels: monthlyRevenue.map(m=>m.month),

            datasets:[{
                label:"Platform Revenue",
                data: monthlyRevenue.map(m=>m.total),

                borderWidth:3,
                fill:true,
                tension:.4
            }]
        },

        options:{
            responsive:true,
            maintainAspectRatio:false
        }

    });

}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");

  const toast = document.createElement("div");
  toast.classList.add("toast", type);
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

async function logoutAdmin() {

  const confirmed = await showConfirm(
    "Logout",
    "Are you sure you want to logout?"
  );

  if (!confirmed) return;

  localStorage.removeItem("token");
  sessionStorage.removeItem("token");

  showToast("Logged out successfully", "success");

  setTimeout(() => {
    window.location.href = "../pages/login.html";
  }, 1200);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? 0;
}

function setCurrency(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = `₦${(value ?? 0).toLocaleString()}`;
}

window.setNotificationFilter = function(type, btn) {

  notificationFilter = type;

  document.querySelectorAll(".notif-filter")
    .forEach(b => b.classList.remove("active"));

  btn.classList.add("active");

  renderNotifications();
};

window.markAsRead = async function(id) {

  const notif = adminState.notifications.find(
    n => String(n.id) === String(id)
  );

  if (!notif) return;

  notif.isRead = true;

  renderNotifications();

  try {

    await authFetch(`/notifications/${id}/read`, {
      method: "PATCH"
    });

  } catch (err) {
    console.log(err);
  }

};

window.markAllNotificationsRead = async function() {

  const res = await authFetch("/notifications/read-all", {
    method: "PATCH"
  });

  if(!res) return;

  adminState.notifications.forEach(n => {
    n.isRead = true;
  });

  renderNotifications();

  showToast("All notifications marked as read.");
};

window.deleteNotification = async function(id) {

  adminState.notifications =
    adminState.notifications.filter(
      n => String(n.id) !== String(id)
    );

  renderNotifications();

  try {

    await authFetch(`/notifications/${id}`, {
      method: "DELETE"
    });

  } catch (err) {
    console.log(err);
  }

};

window.logoutAdmin = async function () {

  console.log("Logout clicked");

  const confirmed = await showConfirm(
    "Logout",
    "Are you sure you want to logout?"
  );

  console.log("Confirmed:", confirmed);

  if (!confirmed) return;

  localStorage.removeItem("token");
  sessionStorage.removeItem("token");

  showToast("Logged out successfully", "success");

  setTimeout(() => {
    window.location.href = "../pages/login.html";
  }, 1000);

};

window.approveCampaign = async function(id) {

  await authFetch(`/admin/campaigns/${id}/approve`, {
    method: "PUT"
  });

  loadAdminData();
};

window.deleteUser = async function (userId) {

  const confirmed = await showConfirm(
    "Delete User",
    "Are you sure you want to delete this user? This action cannot be undone."
  );

  if (!confirmed) return;

  const res = await authFetch(`/admin/users/${userId}`, {
    method: "DELETE"
  });

  if (res?.message) {
    showToast("User deleted successfully", "success");

    adminState.users =
      adminState.users.filter(u => u._id !== userId);

    renderUsers();
  }
};

window.deleteCampaign = async function(id) {

  const confirmed = await showConfirm(
    "Delete Campaign",
    "This campaign will be permanently deleted."
  );

  if (!confirmed) return;

  const res = await authFetch(`/admin/campaigns/${id}`, {
    method: "DELETE"
  });

  if (res) {

    showToast("Campaign deleted", "success");

    adminState.campaigns =
      adminState.campaigns.filter(c => c._id !== id);

    renderCampaigns();
  }
};

window.toggleSuspend = async function (userId, currentStatus, btn) {
  const newStatus = !currentStatus;

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Processing...";
  }

  await authFetch(`/admin/users/${userId}/suspend`, {
    method: "PUT",
    body: JSON.stringify({ isSuspended: newStatus })
  });

  const user = adminState.users.find(u => u._id === userId);
  if (user) user.isSuspended = newStatus;

  renderUsers();

  if (btn) btn.disabled = false;
};
window.flagCampaign = async function(id) {
  await authFetch(`/admin/campaigns/${id}/flag`, { method: "PUT" });
  loadAdminData();
};

window.unflagCampaign = async function(id) {
  await authFetch(`/admin/campaigns/${id}/unflag`, { method: "PUT" });
  loadAdminData();
};

window.endCampaign = async function(id) {
  await authFetch(`/admin/campaigns/${id}/end`, { method: "PUT" });
  loadAdminData();
};

window.approveWithdrawal = async function(id) {
  await authFetch(`/withdraw/${id}/approve`, { method: "POST" });
  loadAdminData();
};

window.rejectWithdrawal = async function(id) {
  await authFetch(`/withdraw/${id}/reject`, { method: "POST" });
  loadAdminData();
};

window.removeCategory = function(category) {

  campaignCategories =
  campaignCategories.filter(
    c => c !== category
  );

  renderCategories();

};

document.querySelector(".add-btn")?.addEventListener("click", addCategory);

function renderUsers(list = adminState.users) {
  const container = document.getElementById("adminUsersTable");
  if (!container) return;

  container.innerHTML = list.map(u => `
    <tr>
      <td>
        <div class="user-info">
          <div class="avatar">${u.name?.[0] || "U"}</div>
          <div>
            <p class="name">${u.name}</p>
          </div>
        </div>
      </td>

      <td>${u.email}</td>

      <td>${u.role || "user"}</td>

      <td>${u.campaignCount || 0}</td>

      <td>${u.donationCount || 0}</td>

      <td>₦${(u.totalDonated || 0).toLocaleString()}</td>

      <td>₦${(u.totalRaised || 0).toLocaleString()}</td>

      <td>₦${(u.walletBalance || 0).toLocaleString()}</td>

      <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>

      <td>
        <span class="badge ${u.isSuspended ? "suspended" : "active"}">
          ${u.isSuspended ? "Suspended" : "Active"}
        </span>
      </td>

      <td>
        <button class="click"
          onclick="toggleSuspend('${u._id}', ${u.isSuspended}, this)">
          ${u.isSuspended ? "Unsuspend" : "Suspend"}
        </button>

        <button class="danger"
          onclick="deleteUser('${u._id}')">
          Delete
        </button>
      </td>
    </tr>
  `).join("");
}

document.getElementById("userSearch")?.addEventListener("input", (e) =>{
  const value = e.target.value.toLowerCase();

  const filtered = adminState.users.filter(u =>
  (u.name || "").toLowerCase().includes(value) ||
  (u.email || "").toLowerCase().includes(value)
  );
  renderUsers(filtered);
});

function renderCampaigns() {
  const container = document.getElementById("adminCampaigns");
  if (!container) return;

  let filtered = [...adminState.campaigns];

  if (campaignFilters.search) {
    filtered = filtered.filter(c =>
      c.title.toLowerCase().includes(campaignFilters.search)
    );
  }

  if (campaignFilters.status !== "all") {
    filtered = filtered.filter(c => c.status === campaignFilters.status);
  }

  if (campaignFilters.category !== "all") {
    filtered = filtered.filter(c => c.category === campaignFilters.category);
  }

  const activeCount = adminState.campaigns.filter(c => c.status === "active").length;
  const pendingCount = adminState.campaigns.filter(c => c.status === "pending").length;
  const flaggedCount = adminState.campaigns.filter(c => c.status === "flagged" || c.isFlagged).length;

  setText("activeCount", activeCount);
  setText("pendingCount", pendingCount);
  setText("flaggedCount", flaggedCount);

  container.innerHTML = filtered.map(c => {
    const progress = (c.currentAmount / (c.targetAmount || 1)) * 100;

    return `
      <div class="campaign-card">
        <p class="owner">By: ${c.user?.name || "Unknown"}</p>
        <p class="donors">Donors: ${c.donorCount || 0}</p>

        <div class="card-top">
          <h4>${c.title}</h4>
          <span class="status ${c.isFlagged ? "flagged" : c.status}">
            ${c.isFlagged ? "flagged" : c.status}
          </span>
        </div>

        <p class="desc">${c.description?.slice(0, 80) || ""}</p>

        <div class="progress-bar">
          <div class="progress" style="width:${progress}%"></div>
        </div>

        <div class="amounts">
          <span>₦${(c.currentAmount || 0).toLocaleString()}</span>
          <span>₦${(c.targetAmount || 0).toLocaleString()}</span>
        </div>

        <div class="card-actions">

          ${c.isFlagged
            ? `<button class="click" onclick="unflagCampaign('${c._id}')">Unflag</button>`
            : `<button class="click" onclick="flagCampaign('${c._id}')">Flag</button>`
          }

          ${c.status === "active"
            ? `<button class="end" onclick="endCampaign('${c._id}')">End</button>`
            : `<button class="end" disabled>Ended</button>`
          }

          <button class="danger" onclick="deleteCampaign('${c._id}')">
            Delete
          </button>

        </div>

      </div>
    `;
  }).join("");
}

function renderDonations() {
  const container = document.getElementById("adminDonations");
  if (!container) return;

  container.innerHTML = adminState.donations.map(d => `
    <tr>
      <td>${d.user?.name || "Anon"}</td>

      <td>${d.campaign?.title || "N/A"}</td>

      <td>₦${(d.amount || 0).toLocaleString()}</td>

      <td>${d.paymentMethod || "card"}</td>

      <td>
        <span class="status ${d.status}">
          ${d.status}
        </span>
      </td>

      <td>
        ${d.createdAt
          ? new Date(d.createdAt).toLocaleString()
          : "-"
        }
      </td>
    </tr>
  `).join("");
}

function renderCategories() {

  const container =
  document.getElementById("categoriesContainer");

  if (!container) return;

  container.innerHTML =
  campaignCategories.map(category => `

    <span class="tag">

      ${category}

      <i
        class="fa-solid fa-xmark"
        onclick="removeCategory('${category}')"
      ></i>

    </span>

  `).join("");

}

function addCategory() {

  const input =
  document.getElementById("newCategory");

  const value = input.value.trim();

  if (!value) return;

  if (
    campaignCategories.includes(value)
  ) {
    showToast("Category already exists", "warning");
    return;
  }

  campaignCategories.push(value);

  renderCategories();

  input.value = "";

}

function renderWithdrawals() {
  const container = document.getElementById("withdrawalsTable");
  if (!container) return;

  container.innerHTML = adminState.withdrawals.map(w => `
  <div class="withdraw-card ${w.status}">

    <div class="card-header">
      <div>
        <h4>${w.user?.name || "Unknown User"}</h4>
        <span>${w.user?.email || "No email"}</span>
      </div>

      <div class="amount">
        ₦${(w.amount || 0).toLocaleString()}
      </div>
    </div>

    <div class="card-body">
      <div class="status ${w.status}">
        ${w.status}
      </div>

      <div class="date">
        ${w.createdAt ? new Date(w.createdAt).toLocaleString() : ""}
      </div>
    </div>

    <div class="card-actions">
      ${w.status === "pending" ? `
        <button class="approve" onclick="approveWithdrawal('${w._id}')">
          Approve
        </button>
        <button class="reject" onclick="rejectWithdrawal('${w._id}')">
          Reject
        </button>
      ` : `
        <button class="disabled" disabled>${w.status}</button>
      `}
    </div>

  </div>
`).join("");
}

function renderFlaggedActivity() {
  const el = document.getElementById("flaggedActivity");
  if (!el) return;

  const flagged = adminState.campaigns.filter(c => c.isFlagged);

  el.innerHTML = flagged.slice(0, 6).map(c => `
    <div class="activity-item flagged">
      <p>${c.title}</p>
      <small>Flagged for review</small>

      <div class="mini-actions">
        <button onclick="unflagCampaign('${c._id}')">Unflag</button>
        <button onclick="deleteCampaign('${c._id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

function renderDonationActivity() {
  const el = document.getElementById("donationActivity");
  if (!el) return;

  el.innerHTML = adminState.donations.slice(0, 10).map(d => `
    <tr>

      <td>
        <div class="user-cell">
          <div class="avatar">${d.user?.name?.[0] || "U"}</div>
          <span>${d.user?.name || "Anonymous"}</span>
        </div>
      </td>

      <td>${d.campaign?.title || "General Donation"}</td>

      <td class="amount">
        ₦${(d.amount || 0).toLocaleString()}
      </td>

      <td>
        ${new Date(d.createdAt).toLocaleString()}
      </td>

      <td>
        <span class="status ${d.status || "success"}">
          ${d.status || "successful"}
        </span>
      </td>

    </tr>
  `).join("");
}

function renderPendingActivity() {

  const el = document.getElementById("pendingActivity");

  if (!el) return;

  const pendingCampaigns = adminState.campaigns
    .filter(c => c.status === "pending")
    .map(c => ({
      type: "campaign",
      id: c._id,
      title: c.title,
      user: c.user?.name || "Unknown",
      email: c.user?.email || "No email"
    }));

  const pendingWithdrawals = adminState.withdrawals
    .filter(w => w.status === "pending")
    .map(w => ({
      type: "withdrawal",
      id: w._id,
      amount: w.amount,
      user: w.user?.name || "Unknown",
      email: w.user?.email || "No email"
    }));

  const pendingItems = [
    ...pendingCampaigns,
    ...pendingWithdrawals
  ];

  if (pendingItems.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        No pending approvals
      </div>
    `;
    return;
  }

  el.innerHTML = pendingItems.map(item => {
    if (item.type === "campaign") {

      return `
        <div class="pending-card campaign">

          <div class="pending-header">

            <div class="pending-user">

              <div class="avatar">
                ${item.user.charAt(0).toUpperCase()}
              </div>

              <div>
                <h4>${item.user}</h4>
                <p>${item.email}</p>
              </div>

            </div>

            <span class="pending-badge">
              Campaign
            </span>

          </div>

          <div class="pending-body">

            <h3>${item.title}</h3>

            <small>
              Campaign approval request
            </small>

          </div>

          <div class="pending-actions">

            <button 
              class="approve-btn"
              onclick="approveCampaign('${item.id}')"
            >
              Approve
            </button>

            <button 
              class="reject-btn"
              onclick="deleteCampaign('${item.id}')"
            >
              Reject
            </button>

          </div>

        </div>
      `;
    }

    return `
      <div class="pending-card withdrawal">

        <div class="pending-header">

          <div class="pending-user">

            <div class="avatar">
              ${item.user.charAt(0).toUpperCase()}
            </div>

            <div>
              <h4>${item.user}</h4>
              <p>${item.email}</p>
            </div>

          </div>

          <span class="pending-badge withdrawal">
            Withdrawal
          </span>

        </div>

        <div class="pending-body">

          <h3>
            ₦${(item.amount || 0).toLocaleString()}
          </h3>

          <small>
            Withdrawal request pending approval
          </small>

        </div>

        <div class="pending-actions">

          <button 
            class="approve-btn"
            onclick="approveWithdrawal('${item.id}')"
          >
            Approve
          </button>

          <button 
            class="reject-btn"
            onclick="rejectWithdrawal('${item.id}')"
          >
            Reject
          </button>

        </div>

      </div>
    `;

  }).join("");
}

function renderTransactions() {
  const container = document.getElementById("adminTransactions");
  if (!container) return;

  container.innerHTML = adminState.transactions.map(t => `
    <tr>

      <td>
       <span class="type ${t.user?.name}">
        ${t.user?.name}
        </span>
      </td>

      <td>
        <span class="type ${t.type}">
          ${t.type}
        </span>
      </td>

      <td>
        <span class="status ${t.status}">
          ${t.status}
        </span>
      </td>

      <td>₦${(t.amount || 0).toLocaleString()}</td>

      <td>
        ${t.createdAt
          ? new Date(t.createdAt).toLocaleString()
          : "-"
        }
      </td>

    </tr>
  `).join("");
}

function getGroup(date) {
  const now = new Date();
  const d = new Date(date);

  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 6) return "This Week";
  if (diff <= 30) return "This Month";
  return "Older";
}

function groupNotifications(list) {
  return list.reduce((acc, n) => {
    const group = getGroup(n.createdAt);

    if (!acc[group]) acc[group] = [];
    acc[group].push(n);

    return acc;
  }, {});
}


function getNotificationIcon(type){

    switch(type){

        case "donation":
            return "fas fa-hand-holding-heart";

        case "withdrawal":
            return "fas fa-money-bill-wave";

        case "user":
            return "fas fa-user-plus";

        case "campaign":
            return "fas fa-bullhorn";

        case "admin_action":
            return "fas fa-shield-alt";

        default:
            return "fas fa-bell";
    }

}

function formatTime(date) {

    const now = new Date();
    const created = new Date(date);

    const seconds = Math.floor((now - created) / 1000);

    if (seconds < 60)
        return "Just now";

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60)
        return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24)
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;

    const days = Math.floor(hours / 24);

    if (days === 1)
        return "Yesterday";

    if (days < 7)
        return `${days} days ago`;

    return created.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

}

document.addEventListener("click", (e) => {
  const card = e.target.closest(".notification-card");
  if (!card) return;

  const id = card.dataset.id;

  const notif = adminState.notifications.find(
    n => String(n.id) === String(id)
  );

  if (notif) {
    notif.isRead = true;
    renderNotifications();
  }
});

document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll(".nav li").forEach(item => {

    item.addEventListener("click", () => {

      const section = item.dataset.section;

      if (!section) return;

      document.querySelectorAll(".nav li").forEach(i => {
        i.classList.remove("active");
      });

      item.classList.add("active");

      document.querySelectorAll(".section").forEach(sec => {
        sec.classList.remove("active");
      });

      const target = document.getElementById(section);

      if (!target) {
        console.error("Section not found:", section);
        return;
      }

      target.classList.add("active");

      if (window.innerWidth <= 900) {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
      }

    });

  });

});

const withdrawBtn = document.getElementById("withdrawBtn");
const withdrawModal = document.getElementById("platformWithdrawModal");

const closePlatformModal = document.getElementById("closePlatformModal");
const cancelPlatformWithdraw = document.getElementById("cancelPlatformWithdraw");

const submitPlatformWithdraw = document.getElementById("submitPlatformWithdraw");

const withdrawWalletBalance = document.getElementById("withdrawWalletBalance");

withdrawBtn.addEventListener("click", async () => {

    const res = await authFetch("/admin/earnings");

    if (!res) return;

    withdrawWalletBalance.textContent =
    console.log(res);
        `₦${(res.wallet?.balance || 0).toLocaleString()}`;

    withdrawModal.classList.add("show");

});

function closeWithdrawModal(){

    withdrawModal.classList.remove("show");

}

closePlatformModal.onclick = closeWithdrawModal;

cancelPlatformWithdraw.onclick = closeWithdrawModal;

withdrawModal.addEventListener("click", (e)=>{

    if(e.target===withdrawModal){

        closeWithdrawModal();

    }

});

submitPlatformWithdraw.addEventListener("click", async ()=>{

    const amount =
        Number(document.getElementById("withdrawAmount").value);

    const bank =
        document.getElementById("withdrawBank").value.trim();

    const accountNumber =
        document.getElementById("accountNumberInput").value.trim();

    const accountName =
        document.getElementById("accountName").value.trim();

    if(
        !amount ||
        !bank ||
        !accountNumber ||
        !accountName
    ){

        showToast("Please fill every field","error");

        return;

    }

    const res = await authFetch("/admin/platform-withdraw",{

        method:"POST",

        body:JSON.stringify({

            amount,
            bankName:bank,
            accountNumber,
            accountName

        })

    });

    if(!res) return;

    showToast("Withdrawal completed successfully","success");

    closeWithdrawModal();

    document.getElementById("withdrawAmount").value="";
    document.getElementById("withdrawBank").value="";
    document.getElementById("accountNumberInput").value="";
    document.getElementById("accountName").value="";

    loadAdminStats();

});

function renderAllAdminUI() {
  renderUsers();
  renderCampaigns();
  renderDonations();
  renderWithdrawals();
  renderTransactions();
  renderNotifications();
  renderDonationActivity();
  renderPendingActivity();
  renderFlaggedActivity();
}

document.addEventListener("DOMContentLoaded", async () => {

  await loadAdminStats();

  await loadAdminData();

  await loadNotifications();

  await loadSettings();

  await loadPlatformWallet();

  await loadBanks();

  await loadContactMessages();

  await loadAnnouncements();
});