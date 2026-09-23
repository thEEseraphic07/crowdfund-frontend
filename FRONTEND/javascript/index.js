const campaignGrid = document.getElementById("campaignGrid");
const searchInput = document.getElementById("searchCampaign");

const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");

menuToggle?.addEventListener("click", () => {
  navMenu?.classList.toggle("active");

  const icon = menuToggle.querySelector("i");

  if (navMenu?.classList.contains("active")) {
    icon?.classList.remove("fa-bars");
    icon?.classList.add("fa-times");
  } else {
    icon?.classList.remove("fa-times");
    icon?.classList.add("fa-bars");
  }
});

document.querySelectorAll(".nav-menu a").forEach(link => {
  link.addEventListener("click", () => {
    navMenu?.classList.remove("active");

    const icon = menuToggle?.querySelector("i");

    icon?.classList.remove("fa-times");
    icon?.classList.add("fa-bars");
  });
});

async function loadHomepageAnnouncements() {

  console.log("Loading homepage announcements...");

  try {

    const res = await fetch(`${API_BASE}/announcements/public`);

    const announcements = await res.json();

    console.log("Homepage announcements:", announcements);

    if (!Array.isArray(announcements)) {
      throw new Error("Announcements API did not return an array");
    }

    const featured = document.getElementById("featuredAnnouncement");
    const list = document.getElementById("announcementList");

    if (!featured || !list) {
      console.error("Announcement containers not found");
      return;
    }

    // No announcements
    if (announcements.length === 0) {

      featured.innerHTML = `
        <div class="announcement-placeholder">
          <i class="fas fa-bullhorn"></i>

          <h3>No announcements yet</h3>

          <p>
            Check back later for platform updates.
          </p>
        </div>
      `;

      list.innerHTML = "";

      return;
    }

    // FEATURED ANNOUNCEMENT
    const first = announcements[0];

    featured.innerHTML = `

      <div class="featured-announcement">

        <div class="featured-icon">
          <i class="fas fa-bullhorn"></i>
        </div>

        <div class="featured-content">

          <span class="announcement-label">
            Latest Announcement
          </span>

          <h3>${first.title}</h3>

          <p>
            ${first.message}
          </p>

          <small>
            ${new Date(first.createdAt).toLocaleDateString()}
          </small>

        </div>

      </div>

    `;

    list.innerHTML = announcements
      .slice(1)
      .map(announcement => `

        <div class="announcement-item">

          <div class="announcement-item-icon">
            <i class="fas fa-bullhorn"></i>
          </div>

          <div>

            <h4>${announcement.title}</h4>

            <p>
              ${announcement.message}
            </p>

            <small>
              ${new Date(
                announcement.createdAt
              ).toLocaleDateString()}
            </small>

          </div>

        </div>

      `)
      .join("");

  } catch (err) {

    console.error(
      "Failed to load homepage announcements:",
      err
    );

  }
}

async function loadCampaigns() {
  try {
    const res = await fetch(`${API_BASE}/campaigns`);
    const campaigns = await res.json();

    if (!Array.isArray(campaigns)) {
      throw new Error("API did not return array");
    }

    renderCampaigns(campaigns);

  } catch (err) {
    console.error("Failed to load campaigns:", err);
    campaignGrid.innerHTML = "<p>Failed to load campaigns</p>";
  }
}

function renderCampaigns(campaigns) {

  const campaignGrid = document.getElementById("campaignGrid");

  campaignGrid.innerHTML = campaigns.map(c => {

    const raised = c.currentAmount || 0;
    const target = c.targetAmount || 1;

    const progress = Math.min((raised / target) * 100, 100);

    const daysLeft = Math.ceil(
      (new Date(c.deadline) - new Date()) / (1000 * 60 * 60 * 24)
    );

    return `
      <div class="campaign-card" data-id="${c._id}">

        <img 
          src="${c.image || '../images/default.jpg'}"
          class="campaign-image"
        />

        <div class="campaign-card-content">

          <h3>${c.title}</h3>

          <p>
            ${(c.description || "").substring(0, 90)}...
          </p>

          <p class="amount">
            ₦${raised.toLocaleString()} raised of ₦${target.toLocaleString()}
          </p>

          <span class="deadline">
            ${daysLeft} day(s) left
          </span>

          <div class="campaign-actions">

           <button class="details-btn" data-id="${c._id}">
             See More
           </button> 

            <button class="share-btn" data-id="${c._id}" data-title="${c.title}"> Share </button>
          </div>
        </div>

      </div>
    `;

  }).join("");
}

searchInput?.addEventListener("input", async (e) => {
  const term = e.target.value.toLowerCase();

  try {
    const res = await fetch(`${API_BASE}/campaigns`);
    const campaigns = await res.json();

    const filtered = campaigns.filter(c =>
      c.title.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term)
    );

    renderCampaigns(filtered);

  } catch (err) {
    console.error(err);
  }
});

campaignGrid?.addEventListener("click", (e) => {
  const id = e.target.dataset.id;

  if (!id) return;

  if (e.target.classList.contains("details-btn")) {

    window.location.href = `campaign-details.html?id=${id}`;
  }
});

const track = document.getElementById("campaignGrid");

let direction = 1;
let speed = 1;

function autoScroll() {

  track.scrollLeft += speed * direction;

  if (
    track.scrollLeft + track.clientWidth >=
    track.scrollWidth - 1
  ) {
    direction = -1;
  }

  if (track.scrollLeft <= 0) {
    direction = 1;
  }

  requestAnimationFrame(autoScroll);
}

document.addEventListener("DOMContentLoaded", () => {
  loadCampaigns();
  loadHomepageAnnouncements();

  setTimeout(() => {
    autoScroll();
  }, 1000);
});

const leftBtn = document.querySelector(".carousel-btn.left");
const rightBtn = document.querySelector(".carousel-btn.right");

leftBtn.addEventListener("click", () => {
  campaignGrid.scrollLeft -= 350;
});

rightBtn.addEventListener("click", () => {
  campaignGrid.scrollLeft += 350;
});

campaignGrid.addEventListener("click", async (e) => {

  if(e.target.classList.contains("share-btn")){

    const id = e.target.dataset.id;
    const title = e.target.dataset.title;

    const campaignUrl = `${window.location.origin}/pages/campaign-details.html?id=${campaign._id}`;

    if(navigator.share){
      try{
        await navigator.share({
          title: title,
          text: `Support this campaign: ${title}`,
          url: campaignUrl
        });
      }catch(err){
        console.log(err);
      }
    }else{

      const shareLinks = `Share this campaign:

      WhatsApp: https://wa.me/?text=${encodeURIComponent(campaignUrl)}

      Facebook: https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}

      Twitter: https://twitter.com/intent/tweet?url=${encodeURIComponent(campaignUrl)}

      Telegram: https://t.me/share/url?url=${encodeURIComponent(campaignUrl)}
      `;

      prompt("Copy and share this link:", campaignUrl);

      console.log(shareLinks);
    }
  }

});