import { apiFetch, setSession, ApiError } from "../api.js";
import { navigate } from "../router.js";
import { toast } from "../utils.js";

export async function renderLogin(el) {
  el.innerHTML = `
    <div class="auth-shell">
      <div class="card">
        <h2>Giriş Yap</h2>
        <p class="page-subtitle">Heweso Proje Yönetim Sistemi</p>
        <div id="login-alert"></div>
        <form id="login-form">
          <div class="form-row">
            <label for="email">E-posta</label>
            <input type="email" id="email" name="email" required autocomplete="username" />
          </div>
          <div class="form-row">
            <label for="password">Şifre</label>
            <input type="password" id="password" name="password" required autocomplete="current-password" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-block">Giriş Yap</button>
          </div>
        </form>
        <hr class="divider" />
        <p class="text-muted">Hesabın yok mu? <a href="#/register">Kayıt ol</a></p>
        <p class="text-muted" style="font-size:12px;">
          Test kullanıcıları: admin@heweso.com / Admin123!, pm@heweso.com / Manager123!,
          dev1@heweso.com / Member123!
        </p>
      </div>
    </div>
  `;

  const form = document.getElementById("login-form");
  const alertBox = document.getElementById("login-alert");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBox.innerHTML = "";
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      const result = await apiFetch("/auth/login", { method: "POST", body: { email, password } });
      setSession(result);
      toast(`Hoş geldin, ${result.user.firstName}!`, "success");
      window.dispatchEvent(new Event("pmapi:auth-changed"));
      navigate("/projects");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Giriş yapılamadı.";
      alertBox.innerHTML = `<div class="alert alert-error">${message}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
}
