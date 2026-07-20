import { apiFetch } from "../api.js";
import { navigate } from "../router.js";
import {
  toast,
  openModal,
  closeModal,
  renderPagination,
  loadingHtml,
  emptyStateHtml,
  alertHtml,
  escapeHtml,
  formatDate,
  formatDateTime,
  toInputDate,
  taskStatusBadge,
  taskPriorityBadge,
  changeTypeLabel,
  historyValueLabel,
  TASK_STATUSES,
} from "../utils.js";
import { currentUser, canManageProject, isAdmin } from "../auth.js";
import { openEditTaskModal } from "../taskForm.js";

export async function renderTaskDetail(el, params) {
  const taskId = params.id;
  el.innerHTML = loadingHtml();

  let task;
  try {
    task = await apiFetch(`/tasks/${taskId}`);
  } catch (err) {
    el.innerHTML = alertHtml(err.message || "Görev bulunamadı.");
    return;
  }

  let project = null;
  try {
    project = await apiFetch(`/projects/${task.projectId}`);
  } catch {
    /* permission gating falls back to assignee-only below */
  }

  const reload = () => renderTaskDetail(el, params);
  const manage = project ? canManageProject(project) : false;
  const user = currentUser();
  const isAssignee = !!user && task.assignedToUserId === user.id;
  const canChangeStatus = manage || isAssignee;

  el.innerHTML = `
    <p><a href="#/projects/${task.projectId}">&larr; ${project ? escapeHtml(project.name) : "Proje"}</a></p>
    <div class="page-header">
      <div>
        <h1>${escapeHtml(task.title)}</h1>
        <div class="page-subtitle">${taskStatusBadge(task.status)} ${taskPriorityBadge(task.priority)}</div>
      </div>
      <div class="page-actions">
        ${manage ? '<button id="edit-task-btn" class="btn btn-ghost" type="button">Düzenle</button>' : ""}
        ${manage ? '<button id="delete-task-btn" class="btn btn-danger" type="button">Sil</button>' : ""}
      </div>
    </div>

    <div class="card">
      ${task.description ? `<p>${escapeHtml(task.description)}</p><hr class="divider" />` : ""}
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Oluşturan</div><div class="detail-value">${escapeHtml(task.createdByUserName)}</div></div>
        <div class="detail-item"><div class="detail-label">Atanan</div><div class="detail-value">${task.assignedToUserName ? escapeHtml(task.assignedToUserName) : "-"}</div></div>
        <div class="detail-item"><div class="detail-label">Teslim Tarihi</div><div class="detail-value">${formatDate(task.dueDate)}</div></div>
        <div class="detail-item"><div class="detail-label">Tahmini Süre</div><div class="detail-value">${task.estimatedHours ?? "-"}${task.estimatedHours != null ? " saat" : ""}</div></div>
        <div class="detail-item"><div class="detail-label">Gerçekleşen Süre</div><div class="detail-value">${task.actualHours} saat</div></div>
        <div class="detail-item"><div class="detail-label">Tamamlanma</div><div class="detail-value">${task.completedAt ? formatDateTime(task.completedAt) : "-"}</div></div>
      </div>

      ${
        canChangeStatus
          ? `
      <hr class="divider" />
      <form id="status-form" style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;">
        <div class="form-row" style="margin-bottom:0; min-width:180px;">
          <label for="status-select">Durumu Değiştir</label>
          <select id="status-select" name="status">
            ${Object.entries(TASK_STATUSES)
              .map(([v, label]) => `<option value="${v}" ${String(task.status) === v ? "selected" : ""}>${label}</option>`)
              .join("")}
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-sm">Güncelle</button>
      </form>`
          : ""
      }
    </div>

    <div id="comments-section"></div>
    <div id="timelog-section"></div>
    <div id="history-section"></div>
  `;

  if (manage) {
    document.getElementById("edit-task-btn").addEventListener("click", () => {
      openEditTaskModal(task, () => reload());
    });
    document.getElementById("delete-task-btn").addEventListener("click", async () => {
      if (!confirm(`"${task.title}" görevini silmek istediğinize emin misiniz?`)) return;
      try {
        await apiFetch(`/tasks/${task.id}`, { method: "DELETE" });
        toast("Görev silindi.", "success");
        navigate(`/projects/${task.projectId}`);
      } catch (err) {
        toast(err.message || "Silme işlemi başarısız oldu.", "error");
      }
    });
  }

  if (canChangeStatus) {
    document.getElementById("status-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const select = document.getElementById("status-select");
      const newStatus = parseInt(select.value, 10);
      if (newStatus === task.status) {
        toast("Görev zaten bu durumda.", "info");
        return;
      }
      try {
        await apiFetch(`/tasks/${task.id}/status`, { method: "PATCH", body: { status: newStatus } });
        toast("Görev durumu güncellendi.", "success");
        reload();
      } catch (err) {
        toast(err.message || "Durum güncellenemedi.", "error");
      }
    });
  }

  await renderCommentsSection(document.getElementById("comments-section"), task);
  await renderTimeLogsSection(document.getElementById("timelog-section"), task);
  await renderHistorySection(document.getElementById("history-section"), task);
}

