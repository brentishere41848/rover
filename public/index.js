const params = new URLSearchParams(window.location.search);
const linkToken = params.get("linkToken");
const link = document.getElementById("roblox-login-link");
const modal = document.getElementById("redirect-modal");
const closeButton = document.getElementById("redirect-modal-close");
const cancelButton = document.getElementById("redirect-modal-cancel");
const cancelLoadingButton = document.getElementById("redirect-modal-cancel-loading");
const continueButton = document.getElementById("redirect-modal-continue");
const authorizePanel = document.getElementById("redirect-modal-authorize");
const loadingPanel = document.getElementById("redirect-modal-loading");

let redirectTimer = null;

if (linkToken && link) {
  link.href = "https://www.roblox.com/login";
}

function openModal() {
  if (!modal || !authorizePanel || !loadingPanel) {
    return;
  }

  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("redirect-modal-open");
  authorizePanel.classList.add("redirect-panel--active");
  loadingPanel.classList.remove("redirect-panel--active");
}

function closeModal() {
  if (!modal || !authorizePanel || !loadingPanel) {
    return;
  }

  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("redirect-modal-open");
  authorizePanel.classList.add("redirect-panel--active");
  loadingPanel.classList.remove("redirect-panel--active");

  if (redirectTimer) {
    window.clearTimeout(redirectTimer);
    redirectTimer = null;
  }
}

function beginRedirect() {
  if (!authorizePanel || !loadingPanel || !link) {
    return;
  }

  authorizePanel.classList.remove("redirect-panel--active");
  loadingPanel.classList.add("redirect-panel--active");

  redirectTimer = window.setTimeout(() => {
    window.location.assign(link.href);
  }, 1400);
}

if (link) {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    openModal();
  });
}

closeButton?.addEventListener("click", closeModal);
cancelButton?.addEventListener("click", closeModal);
cancelLoadingButton?.addEventListener("click", closeModal);
continueButton?.addEventListener("click", beginRedirect);
modal?.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});
