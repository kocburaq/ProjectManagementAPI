import { apiFetch, setSession, ApiError } from "../api.js";
import { navigate } from "../router.js";
import { toast } from "../utils.js";

export async function renderRegister(el) {
  el.innerHTML = `
    <div class="auth-shell">
      <div class="card">
        <h2>Kayıt Ol</h2>
        <p class="page-subtitle">Yeni hesaplar Ekip Üyesi rolüyle oluşturulur.</p>
        <div id="register-alert"></div>
        <form id="register-form">
          <div class="form-grid">
            <div class="form-row">
              <label for="firstName">Ad</label>
              <input type="text" id="firstName" name="firstName" required maxlength="50" />
            </div>
            <div class="form-row">
              <label for="lastName">Soyad</label>
              <input type="text" id="lastName" name="lastName" required maxlength="50" />
            </div>
          </div>
          <div class="form-row">
            <label for="email">E-posta</label>
            <input type="email" id="email" name="email" required autocomplete="username" />
          </div>
          <div class="form-row">
            <label for="password">Şifre</label>
            <input type="password" id="password" name="password" required minlength="6" autocomplete="new-password" />
            <div class="form-help">En az 6 karakter.</div>
          </div>
          <div class="form-row">
            <label for="department">Departman (opsiyonel)</label>
            <input type="text" id="department" name="department" maxlength="100" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-block">Kayıt Ol</button>
          </div>
        </form>
        <hr class="divider" />
        <p class="text-muted">Zaten hesabın var mı? <a href="#/login">Giriş yap</a></p>
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