function canModifyComment(comment) {
  const user = currentUser();
  return !!user && (isAdmin() || user.id === comment.userId);
}

async function renderCommentsSection(container, task) {
  const state = { page: 1, pageSize: 10 };

  container.innerHTML = `
    <div class="card">
      <div class="card-section-title"><h3>Yorumlar</h3></div>
      <form id="comment-form" style="margin-bottom:16px;">
        <div class="form-row">
          <textarea id="comment-content" name="content" placeholder="Bir yorum yazın..." required></textarea>
        </div>
        <div class="form-actions" style="justify-content:flex-start;">
          <button type="submit" class="btn btn-primary btn-sm">Yorum Ekle</button>
        </div>
      </form>
      <div id="comments-list">${loadingHtml()}</div>
      <div id="comments-pagination"></div>
    </div>
  `;

  document.getElementById("comment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      await apiFetch(`/tasks/${task.id}/comments`, { method: "POST", body: { content: form.content.value.trim() } });
      form.reset();
      toast("Yorum eklendi.", "success");
      state.page = 1;
      load();
    } catch (err) {
      toast(err.message || "Yorum eklenemedi.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  await load();

  async function load() {
    const list = document.getElementById("comments-list");
    list.innerHTML = loadingHtml();
    try {
      const result = await apiFetch(`/tasks/${task.id}/comments`, { query: { page: state.page, pageSize: state.pageSize } });
      renderList(list, result);
      renderPagination(document.getElementById("comments-pagination"), result.page, result.totalPages, (p) => {
        state.page = p;
        load();
      });
    } catch (err) {
      list.innerHTML = alertHtml(err.message || "Yorumlar yüklenemedi.");
    }
  }

  function renderList(listEl, result) {
    if (!result.items.length) {
      listEl.innerHTML = emptyStateHtml("Henüz yorum yok.");
      return;
    }
    listEl.innerHTML = result.items
      .map(
        (c) => `
      <div class="comment-item">
        <div class="comment-meta"><strong>${escapeHtml(c.userName)}</strong> &middot; ${formatDateTime(c.createdAt)}${
          c.updatedAt ? " (düzenlendi)" : ""
        }</div>
        <div class="comment-body">${escapeHtml(c.content)}</div>
        ${
          canModifyComment(c)
            ? `<div class="comment-actions">
                 <button type="button" class="edit-comment-btn" data-id="${c.id}">Düzenle</button>
                 <button type="button" class="delete-comment-btn" data-id="${c.id}">Sil</button>
               </div>`
            : ""
        }
      </div>
    `
      )
      .join("");

    listEl.querySelectorAll(".edit-comment-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = result.items.find((c) => c.id === parseInt(btn.getAttribute("data-id"), 10));
        openEditCommentModal(item, load);
      });
    });
    listEl.querySelectorAll(".delete-comment-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
        try {
          await apiFetch(`/comments/${btn.getAttribute("data-id")}`, { method: "DELETE" });
          toast("Yorum silindi.", "success");
          load();
        } catch (err) {
          toast(err.message || "Yorum silinemedi.", "error");
        }
      });
    });
  }
}

