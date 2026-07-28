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
  taskStatusBadge,
  taskPriorityBadge,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "../utils.js";
import { isAdminOrPM, canManageProject } from "../auth.js";
import { openCreateTaskModal } from "../taskForm.js";

const state = {
  page: 1,
  pageSize: 10,
  projectId: "",
  status: "",
  priority: "",
  dueBefore: "",
  dueAfter: "",
  sortBy: "createdAt",
  sortDirection: "desc",
};

export async function renderTasks(el) {
  let projectOptions = [];
  try {
    const projects = await apiFetch("/projects", { query: { page: 1, pageSize: 100 } });
    projectOptions = projects.items;
  } catch {
    /* filter dropdown becomes empty; list still works */
  }

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h2 style="color: #ffc107; text-shadow: 0 0 15px rgba(255, 193, 7, 0.3); text-transform: uppercase; letter-spacing: 1px;">⚡ Görevler</h2>
        <div class="page-subtitle">Erişebildiğiniz projelerdeki tüm görevler.</div>
      </div>
      <div class="page-actions">
        ${isAdminOrPM() ? '<button id="new-task-btn" class="btn btn-primary" type="button">⚡ Yeni Görev</button>' : ""}
      </div>
    </div>
    <div class="filters">
      <div class="form-row">
        <label>Proje</label>
        <select id="filter-project">
          <option value="">Tümü</option>
          ${projectOptions.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}
        </select>
      </div>
      <div class="form-row">
        <label>Durum</label>
        <select id="filter-status">
          <option value="">Tümü</option>
          ${Object.entries(TASK_STATUSES).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}
        </select>
      </div>
      <div class="form-row">
        <label>Öncelik</label>
        <select id="filter-priority">
          <option value="">Tümü</option>
          ${Object.entries(TASK_PRIORITIES).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}
        </select>
      </div>
      <div class="form-row">
        <label>Teslim sonrası</label>
        <input type="date" id="filter-due-after" />
      </div>
      <div class="form-row">
        <label>Teslim öncesi</label>
        <input type="date" id="filter-due-before" />
      </div>
      <div class="form-row">
        <label>Sırala</label>
        <select id="filter-sort">
          <option value="createdAt">Oluşturulma</option>
          <option value="duedate">Teslim tarihi</option>
          <option value="priority">Öncelik</option>
          <option value="status">Durum</option>
          <option value="title">Başlık</option>
        </select>
      </div>
    </div>
    <div id="tasks-content">${loadingHtml()}</div>
    <div id="tasks-pagination"></div>
  `;

  const filterProject = document.getElementById("filter-project");
  const filterStatus = document.getElementById("filter-status");
  const filterPriority = document.getElementById("filter-priority");
  const filterDueAfter = document.getElementById("filter-due-after");
  const filterDueBefore = document.getElementById("filter-due-before");
  const filterSort = document.getElementById("filter-sort");

  filterProject.value = state.projectId;
  filterStatus.value = state.status;
  filterPriority.value = state.priority;
  filterDueAfter.value = state.dueAfter;
  filterDueBefore.value = state.dueBefore;
  filterSort.value = state.sortBy;

  filterProject.addEventListener("change", (e) => {
    state.projectId = e.target.value;
    state.page = 1;
    load();
  });
  filterStatus.addEventListener("change", (e) => {
    state.status = e.target.value;
    state.page = 1;
    load();
  });
  filterPriority.addEventListener("change", (e) => {
    state.priority = e.target.value;
    state.page = 1;
    load();
  });
  filterDueAfter.addEventListener("change", (e) => {
    state.dueAfter = e.target.value;
    state.page = 1;
    load();
  });
  filterDueBefore.addEventListener("change", (e) => {
    state.dueBefore = e.target.value;
    state.page = 1;
    load();
  });
  filterSort.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    load();
  });

  if (isAdminOrPM()) {
    document.getElementById("new-task-btn").addEventListener("click", () => startCreateFlow(projectOptions));
  }

  await load();

  async function load() {
    const content = document.getElementById("tasks-content");
    content.innerHTML = loadingHtml();
    try {
      const result = await apiFetch("/tasks", {
        query: {
          page: state.page,
          pageSize: state.pageSize,
          projectId: state.projectId || undefined,
          status: state.status || undefined,
          priority: state.priority || undefined,
          dueBefore: state.dueBefore || undefined,
          dueAfter: state.dueAfter || undefined,
          sortBy: state.sortBy,
          sortDirection: state.sortDirection,
        },
      });
      renderTable(content, result);
      renderPagination(document.getElementById("tasks-pagination"), result.page, result.totalPages, (p) => {
        state.page = p;
        load();
      });
    } catch (err) {
      content.innerHTML = alertHtml(err.message || "Görevler yüklenemedi.");
    }
  }

  function renderTable(container, result) {
    if (!result.items.length) {
      container.innerHTML = emptyStateHtml("Bu filtrelerle eşleşen görev yok.");
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Görev</th><th>Durum</th><th>Öncelik</th><th>Atanan</th><th>Teslim</th><th>Gerçekleşen / Tahmini</th><th></th></tr>
          </thead>
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
                <td class="nowrap">${t.actualHours}h / ${t.estimatedHours ?? "-"}h</td>
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

  async function startCreateFlow(preloadedProjects) {
    let projects = preloadedProjects;
    if (!projects || !projects.length) {
      try {
        const result = await apiFetch("/projects", { query: { page: 1, pageSize: 100 } });
        projects = result.items;
      } catch {
        projects = [];
      }
    }

    const manageable = projects.filter((p) => canManageProject(p) && !p.isArchived);

    if (!manageable.length) {
      toast("Görev oluşturabileceğiniz bir proje bulunamadı.", "error");
      return;
    }

    if (manageable.length === 1) {
      openCreateTaskModal(manageable[0].id, () => load());
      return;
    }

    openModal(
      "Proje Seçin",
      `
      <form id="pick-project-form">
        <div class="form-row">
          <label for="pp-project">Görev hangi projede oluşturulacak?</label>
          <select id="pp-project" name="projectId" required>
            ${manageable.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="cancel-pick-project">Vazgeç</button>
          <button type="submit" class="btn btn-primary">Devam Et</button>
        </div>
      </form>
    `
    );

    document.getElementById("cancel-pick-project").addEventListener("click", closeModal);
    document.getElementById("pick-project-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const projectId = parseInt(e.target.projectId.value, 10);
      closeModal();
      openCreateTaskModal(projectId, () => load());
    });
  }
}
