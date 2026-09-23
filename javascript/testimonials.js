const LOGO_KEY = "pk_cMB0Xj4IQyS-bjZuvJc4zA";

const sponsors = [
  { name: "Google", domain: "google.com" },
  { name: "LinkedIn", domain: "linkedin.com" },
  { name: "Facebook", domain: "facebook.com" },
  { name: "Twitter", domain: "twitter.com" },
  { name: "PayPal", domain: "paypal.com" }
];

const container = document.getElementById("sponsors-grid");

function createSponsors() {
    sponsors.forEach(sponsor => {
        const logoUrl =
            `https://img.logo.dev/${sponsor.domain}?token=${LOGO_KEY}&size=80`;

        const card = document.createElement("div");
        card.className = "sponsor-card";

        const img = document.createElement("img");
        img.src = logoUrl;
        img.alt = `${sponsor.name} logo`;

        const name = document.createElement("p");
        name.textContent = sponsor.name;

        card.appendChild(img);
        card.appendChild(name);

        container.appendChild(card);
    });
}

createSponsors();
createSponsors();

const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");

menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("active");
});