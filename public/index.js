const params = new URLSearchParams(window.location.search);
const linkToken = params.get("linkToken");
const link = document.getElementById("roblox-login-link");

if (linkToken && link) {
  link.href = `/auth/roblox?linkToken=${encodeURIComponent(linkToken)}`;
}
