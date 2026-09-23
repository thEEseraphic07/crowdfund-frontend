const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
? "http://localhost:5000/api"
: "https://crowdfunding-backend-1-6wex.onrender.com/api";

const SOCKET_URL = API_BASE.replace("/api", "");