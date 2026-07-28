import { currentUser, logout } from "../auth.js";
import { navigate } from "../router.js";
import { escapeHtml, roleLabel } from "../utils.js";

/**
 * Eşzamanlı oturum kuralı — tarayıcı tarafı.
 *
 * Bu tarayıcıda zaten bir oturum açıkken login/register ekranına gelinirse,
 * formu göstermek yerine açık bir hata basar. Böylece "admin açıkken ikinci bir
 * kullanıcıyla giriş" mümkün olmaz.
 *
 * @returns {boolean} true ise ekran bloklandı, çağıran view formu render etmemeli.
 */
export function blockIfSignedIn(el, action = "giriş") {
  const user = currentUser();
  if (!user) return false;

  const fullName = escapeHtml(`${user.firstName} ${user.lastName}`);
  const email = escapeHtml(user.email || "");

  el.innerHTML = `
    <div class="auth-shell">
      <div class="card">
        <div class="alert alert-error" style="margin-bottom:18px;">
          <strong>Bu tarayıcıda zaten bir oturum açık.</strong><br />
          Aynı anda yalnızca tek bir kullanıcı oturumu olabilir. Başka bir hesapla
          ${escapeHtml(action)} yapmak için önce mevcut oturumu kapatmalısınız.
        </div>

        <div class="detail-grid" style="margin-bottom:18px;">
          <div class="detail-item">
            <div class="detail-label">Açık oturum</div>
            <div class="detail-value">${fullName}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">E-posta</div>
            <div class="detail-value">${email}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Rol</div>
            <div class="detail-value">${escapeHtml(roleLabel(user.role))}</div>
          </div>
        </div>

        <div class="form-actions">
          <button id="session-block-back" class="btn btn-ghost" type="button">Projelere dön</button>
          <button id="session-block-logout" class="btn btn-danger" type="button">Çıkış yap ve devam et</button>
        </div>
      </div>
    </div>
  `;

  el.querySelector("#session-block-back").addEventListener("click", () => {
    navigate("/projects");
  });

  el.querySelector("#session-block-logout").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    // logout() sunucudaki oturumu da serbest bırakır, sonra #/login'e döner.
    await logout({ silent: true });
    window.dispatchEvent(new Event("pmapi:auth-changed"));
    // Aynı adrestesek router'ı yeniden tetikle
    const { rerender } = await import("../router.js");
    rerender();
  });

  return true;
}
