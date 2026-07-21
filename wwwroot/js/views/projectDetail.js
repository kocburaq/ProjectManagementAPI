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
  formatDateTime,
  toInputDate,
  projectStatusBadge,
  taskStatusBadge,
  taskPriorityBadge,
  memberRoleBadge,
  PROJECT_STATUSES,
  MEMBER_ROLES,
} from "../utils.js";
import { canManageProject } from "../auth.js";
import { openCreateTaskModal } from "../taskForm.js";

export async function renderProjectDetail(el, params) {
  const projectId = params.id;
  el.innerHTML = loadingHtml();

  let project;
  try {
    project = await apiFetch(`/projects/${projectId}`);
  } catch (err) {
    el.innerHTML = alertHtml(err.message || "Proje bulunamadı.");
    return;
  }

  const manage = canManageProject(project);

  el.innerHTML = `
    <p><a href="#/projects">&larr; Projeler</a></p>
    <div class="page-header">
      <div>
        <h1>${escapeHtml(project.name)} ${project.isArchived ? '<span class="badge badge-gray">Arşivde</span>' : ""}</h1>
        <div class="page-subtitle">${projectStatusBadge(project.status)}</div>
      </div>
      <div class="page-actions">
        ${manage ? '<button id="edit-project-btn" class="btn btn-ghost" type="button">Düzenle</button>' : ""}
        ${
          manage && !project.isArchived
            ? '<button id="archive-project-btn" class="btn btn-ghost" type="button">Arşivle</button>'
            : ""
        }
        ${manage ? '<button id="delete-project-btn" class="btn btn-danger" type="button">Sil</button>' : ""}
      </div>
    </div>

    <div class="card">
      ${project.description ? `<p>${escapeHtml(project.description)}</p><hr class="divider" />` : ""}
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Sahip</div>
          <div class="detail-value">${escapeHtml(project.ownerName)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Başlangıç</div>
          <div class="detail-value">${formatDate(project.startDate)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Bitiş</div>
          <div class="detail-value">${formatDate(project.endDate)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Oluşturulma</div>
          <div class="detail-value">${formatDateTime(project.createdAt)}</div>
        </div>
        ${
          project.isArchived
            ? `<div class="detail-item"><div class="detail-label">Arşivlenme</div><div class="detail-value">${formatDateTime(
                project.archivedAt
              )}</div></div>`
            : ""
        }
      </div>
    </div>

    <div class="tabs">
      <button type="button" class="tab-btn active" data-tab="tasks">Görevler</button>
      <button type="button" class="tab-btn" data-tab="members">Ekip Üyeleri</button>
    </div>
    <div id="tab-tasks"></div>
    <div id="tab-members" style="display:none;"></div>
  `;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab");
      document.getElementById("tab-tasks").style.display = tab === "tasks" ? "" : "none";
      document.getElementById("tab-members").style.display = tab === "members" ? "" : "none";
    });
  });

  if (manage) {
    document.getElementById("edit-project-btn").addEventListener("click", () => openEditModal(project));
    if (!project.isArchived) {
      document.getElementById("archive-project-btn").addEventListener("click", () => archiveProject(project));
    }
    document.getElementById("delete-project-btn").addEventListener("click", () => deleteProject(project));
  }

  await renderTasksTab(document.getElementById("tab-tasks"), project, manage);
  await renderMembersTab(document.getElementById("tab-members"), project, manage);
}

async function archiveProject(project) {
  if (!confirm(`"${project.name}" projesini arşivlemek istediğinize emin misiniz?`)) return;
  try {
    await apiFetch(`/projects/${project.id}/archive`, { method: "PATCH" });
    toast("Proje arşivlendi.", "success");
    navigate(`/projects/${project.id}`);
    location.reload();
  } catch (err) {
    toast(err.message || "Arşivleme başarısız oldu.", "error");
  }
}

