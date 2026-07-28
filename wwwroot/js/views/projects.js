import { apiFetch } from "../api.js";
import { navigate } from "../router.js";
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
  formatDate,
  projectStatusBadge,
  PROJECT_STATUSES,
} from "../utils.js";
import { isAdmin, isAdminOrPM, currentUser } from "../auth.js";

const state = { page: 1, pageSize: 10, status: "", sortBy: "createdAt", sortDirection: "desc" };

export async function renderProjects(el) {
  el.innerHTML = `
    <div style="background: linear-gradient(180deg, #0a0e27 0%, #1a1f3a 50%); border-radius: 8px; padding: 30px 20px; margin-bottom: 30px; text-align: center; border: 2px solid #ffc107; box-shadow: 0 8px 32px rgba(255, 193, 7, 0.15);">
      <div style="max-width: 200px; margin: 0 auto; animation: pulse 2s ease-in-out infinite;">
        <svg viewBox="0 0 200 200" style="width: 100%; height: auto; filter: drop-shadow(0 0 20px rgba(255, 193, 7, 0.4));">
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
      <h1 style="color: #ffc107; margin: 20px 0 10px 0; text-shadow: 0 0 20px rgba(255, 193, 7, 0.4); font-size: 32px; text-transform: uppercase; letter-spacing: 2px;">BATMAN PM</h1>
      <div style="color: #9399bb; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Proje Yönetim Sistemi</div>
    </div>

    <div class="page-header">
      <div>
        <h2 style="color: #ffc107; text-shadow: 0 0 15px rgba(255, 193, 7, 0.3); text-transform: uppercase; letter-spacing: 1px;">Projeler</h2>
        <div class="page-subtitle">Sahip olduğunuz veya üyesi olduğunuz projeler.</div>
      </div>
      <div class="page-actions">
        ${isAdminOrPM() ? '<button id="new-project-btn" class="btn btn-primary" type="button">⚡ Yeni Proje</button>' : ""}
      </div>
    </div>
    <div class="filters">
      <div class="form-row">
        <label>Durum</label>
        <select id="filter-status">
          <option value="">Tümü</option>
          ${Object.entries(PROJECT_STATUSES)
            .map(([v, label]) => `<option value="${v}">${label}</option>`)
            .join("")}
        </select>
      </div>
      <div class="form-row">
        <label>Sırala</label>
        <select id="filter-sort">
          <option value="createdAt">Oluşturulma</option>
          <option value="name">İsim</option>
          <option value="startdate">Başlangıç</option>
          <option value="status">Durum</option>
        </select>
      </div>
      <div class="form-row">
        <label>Yön</label>
        <select id="filter-dir">
          <option value="desc">Azalan</option>
          <option value="asc">Artan</option>
        </select>
      </div>
    </div>
    <div id="projects-content">${loadingHtml()}</div>
    <div id="projects-pagination"></div>
  `;

  document.getElementById("filter-status").value = state.status;
  document.getElementById("filter-sort").value = state.sortBy;
  document.getElementById("filter-dir").value = state.sortDirection;

  document.getElementById("filter-status").addEventListener("change", (e) => {
    state.status = e.target.value;
    state.page = 1;
    load();
  });
  document.getElementById("filter-sort").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    load();
  });
  document.getElementById("filter-dir").addEventListener("change", (e) => {
    state.sortDirection = e.target.value;
    load();
  });

  if (isAdminOrPM()) {
    document.getElementById("new-project-btn").addEventListener("click", openCreateModal);
  }

  await load();

  async function load() {
    const content = document.getElementById("projects-content");
    content.innerHTML = loadingHtml();
    try {
      const result = await apiFetch("/projects", {
        query: {
          page: state.page,
          pageSize: state.pageSize,
          status: state.status || undefined,
          sortBy: state.sortBy,
          sortDirection: state.sortDirection,
        },
      });
      renderTable(content, result);
      renderPagination(document.getElementById("projects-pagination"), result.page, result.totalPages, (p) => {
        state.page = p;
        load();
      });
    } catch (err) {
      content.innerHTML = alertHtml(err.message || "Projeler yüklenemedi.");
    }
  }

  function renderTable(container, result) {
    if (!result.items.length) {
      container.innerHTML = emptyStateHtml("Henüz görünür bir proje yok.");
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>⚡ Proje</th><th>Durum</th><th>Sahip</th><th>Başlangıç</th><th>Bitiş</th><th></th></tr>
          </thead>
          <tbody>
            ${result.items
              .map(
                (p) => `
              <tr class="row-link" data-id="${p.id}" style="transition: all 0.2s ease;">
                <td>
                  <div style="font-weight:700; color: #ffc107;">${escapeHtml(p.name)}${
                  p.isArchived ? ' <span class="badge badge-gray">Arşivde</span>' : ""
                }</div>
                  ${
                    p.description
                      ? `<div class="text-muted" style="font-size:12px;">${escapeHtml(p.description.slice(0, 90))}</div>`
                      : ""
                  }
                </td>
                <td>${projectStatusBadge(p.status)}</td>
                <td>${escapeHtml(p.ownerName)}</td>
                <td class="nowrap">${formatDate(p.startDate)}</td>
                <td class="nowrap">${formatDate(p.endDate)}</td>
                <td class="text-right"><a href="#/projects/${p.id}" style="color: #ffc107; font-weight: 600;">Detay ⚡</a></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    container.querySelectorAll("tr[data-id]").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.tagName === "A") return;
        navigate(`/projects/${row.getAttribute("data-id")}`);
      });
    });
  }

  async function openCreateModal() {
    let ownerOptions = "";
    if (isAdmin()) {
      try {
        const users = await apiFetch("/users", { query: { page: 1, pageSize: 100 } });
        ownerOptions = users.items
          .filter((u) => (u.role === 1 || u.role === 2) && u.id !== currentUser().id)
          .map((u) => `<option value="${u.id}">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)} (${escapeHtml(u.email)})</option>`)
          .join("");
      } catch {
        /* fall back to self ownership only */
      }
    }

    openModal(
      "⚡ Yeni Proje",
      `
      <form id="create-project-form">
        <div class="form-row">
          <label for="p-name">Proje Adı</label>
          <input type="text" id="p-name" name="name" required maxlength="200" />
        </div>
        <div class="form-row">
          <label for="p-desc">Açıklama</label>
          <textarea id="p-desc" name="description"></textarea>
        </div>
        <div class="form-grid">
          <div class="form-row">
            <label for="p-start">Başlangıç Tarihi</label>
            <input type="date" id="p-start" name="startDate" required />
          </div>
          <div class="form-row">
            <label for="p-end">Bitiş Tarihi (opsiyonel)</label>
            <input type="date" id="p-end" name="endDate" />
          </div>
        </div>
        ${
          isAdmin()
            ? `
        <div class="form-row">
          <label for="p-owner">Proje Sahibi</label>
          <select id="p-owner" name="ownerId">
            <option value="">Ben (${escapeHtml(currentUser().firstName)})</option>
            ${ownerOptions}
          </select>
          <div class="form-help">Sahip yalnızca Admin veya Proje Yöneticisi rolünde olabilir.</div>
        </div>`
            : ""
        }
        <div id="create-project-alert"></div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="cancel-create-project">Vazgeç</button>
          <button type="submit" class="btn btn-primary">⚡ Oluştur</button>
        </div>
      </form>
    `
    );

    document.getElementById("cancel-create-project").addEventListener("click", closeModal);

    const form = document.getElementById("create-project-form");
    const startDateInput = form.elements.startDate;
    const endDateInput = form.elements.endDate;

    const syncEndDateMinimum = () => {
      if (startDateInput.value) {
        endDateInput.setAttribute("min", startDateInput.value);
      } else {
        endDateInput.removeAttribute("min");
      }

      if (endDateInput.value && endDateInput.value < startDateInput.value) {
        endDateInput.value = "";
      }
    };

    startDateInput.addEventListener("input", syncEndDateMinimum);
    startDateInput.addEventListener("change", syncEndDateMinimum);
    syncEndDateMinimum();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById("create-project-alert");
      alertBox.innerHTML = "";
      form.querySelectorAll(".field-error").forEach((n) => n.remove());

      syncEndDateMinimum();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const dto = {
        name: form.name.value.trim(),
        description: form.description.value.trim() || null,
        startDate: form.startDate.value,
        endDate: form.endDate.value || null,
      };
      if (isAdmin() && form.ownerId && form.ownerId.value) {
        dto.ownerId = parseInt(form.ownerId.value, 10);
      }

      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      try {
        const created = await apiFetch("/projects", { method: "POST", body: dto });
        closeModal();
        toast("Proje oluşturuldu.", "success");
        navigate(`/projects/${created.id}`);
      } catch (err) {
        alertBox.innerHTML = alertHtml(err.message);
        if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
}
