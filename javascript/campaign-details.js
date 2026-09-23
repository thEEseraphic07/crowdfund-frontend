const token = localStorage.getItem("token");

const detailsContainer =
document.getElementById("campaignDetails");

const params =
new URLSearchParams(window.location.search);

const campaignId = params.get("id");

async function loadCampaignDetails() {

  try {

    const res = await fetch(
      `${API_BASE}/campaigns/${campaignId}`
    );

    const c = await res.json();
    console.log("CAMPAIGN DATA:", c);
    console.log("CAMPAIGN IMAGE:", c.image);

    const raised = c.currentAmount || 0;

    const target = c.targetAmount || 1;

    const progress =
    Math.min((raised / target) * 100, 100);

    const daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(c.deadline) - new Date()) / (1000 * 60 * 60 * 24)
      )
    );

    detailsContainer.innerHTML = `

      <div class="hero-section">

        <div class="hero-image">

          <img src="${c.image}" />

        </div>

        <div class="hero-content">

          <span class="category">
            ${c.category}
          </span>

          <h1>${c.title}</h1>

          <p class="creator">
            By ${c.owner?.name || "Unknown"}
          </p>

          <div class="amount-section">

            <h2>
              ₦${raised.toLocaleString()}
            </h2>

            <p>
              raised of
              ₦${target.toLocaleString()}
            </p>

          </div>

          <div class="progress-bar">

            <div
              class="progress-fill"
              style="width:${progress}%"
            ></div>

          </div>

          <div class="campaign-stats">

            <div class="stat">
              <h3>${progress.toFixed(0)}%</h3>
              <p>Funded</p>
            </div>

            <div class="stat">
              <h3>${daysLeft}</h3>
              <p>Days Left</p>
            </div>

            <div class="stat">
              <h3>${(c.donations || []).length}</h3>
              <p>Supporters</p>
            </div>
          </div>

          ${
            token
            ? `
            <button class="donate-btn">
            Donate Now
            </button>
            `
            :`
            <a href="../pages/login.html">
            <button class="login-btn donate-login-btn">
            Login to Donate
            </button>
            </a>
            `
          }
        </div>

      </div>

      <div class="details-grid">

        <div class="left-column">

            <div class="details-card">

              <h2>About This Campaign</h2>

              <p class="description">
                 ${c.description}
               </p>

            </div>

            <div class="details-card">

              <h2>Comments</h2>

              <div id="commentsContainer"></div>

              <div class="comment-box">
              ${
                token
                ? `
                <textarea
                id="commentInput"
                placeholder="Write a comment..."
                ></textarea>

                <button id="postCommentBtn">
                Post Comment
                </button>
                `
                :`
                <div class="login-required">
                <p>
                Login to comment or support this campaign
                </p>

                <a href="../pages/login.html">
                <button class="login-btn">
                Login to Interact
                </button>
                </a>

                </div>
                `
              }
              </div>

            </div>

        </div>

        <div class="right-column">

          <div class="creator-card">

            <img
              src="${
                c.owner?.profileImage ||
                '../images/default.jpg'
              }"
            />

            <h3>${c.owner?.name}</h3>

            <p>
              ${c.owner?.bio || "No bio yet"}
            </p>

          </div>

        </div>

      </div>
    `;

  } catch (err) {

    console.error(err);

    detailsContainer.innerHTML =
    "<p>Failed to load campaign</p>";
  }
}

loadCampaignDetails();
loadComments();

async function loadComments() {

  try {

    const res = await fetch(
      `${API_BASE}/comments/${campaignId}`
    );

    const comments = await res.json();

    const commentsContainer =
    document.getElementById(
      "commentsContainer"
    );

    if (!comments.length) {

      commentsContainer.innerHTML =
      "<p>No comments yet.</p>";

      return;
    }

    commentsContainer.innerHTML =
    comments.map(comment => `

      <div class="comment">

        <img
          src="${
            comment.user?.profileImage ||
            '../images/default.jpg'
          }"
        />

        <div>

          <h4>
            ${comment.user?.name}
          </h4>

          <p>
            ${comment.text}
          </p>

        </div>

      </div>

    `).join("");

  } catch (err) {

    console.error(err);
  }
}

document.addEventListener("click", async (e) => {

  if(e.target.classList.contains("donate-btn")){
    const amount = prompt("Enter donation amount");

    if(amount){
      try{
        const res = await fetch(
          `${API_BASE}/payments/initialize`,
          {
            method: "POST",
            headers:{
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              campaignId: campaignId,
              amount: Number(amount)
            })
          }
        );

        const data = await res.json();
        if(!res.ok){
          throw new Error(data.message || "Failed to initiate payment");
        }
        window.location.href = data.authorization_url;
      }catch(err){
        console.error(err);
        
        alert(err.message);
      }
    }
  }

  if (e.target.id === "postCommentBtn") {

    const input =
    document.getElementById("commentInput");

    const text = input.value.trim();

    if (!text) return;

    const token =
    localStorage.getItem("token");

    try {

      const res = await fetch(

        `${API_BASE}/comments/${campaignId}`,

        {
          method: "POST",

          headers: {
            "Content-Type":
            "application/json",

            Authorization:
            `Bearer ${token}`
          },

          body: JSON.stringify({
            text
          })
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to post comment"
        );
      }

      input.value = "";

      loadComments();

    } catch (err) {

      console.error(err);
    }
  }
});