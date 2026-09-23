document.addEventListener("DOMContentLoaded", async () => {
  const campaignGrid = document.getElementById("campaign-grid");

  if (!campaignGrid) return;

  try {
    const response = await fetch(`${API_BASE}/campaigns`);

    if (!response.ok) {
      throw new Error("Failed to fetch campaigns");
    }

    const campaigns = await response.json();

    if (!campaigns || campaigns.length === 0) {
      campaignGrid.innerHTML = `
        <div class="empty-state">
          <div class="pulse-ring"></div>
          <h3>No campaigns yet?</h3>
          <p>
            Be the first to create a campaign and inspire others.
          </p>
          <a href="../pages/register.html" class="empty-btn">
            Start a Campaign
          </a>
        </div>
      `;

      return;
    }

    campaignGrid.innerHTML = campaigns.map(campaign => {
      const target = Number(campaign.targetAmount || 0);
      const current = Number(campaign.currentAmount || 0);

      const progress = target > 0
        ? Math.min((current / target) * 100, 100)
        : 0;

      return `
        <article class="campaign-card">

          <div class="campaign-image">
            <img
              src="${campaign.image || "../assets/default.png"}"
              alt="${campaign.title || "Campaign image"}"
            >
          </div>

          <div class="campaign-content">

            <span class="campaign-category">
              ${campaign.category || "Other"}
            </span>

            <h3>${campaign.title}</h3>

            <p class="campaign-description">
              ${campaign.description || "Support this meaningful campaign."}
            </p>

            <div class="campaign-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  style="width: ${progress}%"
                ></div>
              </div>

              <div class="campaign-stats">
                <span>
                  ₦${current.toLocaleString()} raised
                </span>

                <span>
                  ${Math.round(progress)}%
                </span>
              </div>
            </div>

            <a
              href="campaign-details.html?id=${campaign._id}"
              class="campaign-btn"
            >
              View Campaign
            </a>

          </div>

        </article>
      `;
    }).join("");

  } catch (error) {
    console.error("Error loading campaigns:", error);

    campaignGrid.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load campaigns</h3>
        <p>
          Something went wrong while loading campaigns.
          Please try again later.
        </p>
      </div>
    `;
  }
});