function openEditCommentModal(comment, onDone) {
  openModal(
    "Yorumu Düzenle",
    `
    <form id="edit-comment-form">
      <div class="form-row">
        <textarea id="ec-content" name="content" required>${escapeHtml(comment.content)}</textarea>
      </div>
      <div id="edit-comment-alert"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="cancel-edit-comment">Vazgeç</button>
        <button type="submit" class="btn btn-primary">Kaydet</button>
      </div>
    </form>
  `
  );

  document.getElementById("cancel-edit-comment").addEventListener("click", closeModal);
  document.getElementById("edit-comment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const alertBox = document.getElementById("edit-comment-alert");
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      await apiFetch(`/comments/${comment.id}`, { method: "PUT", body: { content: form.content.value.trim() } });
      closeModal();
      toast("Yorum güncellendi.", "success");
      onDone();
    } catch (err) {
      alertBox.innerHTML = alertHtml(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

async function renderTimeLogsSection(container, task) {
  const state = { page: 1, pageSize: 10 };

  container.innerHTML = `
    <div class="card">
      <div class="card-section-title">
        <h3>Zaman Kayıtları</h3>
        <span class="text-muted">Toplam: ${task.actualHours} saat${task.estimatedHours != null ? ` / Tahmini: ${task.estimatedHours} saat` : ""}</span>
      </div>
      <form id="timelog-form" class="form-grid" style="margin-bottom:16px; align-items:end;">
        <div class="form-row">
          <label for="tl-hours">Saat</label>
          <input type="number" id="tl-hours" name="hours" min="0.25" step="0.25" required />
        </div>
        <div class="form-row">
          <label for="tl-date">Çalışma Tarihi</label>
          <input type="date" id="tl-date" name="workDate" required value="${toInputDate(new Date().toISOString())}" />
        </div>
        <div class="form-row" style="grid-column: 1 / -1;">
          <label for="tl-desc">Açıklama</label>
          <input type="text" id="tl-desc" name="description" maxlength="500" />
        </div>
        <div class="form-actions" style="grid-column: 1 / -1; justify-content:flex-start; margin-top:0;">
          <button type="submit" class="btn btn-primary btn-sm">Zaman Kaydı Ekle</button>
        </div>
      </form>
      <div id="timelog-list">${loadingHtml()}</div>
      <div id="timelog-pagination"></div>
    </div>
  `;

  document.getElementById("timelog-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      await apiFetch(`/tasks/${task.id}/time-logs`, {
        method: "POST",
        body: {
          hours: parseFloat(form.hours.value),
          workDate: form.workDate.value,
          description: form.description.value.trim() || null,
        },
      });
      form.reset();
      form.workDate.value = toInputDate(new Date().toISOString());
      toast("Zaman kaydı eklendi.", "success");
      state.page = 1;
      load();
    } catch (err) {
      toast(err.message || "Zaman kaydı eklenemedi.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  await load();

  async function load() {
    const list = document.getElementById("timelog-list");
    list.innerHTML = loadingHtml();
    try {
      const result = await apiFetch("/time-logs", {
        query: { taskId: task.id, page: state.page, pageSize: state.pageSize },
      });
      renderList(list, result);
      renderPagination(document.getElementById("timelog-pagination"), result.page, result.totalPages, (p) => {
        state.page = p;
        load();
      });
    } catch (err) {
      list.innerHTML = alertHtml(err.message || "Zaman kayıtları yüklenemedi.");
    }
  }

  function renderList(listEl, result) {
    if (!result.items.length) {
      listEl.innerHTML = emptyStateHtml("Henüz zaman kaydı yok.");
      return;
    }
    listEl.innerHTML = result.items
      .map(
        (l) => `
      <div class="log-item">
        <div class="log-meta"><strong>${escapeHtml(l.userName)}</strong> &middot; ${formatDate(l.workDate)} &middot; <strong>${l.hours} saat</strong></div>
        ${l.description ? `<div>${escapeHtml(l.description)}</div>` : ""}
      </div>
    `
      )
      .join("");
  }
}

async function renderHistorySection(container, task) {
  const state = { page: 1, pageSize: 10 };

  container.innerHTML = `
    <div class="card">
      <div class="card-section-title"><h3>Görev Geçmişi</h3></div>
      <div id="history-list">${loadingHtml()}</div>
      <div id="history-pagination"></div>
    </div>
  `;

  await load();

  async function load() {
    const list = document.getElementById("history-list");
    list.innerHTML = loadingHtml();
    try {
      const result = await apiFetch(`/tasks/${task.id}/histories`, {
        query: { page: state.page, pageSize: state.pageSize },
      });
      renderList(list, result);
      renderPagination(document.getElementById("history-pagination"), result.page, result.totalPages, (p) => {
        state.page = p;
        load();
      });
    } catch (err) {
      list.innerHTML = alertHtml(err.message || "Geçmiş yüklenemedi.");
    }
  }

  function renderList(listEl, result) {
    if (!result.items.length) {
      listEl.innerHTML = emptyStateHtml("Henüz geçmiş kaydı yok.");
      return;
    }
    listEl.innerHTML = result.items
      .map(
        (h) => `
      <div class="history-item">
        <div class="history-meta"><strong>${escapeHtml(h.changedByUserName)}</strong> &middot; ${formatDateTime(h.createdAt)}</div>
        <div>${escapeHtml(changeTypeLabel(h.changeType))}: <span class="text-muted">${escapeHtml(
          historyValueLabel(h.changeType, h.oldValue)
        )}</span> &rarr; <strong>${escapeHtml(historyValueLabel(h.changeType, h.newValue))}</strong></div>
        ${h.description ? `<div class="text-muted" style="font-size:12px;">${escapeHtml(h.description)}</div>` : ""}
      </div>
    `
      )
      .join("");
  }
}
