import { apiFetch, setSession, ApiError, SESSION_ALREADY_ACTIVE } from "../api.js";
import { navigate } from "../router.js";
import { toast } from "../utils.js";
import { takeLogoutReason } from "../auth.js";
import { blockIfSignedIn } from "./sessionBlock.js";

export async function renderLogin(el) {
  // Bu tarayıcıda zaten oturum açıksa ikinci kullanıcıyla girişe izin verme.
  if (blockIfSignedIn(el, "giriş")) return;

  const logoutReason = takeLogoutReason();

  el.innerHTML = `
    <div class="auth-shell">
      <div style="text-align: center; margin-bottom: 30px; animation: pulse 2s ease-in-out infinite;">
        <svg viewBox="0 0 200 200" style="width: 120px; height: auto; margin: 0 auto; filter: drop-shadow(0 0 20px rgba(255, 193, 7, 0.4));">
          <g fill="#ffc107">
            <ellipse cx="100" cy="60" rx="45" ry="50"/>
            <polygon points="55,100 55,150 145,150 145,100"/>
            <polygon points="70,120 70,160 60,160 60,120"/>
            <polygon points="130,120 130,160 140,160 140,120"/>
            <circle cx="90" cy="80" r="6" fill="#0a0e27"/>
            <circle cx="110" cy="80" r="6" fill="#0a0e27"/>
          </g>
        </svg>
      </div>
      <div class="card">
        <h2 style="color: #ffc107; text-align: center; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 15px rgba(255, 193, 7, 0.3);">Batman PM</h2>
        <p class="page-subtitle" style="text-align: center;">Proje Yönetim Sistemi</p>
        <div id="login-alert"></div>
        <form id="login-form">
          <div class="form-row">
            <label for="email">📧 E-posta</label>
            <input type="email" id="email" name="email" required autocomplete="username" />
          </div>
          <div class="form-row">
            <label for="password">🔐 Şifre</label>
            <input type="password" id="password" name="password" required autocomplete="current-password" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-block">⚡ Giriş Yap</button>
          </div>
        </form>
        <hr class="divider" />
        <p class="text-muted" style="text-align: center;">Hesabın yok mu? <a href="#/register" style="color: #ffc107; font-weight: 600;">Kayıt ol</a></p>
        <p class="text-muted" style="font-size:11px; text-align: center; line-height: 1.6;">
          <strong style="color: #ffc107;">Test Hesapları:</strong><br>
          admin@heweso.com / Admin123!<br>
          pm@heweso.com / Manager123!<br>
          dev1@heweso.com / Member123!
        </p>
      </div>
    </div>
  `;

  const form = document.getElementById("login-form");
  const alertBox = document.getElementById("login-alert");

  // Oturum başka bir cihazdan devralındıysa nedenini göster.
  if (logoutReason) {
    alertBox.innerHTML = `<div class="alert alert-error">${logoutReason}</div>`;
  }

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
      // Hesap başka bir cihazda açıksa bunu ayrıca vurgula.
      const isSessionConflict = err instanceof ApiError && err.code === SESSION_ALREADY_ACTIVE;
      alertBox.innerHTML = `
        <div class="alert alert-error">
          ${isSessionConflict ? "<strong>Bu hesap zaten açık.</strong><br />" : ""}${message}
        </div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

