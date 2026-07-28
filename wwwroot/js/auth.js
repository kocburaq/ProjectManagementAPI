import { getSession, clearSession, apiFetch } from "./api.js";

export const ROLE_ADMIN = 1;
export const ROLE_PROJECT_MANAGER = 2;
export const ROLE_TEAM_MEMBER = 3;

export function isAuthenticated() {
  const session = getSession();
  return !!(session && session.accessToken);
}

export function currentUser() {
  const session = getSession();
  return session ? session.user : null;
}

export function hasRole(...roles) {
  const user = currentUser();
  return !!user && roles.includes(user.role);
}

export function isAdmin() {
  return hasRole(ROLE_ADMIN);
}

export function isAdminOrPM() {
  return hasRole(ROLE_ADMIN, ROLE_PROJECT_MANAGER);
}

// düzenle/arşivle/sil/üye yönetimi vs. - backend'deki "sadece sahip ya da Admin" kuralıyla aynı
export function canManageProject(project) {
  const user = currentUser();
  if (!user || !project) return false;
  return user.role === ROLE_ADMIN || project.ownerId === user.id;
}

/**
 * Çıkış yapar. Sunucudaki oturumu da serbest bırakır — bu yapılmazsa
 * eşzamanlı oturum kuralı yüzünden aynı hesapla tekrar giriş yapılamaz
 * (boşta kalma süresi dolana kadar).
 */
export async function logout({ silent = false } = {}) {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // Sunucuya ulaşılamasa bile yerel oturumu temizliyoruz;
    // sunucudaki oturum boşta kalma süresi dolunca kendiliğinden serbest kalır.
  }

  clearSession();

  if (!silent) {
    window.dispatchEvent(new Event("pmapi:auth-changed"));

    // Zaten #/login'deysek hash değişmez, dolayısıyla hashchange tetiklenmez;
    // bu durumda görünümü elle tazelemek gerekiyor.
    if (location.hash === "#/login") {
      const { rerender } = await import("./router.js");
      rerender();
    } else {
      location.hash = "#/login";
    }
  }
}

/** Login/register ekranında gösterilecek "neden çıkış yaptın" mesajını alır ve tüketir. */
export function takeLogoutReason() {
  try {
    const reason = sessionStorage.getItem("pmapi_logout_reason");
    if (reason) sessionStorage.removeItem("pmapi_logout_reason");
    return reason;
  } catch {
    return null;
  }
}
