const form = document.getElementById("authForm");
const fields = document.getElementById("authFields");
const title = document.getElementById("authTitle");
const description = document.getElementById("authDescription");
const submit = document.getElementById("authSubmit");
const message = document.getElementById("authMessage");
const links = document.querySelector(".auth-links");

const modes = {
  login: {
    title: "Sign in",
    description: "Enter your details to continue",
    button: "Sign in",
    fields: [["Email address", "email", "email", "you@example.com"], ["Password", "password", "password", "Enter password"]],
    links: ["register", "forgot"],
  },
  register: {
    title: "Create account",
    description: "Join TechKart to save your account",
    button: "Create account",
    fields: [["Your name", "name", "text", "Alex Morgan"], ["Email address", "email", "email", "you@example.com"], ["Password", "password", "password", "At least 10 characters"], ["Confirm password", "confirmPassword", "password", "Repeat your password"]],
    links: ["login"],
  },
  forgot: {
    title: "Forgot password",
    description: "We’ll send a reset link if the account exists",
    button: "Send reset link",
    fields: [["Email address", "email", "email", "you@example.com"]],
    links: ["login"],
  },
  reset: {
    title: "Choose a new password",
    description: "Reset links expire after one hour",
    button: "Update password",
    fields: [["New password", "password", "password", "At least 10 characters"], ["Confirm password", "confirmPassword", "password", "Repeat your new password"]],
    links: ["login"],
  },
};

function setMode(mode) {
  const config = modes[mode] || modes.login;
  form.dataset.mode = mode in modes ? mode : "login";
  title.textContent = config.title;
  description.textContent = config.description;
  submit.innerHTML = `${config.button} <span>→</span>`;
  message.textContent = "";
  fields.replaceChildren(...config.fields.map(([label, id, type, placeholder]) => {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const input = document.createElement("input");
    input.id = `auth-${id}`;
    input.name = id;
    input.type = type;
    input.placeholder = placeholder;
    input.required = true;
    if (id === "password" || id === "confirmPassword") input.minLength = 10;
    if (type === "email") input.autocomplete = "email";
    if (id === "password") input.autocomplete = mode === "login" ? "current-password" : "new-password";
    wrapper.append(input);
    return wrapper;
  }));
  links.querySelectorAll("[data-auth-mode]").forEach((link) => {
    link.hidden = !config.links.includes(link.dataset.authMode);
  });
}

async function request(path, data) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const mode = form.dataset.mode;
  const values = Object.fromEntries(new FormData(form));
  message.textContent = "";
  try {
    if (mode === "register" || mode === "reset") {
      if (values.password !== values.confirmPassword) throw new Error("The passwords do not match.");
    }
    if (mode === "login") {
      const result = await request("login", values);
      message.textContent = `Welcome back, ${result.user.name}!`;
    } else if (mode === "register") {
      const result = await request("register", values);
      message.textContent = `Account created. Welcome, ${result.user.name}!`;
    } else if (mode === "forgot") {
      const result = await request("forgot-password", values);
      if (result.resetUrl) {
        const link = document.createElement("a");
        link.href = result.resetUrl;
        link.textContent = "Open reset link";
        message.textContent = `${result.message} `;
        message.append(link);
      } else {
        message.textContent = result.message;
      }
    } else if (mode === "reset") {
      const resetToken = new URLSearchParams(location.search).get("resetToken");
      if (!resetToken) throw new Error("The password reset link is missing or invalid.");
      const result = await request("reset-password", { token: resetToken, password: values.password });
      message.textContent = result.message;
      history.replaceState(null, "", "/");
      setMode("login");
      message.textContent = result.message;
      return;
    }
  } catch (error) {
    message.textContent = error.message;
    message.style.color = "#c0394b";
    return;
  }
  message.style.color = "#16834b";
});

links.addEventListener("click", (event) => {
  const button = event.target.closest("[data-auth-mode]");
  if (button) setMode(button.dataset.authMode);
});

document.querySelector('[data-page="signin"]').addEventListener("click", () => setMode("login"));

const resetToken = new URLSearchParams(location.search).get("resetToken");
setMode(resetToken ? "reset" : "login");
