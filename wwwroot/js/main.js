import { route, start, navigate } from "./router.js";
import { isAuthenticated, currentUser, logout, ROLE_ADMIN } from "./auth.js";
import { roleLabel } from "./utils.js";
import { renderLogin } from "./views/login.js";
import { renderRegister } from "./views/register.js";
import { renderProjects } from "./views/projects.js";
import { renderProjectDetail } from "./views/projectDetail.js";
import { renderTasks } from "./views/tasks.js";
import { renderTaskDetail } from "./views/taskDetail.js";
import { renderUsers } from "./views/users.js";

function guard(handler, { requireAuth = true, roles = null } = {}) {
  return async (el, params, query) => {
    if (requireAuth && !isAuthenticated()) {
      navigate("/login");
      return;
    }
    if (!requireAuth && isAuthenticated() && (location.hash === "#/login" || location.hash === "#/register")) {
      navigate("/projects");
      return;
    }
    if (roles && !roles.includes(currentUser()?.role)) {
      el.innerHTML = '<div class="alert alert-error">Bu sayfaya erişim yetkiniz yok.</div>';
      return;
    }
    await handler(el, params, query);
    renderNav();
  };
}

route("/", guard(async () => navigate("/projects")));
route("/login", guard(renderLogin, { requireAuth: false }));
route("/register", guard(renderRegister, { requireAuth: false }));
route("/projects", guard(renderProjects));
route("/projects/:id", guard(renderProjectDetail));
route("/tasks", guard(renderTasks));
route("/tasks/:id", guard(renderTaskDetail));
route("/users", guard(renderUsers, { roles: [ROLE_ADMIN] }));

function renderNav() {
  const navEl = document.getElementById("nav-links");
  const userEl = document.getElementById("nav-user");
  const authed = isAuthenticated();
  const user = currentUser();

  if (!authed || !user) {
    navEl.innerHTML = "";
    userEl.innerHTML = `<a href="#/login" class="btn btn-ghost">Giriş Yap</a><a href="#/register" class="btn btn-primary">Kayıt Ol</a>`;
    return;
  }

  const links = [
    { href: "#/projects", label: "Projeler" },
    { href: "#/tasks", label: "Görevler" },
  ];
  if (user.role === ROLE_ADMIN) {
    links.push({ href: "#/users", label: "Kullanıcılar" });
  }

  navEl.innerHTML = links.map((l) => `<a href="${l.href}">${l.label}</a>`).join("");
  userEl.innerHTML = `
    <span class="nav-user-info">${user.firstName} ${user.lastName} <span class="badge badge-blue">${roleLabel(user.role)}</span></span>
    <button id="logout-btn" class="btn btn-ghost" type="button">Çıkış</button>
  `;
  document.getElementById("logout-btn").addEventListener("click", () => {
    logout();
    renderNav();
  });
}

window.addEventListener("pmapi:auth-changed", renderNav);
renderNav();

const appEl = document.getElementById("app");
start(appEl, (target) => {
  target.innerHTML = '<div class="alert alert-error">Sayfa bulunamadı.</div>';
});
