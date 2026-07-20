import { getSession, clearSession } from "./api.js";

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

export function logout() {
  clearSession();
  location.hash = "#/login";
}