async function deleteProject(project) {
  if (!confirm(`"${project.name}" projesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
  try {
    await apiFetch(`/projects/${project.id}`, { method: "DELETE" });
    toast("Proje silindi.", "success");
    navigate("/projects");
  } catch (err) {
    toast(err.message || "Silme işlemi başarısız oldu.", "error");
  }
}

function openEditModal(project) {
  openModal(
    "Projeyi Düzenle",
    `
    <form id="edit-project-form">
      <div class="form-row">
        <label for="ep-name">Proje Adı</label>
        <input type="text" id="ep-name" name="name" required maxlength="200" value="${escapeHtml(project.name)}" />
      </div>
      <div class="form-row">
        <label for="ep-desc">Açıklama</label>
        <textarea id="ep-desc" name="description">${escapeHtml(project.description || "")}</textarea>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label for="ep-start">Başlangıç Tarihi</label>
          <input type="date" id="ep-start" name="startDate" required value="${toInputDate(project.startDate)}" />
        </div>
        <div class="form-row">
          <label for="ep-end">Bitiş Tarihi</label>
          <input type="date" id="ep-end" name="endDate" value="${toInputDate(project.endDate)}" />
        </div>
      </div>
      <div class="form-row">
        <label for="ep-status">Durum</label>
        <select id="ep-status" name="status">
          ${Object.entries(PROJECT_STATUSES)
            .map(([v, label]) => `<option value="${v}" ${String(project.status) === v ? "selected" : ""}>${label}</option>`)
            .join("")}
        </select>
      </div>
      <div id="edit-project-alert"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="cancel-edit-project">Vazgeç</button>
        <button type="submit" class="btn btn-primary">Kaydet</button>
      </div>
    </form>
  `
  );

  document.getElementById("cancel-edit-project").addEventListener("click", closeModal);

  const form = document.getElementById("edit-project-form");
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
    const alertBox = document.getElementById("edit-project-alert");
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
      status: parseInt(form.status.value, 10),
    };

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      await apiFetch(`/projects/${project.id}`, { method: "PUT", body: dto });
      closeModal();
      toast("Proje güncellendi.", "success");
      navigate(`/projects/${project.id}`);
      location.reload();
    } catch (err) {
      alertBox.innerHTML = alertHtml(err.message);
      if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

async function renderTasksTab(container, project, manage) {
  const state = { page: 1, pageSize: 10 };

  container.innerHTML = `
    <div class="page-actions" style="justify-content:flex-end; margin-bottom:12px;">
      ${manage ? '<button id="new-task-btn" class="btn btn-primary" type="button">+ Yeni Görev</button>' : ""}
    </div>
    <div id="project-tasks-content">${loadingHtml()}</div>
    <div id="project-tasks-pagination"></div>
  `;

  if (manage) {
    document.getElementById("new-task-btn").addEventListener("click", () => {
      openCreateTaskModal(project.id, () => load());
    });
  }

  await load();

  async function load() {
    const content = document.getElementById("project-tasks-content");
    content.innerHTML = loadingHtml();
    try {
      const result = await apiFetch("/tasks", {
        query: { projectId: project.id, page: state.page, pageSize: state.pageSize },
      });
      renderTasksTable(content, result);
      renderPagination(document.getElementById("project-tasks-pagination"), result.page, result.totalPages, (p) => {
        state.page = p;
        load();
      });
    } catch (err) {
      content.innerHTML = alertHtml(err.message || "Görevler yüklenemedi.");
    }
  }

  function renderTasksTable(container, result) {
    if (!result.items.length) {
      container.innerHTML = emptyStateHtml("Bu projede henüz görev yok.");
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Görev</th><th>Durum</th><th>Öncelik</th><th>Atanan</th><th>Teslim</th><th></th></tr></thead>
          <tbody>
            ${result.items
              .map(
                (t) => `
              <tr class="row-link" data-id="${t.id}">
                <td>${escapeHtml(t.title)}</td>
                <td>${taskStatusBadge(t.status)}</td>
                <td>${taskPriorityBadge(t.priority)}</td>
                <td>${t.assignedToUserName ? escapeHtml(t.assignedToUserName) : '<span class="text-muted">-</span>'}</td>
                <td class="nowrap">${formatDate(t.dueDate)}</td>
                <td class="text-right"><a href="#/tasks/${t.id}">Detay &rsaquo;</a></td>
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
        navigate(`/tasks/${row.getAttribute("data-id")}`);
      });
    });
  }
}

