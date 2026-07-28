import { apiFetch, setSession, ApiError } from "../api.js";
import { navigate } from "../router.js";
import { toast } from "../utils.js";
import { blockIfSignedIn } from "./sessionBlock.js";

export async function renderRegister(el) {
  // Bu tarayıcıda zaten oturum açıksa yeni hesapla kayıt/girişe izin verme.
  if (blockIfSignedIn(el, "kayıt")) return;

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
        <h2 style="color: #ffc107; text-align: center; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 15px rgba(255, 193, 7, 0.3);">Batman PM - Kayıt Ol</h2>
        <p class="page-subtitle" style="text-align: center;">Yeni hesaplar Ekip Üyesi rolüyle oluşturulur.</p>
        <div id="register-alert"></div>
        <form id="register-form">
          <div class="form-grid">
            <div class="form-row">
              <label for="firstName">👤 Ad</label>
              <input type="text" id="firstName" name="firstName" required maxlength="50" />
            </div>
            <div class="form-row">
              <label for="lastName">👤 Soyad</label>
              <input type="text" id="lastName" name="lastName" required maxlength="50" />
            </div>
          </div>
          <div class="form-row">
            <label for="email">📧 E-posta</label>
            <input type="email" id="email" name="email" required autocomplete="username" />
          </div>
          <div class="form-row">
            <label for="password">🔐 Şifre</label>
            <input type="password" id="password" name="password" required minlength="6" autocomplete="new-password" />
            <div class="form-help">En az 6 karakter.</div>
          </div>
          <div class="form-row">
            <label for="department">🏢 Departman (opsiyonel)</label>
            <input type="text" id="department" name="department" maxlength="100" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-block">⚡ Kayıt Ol</button>
          </div>
        </form>
        <hr class="divider" />
        <p class="text-muted" style="text-align: center;">Zaten hesabın var mı? <a href="#/login" style="color: #ffc107; font-weight: 600;">Giriş yap</a></p>
      </div>
    </div>
  `;

  const form = document.getElementById("register-form");
  const alertBox = document.getElementById("register-alert");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBox.innerHTML = "";
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    const dto = {
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
      department: form.department.value.trim() || null,
    };

    try {
      const result = await apiFetch("/auth/register", { method: "POST", body: dto });
      setSession(result);
      toast("Kayıt tamamlandı, hoş geldin!", "success");
      window.dispatchEvent(new Event("pmapi:auth-changed"));
      navigate("/projects");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Kayıt oluşturulamadı.";
      alertBox.innerHTML = `<div class="alert alert-error">${message}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
}
