import { apiFetch } from "../api.js";
import {
  toast,
  openModal,
  closeModal,
  renderPagination,
  showFieldErrors,
  loadingHtml,
  emptyStateHtml,
  alertHtml,
  escapeHtml,
  formatDateTime,
  roleBadge,
  USER_ROLES,
} from "../utils.js";

const state = { page: 1, pageSize: 10 };

export async function renderUsers(el) {
  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Kullanıcılar</h1>
        <div class="page-subtitle">Tüm sistem kullanıcıları. Rol ve aktif/pasif durumunu Admin değiştirebilir.</div>
      </div>
    </div>
    <div id="users-content">${loadingHtml()}</div>
    <div id="users-pagination"></div>
  `;

  await load();

  async function load() {
    const content = document.getElementById("users-content");
    content.innerHTML = loadingHtml();
    try {
      const result = await apiFetch("/users", { query: { page: state.page, pageSize: state.pageSize } });
      renderTable(content, result);
      renderPagination(document.getElementById("users-pagination"), result.page, result.totalPages, (p) => {
        state.page = p;
        load();
      });
    } catch (err) {
      content.innerHTML = alertHtml(err.message || "Kullanıcılar yüklenemedi.");
    }
  }

  function renderTable(container, result) {
    if (!result.items.length) {
      container.innerHTML = emptyStateHtml("Kullanıcı bulunamadı.");
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ad Soyad</th><th>E-posta</th><th>Rol</th><th>Departman</th><th>Durum</th><th>Kayıt</th><th></th></tr></thead>
          <tbody>
            ${result.items
              .map(
                (u) => `
              <tr>
                <td>${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</td>
                <td class="text-muted">${escapeHtml(u.email)}</td>
                <td>${roleBadge(u.role)}</td>
                <td>${u.department ? escapeHtml(u.department) : '<span class="text-muted">-</span>'}</td>
                <td>${u.isActive ? '<span class="badge badge-green">Aktif</span>' : '<span class="badge badge-red">Pasif</span>'}</td>
                <td class="nowrap text-muted">${formatDateTime(u.createdAt)}</td>
                <td class="text-right"><button type="button" class="btn btn-ghost btn-sm edit-user-btn" data-id="${u.id}">Düzenle</button></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll(".edit-user-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const u = result.items.find((x) => x.id === parseInt(btn.getAttribute("data-id"), 10));
        openEditModal(u, load);
      });
    });
  }
}

function openEditModal(user, onDone) {
  openModal(
    `${user.firstName} ${user.lastName}`,
    `
    <form id="edit-user-form">
      <div class="form-grid">
        <div class="form-row">
          <label for="eu-first">Ad</label>
          <input type="text" id="eu-first" name="firstName" required maxlength="50" value="${escapeHtml(user.firstName)}" />
        </div>
        <div class="form-row">
          <label for="eu-last">Soyad</label>
          <input type="text" id="eu-last" name="lastName" required maxlength="50" value="${escapeHtml(user.lastName)}" />
        </div>
      </div>
      <div class="form-row">
        <label for="eu-dept">Departman</label>
        <input type="text" id="eu-dept" name="department" maxlength="100" value="${escapeHtml(user.department || "")}" />
      </div>
      <div class="form-row">
        <label for="eu-role">Rol</label>
        <select id="eu-role" name="role">
          ${Object.entries(USER_ROLES)
            .map(([v, label]) => `<option value="${v}" ${String(user.role) === v ? "selected" : ""}>${label}</option>`)
            .join("")}
        </select>
      </div>
      <div class="form-row">
        <label><input type="checkbox" id="eu-active" name="isActive" ${user.isActive ? "checked" : ""} style="width:auto; display:inline-block; margin-right:6px;" /> Aktif</label>
      </div>
      <div id="edit-user-alert"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="cancel-edit-user">Vazgeç</button>
        <button type="submit" class="btn btn-primary">Kaydet</button>
      </div>
    </form>
  `
  );

  document.getElementById("cancel-edit-user").addEventListener("click", closeModal);

  const form = document.getElementById("edit-user-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById("edit-user-alert");
    alertBox.innerHTML = "";
    form.querySelectorAll(".field-error").forEach((n) => n.remove());

    const dto = {
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      department: form.department.value.trim() || null,
      role: parseInt(form.role.value, 10),
      isActive: form.isActive.checked,
    };

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      await apiFetch(`/users/${user.id}`, { method: "PUT", body: dto });
      closeModal();
      toast("Kullanıcı güncellendi.", "success");
      onDone();
    } catch (err) {
      alertBox.innerHTML = alertHtml(err.message);
      if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