async function renderMembersTab(container, project, manage) {
  const state = { page: 1, pageSize: 10 };

  container.innerHTML = `
    <div class="page-actions" style="justify-content:flex-end; margin-bottom:12px;">
      ${manage ? '<button id="add-member-btn" class="btn btn-primary" type="button">+ Üye Ekle</button>' : ""}
    </div>
    <div id="members-content">${loadingHtml()}</div>
    <div id="members-pagination"></div>
  `;

  if (manage) {
    document.getElementById("add-member-btn").addEventListener("click", () => openAddMemberModal());
  }

  await load();

  async function load() {
    const content = document.getElementById("members-content");
    content.innerHTML = loadingHtml();
    try {
      const result = await apiFetch(`/projects/${project.id}/members`, {
        query: { page: state.page, pageSize: state.pageSize },
      });
      renderMembersTable(content, result);
      renderPagination(document.getElementById("members-pagination"), result.page, result.totalPages, (p) => {
        state.page = p;
        load();
      });
    } catch (err) {
      content.innerHTML = alertHtml(err.message || "Üyeler yüklenemedi.");
    }
  }

  function renderMembersTable(container, result) {
    if (!result.items.length) {
      container.innerHTML = emptyStateHtml("Henüz ekip üyesi eklenmemiş.");
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Kullanıcı</th><th>E-posta</th><th>Rol</th><th>Katılım</th><th>Durum</th>${manage ? "<th></th>" : ""}</tr></thead>
          <tbody>
            ${result.items
              .map(
                (m) => `
              <tr>
                <td>${escapeHtml(m.userName)}</td>
                <td class="text-muted">${escapeHtml(m.userEmail)}</td>
                <td>${memberRoleBadge(m.role)}</td>
                <td class="nowrap">${formatDate(m.joinedAt)}</td>
                <td>${m.isActive ? '<span class="badge badge-green">Aktif</span>' : '<span class="badge badge-gray">Pasif</span>'}</td>
                ${
                  manage && m.isActive
                    ? `<td class="text-right"><button type="button" class="btn btn-ghost btn-sm remove-member-btn" data-id="${m.id}" data-name="${escapeHtml(
                        m.userName
                      )}">Çıkar</button></td>`
                    : manage
                    ? "<td></td>"
                    : ""
                }
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    container.querySelectorAll(".remove-member-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const name = btn.getAttribute("data-name");
        if (!confirm(`${name} adlı üyeyi projeden çıkarmak istediğinize emin misiniz?`)) return;
        try {
          await apiFetch(`/projects/${project.id}/members/${btn.getAttribute("data-id")}`, { method: "DELETE" });
          toast("Üye çıkarıldı.", "success");
          load();
        } catch (err) {
          toast(err.message || "Üye çıkarılamadı.", "error");
        }
      });
    });
  }

  async function openAddMemberModal() {
    let userOptionsHtml = "";
    let useSelect = false;
    try {
      const users = await apiFetch("/users", { query: { page: 1, pageSize: 200 } });
      useSelect = true;
      userOptionsHtml = users.items
        .filter((u) => u.isActive)
        .map((u) => `<option value="${u.id}">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)} (${escapeHtml(u.email)})</option>`)
        .join("");
    } catch {
      useSelect = false;
    }

    openModal(
      "Ekip Üyesi Ekle",
      `
      <form id="add-member-form">
        <div class="form-row">
          <label for="am-user">Kullanıcı</label>
          ${
            useSelect
              ? `<select id="am-user" name="userId" required><option value="">Seçiniz...</option>${userOptionsHtml}</select>`
              : `<input type="number" id="am-user" name="userId" required min="1" />
                 <div class="form-help">Kullanıcı listesine erişiminiz yok; kullanıcının ID'sini girin.</div>`
          }
        </div>
        <div class="form-row">
          <label for="am-role">Proje İçi Rol</label>
          <select id="am-role" name="role">
            ${Object.entries(MEMBER_ROLES)
              .map(([v, label]) => `<option value="${v}" ${v === "1" ? "selected" : ""}>${label}</option>`)
              .join("")}
          </select>
        </div>
        <div id="add-member-alert"></div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="cancel-add-member">Vazgeç</button>
          <button type="submit" class="btn btn-primary">Ekle</button>
        </div>
      </form>
    `
    );

    document.getElementById("cancel-add-member").addEventListener("click", closeModal);

    const form = document.getElementById("add-member-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById("add-member-alert");
      alertBox.innerHTML = "";
      form.querySelectorAll(".field-error").forEach((n) => n.remove());

      const dto = {
        userId: parseInt(form.userId.value, 10),
        role: parseInt(form.role.value, 10),
      };

      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      try {
        await apiFetch(`/projects/${project.id}/members`, { method: "POST", body: dto });
        closeModal();
        toast("Üye eklendi.", "success");
        load();
      } catch (err) {
        alertBox.innerHTML = alertHtml(err.message);
        if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
}
