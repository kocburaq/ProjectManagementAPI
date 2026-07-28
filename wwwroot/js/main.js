import { route, start, navigate, rerender } from "./router.js";
import { isAuthenticated, currentUser, logout, ROLE_ADMIN } from "./auth.js";
import { roleLabel } from "./utils.js";
import { renderLogin } from "./views/login.js";
import { renderRegister } from "./views/register.js";
import { renderProjects } from "./views/projects.js?v=20260728-4";
import { renderProjectDetail } from "./views/projectDetail.js?v=20260728-4";
import { renderTasks } from "./views/tasks.js";
import { renderTaskDetail } from "./views/taskDetail.js";
import { renderUsers } from "./views/users.js";
import { renderBatmanGame } from "./views/batmanGame.js?v=20260728-4";

function guard(handler, { requireAuth = true, roles = null } = {}) {
  return async (el, params, query) => {
    if (requireAuth && !isAuthenticated()) {
      navigate("/login");
      return;
    }
    // NOT: Oturum açıkken login/register'a gelinirse sessizce yönlendirmiyoruz.
    // İlgili view'lar blockIfSignedIn() ile açık bir "zaten oturum açık" hatası gösteriyor.
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
route("/game", guard(renderBatmanGame));

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
  links.push({ href: "#/game", label: "Oyun" });

  const activeHash = (location.hash || "#/projects").split("?")[0];
  navEl.innerHTML = links
    .map((l) => `<a href="${l.href}"${l.href === activeHash ? ' class="active"' : ""}>${l.label}</a>`)
    .join("");
  userEl.innerHTML = `
    <span class="nav-user-info">${user.firstName} ${user.lastName} <span class="badge badge-blue">${roleLabel(user.role)}</span></span>
    <button id="logout-btn" class="btn btn-ghost" type="button">Çıkış</button>
  `;
  document.getElementById("logout-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    // logout() sunucudaki oturumu da serbest bırakır; aksi halde eşzamanlı oturum
    // kuralı yüzünden aynı hesapla hemen tekrar giriş yapılamaz.
    await logout();
    renderNav();
  });
}

window.addEventListener("pmapi:auth-changed", renderNav);
renderNav();

/* ---- Sekmeler arası oturum senkronu ----
   Aynı tarayıcının başka bir sekmesinde giriş/çıkış yapılırsa bu sekme de uyum sağlar.
   Böylece "bir tarayıcıda aynı anda iki farklı kullanıcı" durumu sekmeler arası da oluşamaz. */
window.addEventListener("storage", (e) => {
  if (e.key !== "pmapi_session") return;

  renderNav();

  if (!isAuthenticated()) {
    // Başka sekmede çıkış yapıldı
    if (location.hash !== "#/login") navigate("/login");
    else rerender();
  } else {
    // Başka sekmede farklı bir kullanıcı giriş yaptı - görünümü tazele
    rerender();
  }
});

const appEl = document.getElementById("app");
start(appEl, (target) => {
  target.innerHTML = '<div class="alert alert-error">⚠️ Sayfa bulunamadı. Batman onu bulamıyor!</div>';
});
