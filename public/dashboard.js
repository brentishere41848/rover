async function loadSession() {
  const response = await fetch("/api/session");
  const payload = await response.json();

  if (!payload.authenticated || !payload.user) {
    window.location.href = "/";
    return;
  }

  const user = payload.user;
  const discord = payload.discord;

  document.getElementById("welcome-title").textContent = `Welcome, ${user.displayName || user.username}`;
  document.getElementById("welcome-copy").textContent = "Your Roblox account has been authenticated successfully.";

  const grid = document.getElementById("profile-grid");
  const fields = [
    ["Username", user.username],
    ["Display Name", user.displayName],
    ["Roblox User ID", user.id],
    ["Profile", user.profileUrl],
    ["Linked Discord", discord?.tag || "Not linked from Discord"]
  ];

  if (user.avatarUrl) {
    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = user.avatarUrl;
    avatar.alt = `${user.username} avatar`;
    grid.appendChild(avatar);
  }

  for (const [label, value] of fields) {
    const card = document.createElement("article");
    card.className = "profile-card";

    const heading = document.createElement("h2");
    heading.textContent = label;

    const text = document.createElement("p");
    if (label === "Profile") {
      const link = document.createElement("a");
      link.href = value;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = value;
      text.appendChild(link);
    } else {
      text.textContent = value;
    }

    card.append(heading, text);
    grid.appendChild(card);
  }
}

document.getElementById("logout-button").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/";
});

loadSession().catch(() => {
  window.location.href = "/";
});
