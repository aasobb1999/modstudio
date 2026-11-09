const config = window.AASOBB_CONFIG || {};
const waitlistEndpoint = config.waitlistEndpoint || "";
const waitlistAccessKey = config.waitlistAccessKey || "";
const isDemoEndpoint =
  !waitlistEndpoint ||
  waitlistEndpoint.includes("YOUR_FORM_ID") ||
  waitlistEndpoint.includes("example.com");

function trackEvent(eventName, properties = {}) {
  try {
    if (typeof window.plausible === "function") {
      window.plausible(eventName, { props: properties });
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, properties);
    }
  } catch (error) {
    // Analytics should never block the form.
  }
}

function setFormMessage(form, message, type = "error") {
  const messageEl = form.querySelector(".form-message");
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.classList.toggle("is-success", type === "success");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function markFormSuccess(form, email) {
  form.classList.add("is-success");

  const successEl = form.querySelector(".form-success");
  if (successEl) successEl.hidden = false;

  const input = form.querySelector('input[type="email"]');
  if (input) {
    input.value = email;
    input.disabled = true;
  }

  const button = form.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.textContent = "You’re on the list";
  }

  setFormMessage(form, "", "success");
}

async function submitWaitlist(form, email) {
  if (isDemoEndpoint) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      window.localStorage.setItem("aasobb_waitlist_email", email);
    } catch (error) {
      // Local storage can be unavailable in private mode; demo mode still succeeds.
    }
    trackEvent("waitlist_signup", { method: "demo" });
    return;
  }

  const payload = {
    email,
    source: "aasobb-mod-landing",
    page: window.location.href,
    submitted_at: new Date().toISOString(),
  };

  if (waitlistAccessKey) {
    payload.access_key = waitlistAccessKey;
  }

  const response = await fetch(waitlistEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Waitlist request failed with status ${response.status}`);
  }

  trackEvent("waitlist_signup", { method: "endpoint" });
}

function handleWaitlistSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const input = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');
  const honeypot = form.querySelector(".hp-field");
  const email = input ? input.value.trim() : "";

  if (honeypot && honeypot.value) {
    markFormSuccess(form, email || "bot@example.com");
    return;
  }

  if (!isValidEmail(email)) {
    setFormMessage(form, "Enter a valid email address.");
    if (input) input.focus();
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Joining…";
  }
  setFormMessage(form, "");

  submitWaitlist(form, email)
    .then(() => markFormSuccess(form, email))
    .catch(() => {
      setFormMessage(form, "Something went wrong. Please try again.");
      if (button) {
        button.disabled = false;
        button.textContent = "Join waitlist";
      }
    });
}

document.querySelectorAll(".waitlist-form").forEach((form) => {
  form.addEventListener("submit", handleWaitlistSubmit);
});

const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.textContent = isOpen ? "Close" : "Menu";
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.textContent = "Menu";
    }
  });
}

const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}
