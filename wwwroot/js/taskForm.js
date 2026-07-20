import { apiFetch } from "./api.js";
import { openModal, closeModal, toast, alertHtml, showFieldErrors, escapeHtml, TASK_PRIORITIES, toInputDate } from "./utils.js";

async function fetchAssignableOptions(projectId) {
  const [project, membersResult] = await Promise.all([
    apiFetch(`/projects/${projectId}`),
    apiFetch(`/projects/${projectId}/members`, { query: { page: 1, pageSize: 100 } }),
  ]);

  const options = [{ id: project.ownerId, label: `${project.ownerName} (Proje Sahibi)` }];

  membersResult.items
    .filter((m) => m.isActive && m.userId !== project.ownerId)
    .forEach((m) => options.push({ id: m.userId, label: m.userName }));

  return options;
}

function priorityOptions(selected) {
  return Object.entries(TASK_PRIORITIES)
    .map(([v, label]) => `<option value="${v}" ${String(selected) === v ? "selected" : ""}>${label}</option>`)
    .join("");
}

export async function openCreateTaskModal(projectId, onCreated) {
  let assignOptions = [];
  try {
    assignOptions = await fetchAssignableOptions(projectId);
  } catch {
    /* assignment list optional */
  }

  openModal(
    "Yeni Görev",
    `
    <form id="create-task-form">
      <div class="form-row">
        <label for="t-title">Başlık</label>
        <input type="text" id="t-title" name="title" required maxlength="200" />
      </div>
      <div class="form-row">
        <label for="t-desc">Açıklama</label>
        <textarea id="t-desc" name="description"></textarea>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label for="t-priority">Öncelik</label>
          <select id="t-priority" name="priority">${priorityOptions("2")}</select>
        </div>
        <div class="form-row">
          <label for="t-assignee">Atanan Kişi</label>
          <select id="t-assignee" name="assignedToUserId">
            <option value="">Atanmadı</option>
            ${assignOptions.map((o) => `<option value="${o.id}">${escapeHtml(o.label)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label for="t-due">Teslim Tarihi</label>
          <input type="date" id="t-due" name="dueDate" />
        </div>
        <div class="form-row">
          <label for="t-hours">Tahmini Süre (saat)</label>
          <input type="number" id="t-hours" name="estimatedHours" min="0" step="0.5" />
        </div>
      </div>
      <div id="create-task-alert"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="cancel-create-task">Vazgeç</button>
        <button type="submit" class="btn btn-primary">Oluştur</button>
      </div>
    </form>
  `
  );

  document.getElementById("cancel-create-task").addEventListener("click", closeModal);

  const form = document.getElementById("create-task-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById("create-task-alert");
    alertBox.innerHTML = "";
    form.querySelectorAll(".field-error").forEach((n) => n.remove());

    const dto = {
      title: form.title.value.trim(),
      description: form.description.value.trim() || null,
      projectId: parseInt(projectId, 10),
      priority: parseInt(form.priority.value, 10),
      assignedToUserId: form.assignedToUserId.value ? parseInt(form.assignedToUserId.value, 10) : null,
      dueDate: form.dueDate.value || null,
      estimatedHours: form.estimatedHours.value ? parseFloat(form.estimatedHours.value) : null,
    };

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      const created = await apiFetch("/tasks", { method: "POST", body: dto });
      closeModal();
      toast("Görev oluşturuldu.", "success");
      if (onCreated) onCreated(created);
    } catch (err) {
      alertBox.innerHTML = alertHtml(err.message);
      if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

export async function openEditTaskModal(task, onUpdated) {
  let assignOptions = [];
  try {
    assignOptions = await fetchAssignableOptions(task.projectId);
  } catch {
    /* assignment list optional */
  }

  openModal(
    "Görevi Düzenle",
    `
    <form id="edit-task-form">
      <div class="form-row">
        <label for="et-title">Başlık</label>
        <input type="text" id="et-title" name="title" required maxlength="200" value="${escapeHtml(task.title)}" />
      </div>
      <div class="form-row">
        <label for="et-desc">Açıklama</label>
        <textarea id="et-desc" name="description">${escapeHtml(task.description || "")}</textarea>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label for="et-priority">Öncelik</label>
          <select id="et-priority" name="priority">${priorityOptions(String(task.priority))}</select>
        </div>
        <div class="form-row">
          <label for="et-assignee">Atanan Kişi</label>
          <select id="et-assignee" name="assignedToUserId">
            <option value="">Atanmadı</option>
            ${assignOptions
              .map(
                (o) =>
                  `<option value="${o.id}" ${task.assignedToUserId === o.id ? "selected" : ""}>${escapeHtml(o.label)}</option>`
              )
              .join("")}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label for="et-due">Teslim Tarihi</label>
          <input type="date" id="et-due" name="dueDate" value="${toInputDate(task.dueDate)}" />
        </div>
        <div class="form-row">
          <label for="et-hours">Tahmini Süre (saat)</label>
          <input type="number" id="et-hours" name="estimatedHours" min="0" step="0.5" value="${task.estimatedHours ?? ""}" />
        </div>
      </div>
      <div id="edit-task-alert"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="cancel-edit-task">Vazgeç</button>
        <button type="submit" class="btn btn-primary">Kaydet</button>
      </div>
    </form>
  `
  );

  document.getElementById("cancel-edit-task").addEventListener("click", closeModal);

  const form = document.getElementById("edit-task-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById("edit-task-alert");
    alertBox.innerHTML = "";
    form.querySelectorAll(".field-error").forEach((n) => n.remove());

    const dto = {
      title: form.title.value.trim(),
      description: form.description.value.trim() || null,
      priority: parseInt(form.priority.value, 10),
      assignedToUserId: form.assignedToUserId.value ? parseInt(form.assignedToUserId.value, 10) : null,
      dueDate: form.dueDate.value || null,
      estimatedHours: form.estimatedHours.value ? parseFloat(form.estimatedHours.value) : null,
    };

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    try {
      const updated = await apiFetch(`/tasks/${task.id}`, { method: "PUT", body: dto });
      closeModal();
      toast("Görev güncellendi.", "success");
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      alertBox.innerHTML = alertHtml(err.message);
      if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
