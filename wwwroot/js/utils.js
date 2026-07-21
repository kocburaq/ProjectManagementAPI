export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toInputDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export const USER_ROLES = { 1: "Admin", 2: "Proje Yöneticisi", 3: "Ekip Üyesi" };
export const PROJECT_STATUSES = { 1: "Planlama", 2: "Aktif", 3: "Beklemede", 4: "Tamamlandı", 5: "İptal Edildi" };
export const TASK_STATUSES = { 1: "Yapılacak", 2: "Devam Ediyor", 3: "İncelemede", 4: "Tamamlandı" };
export const TASK_PRIORITIES = { 1: "Düşük", 2: "Orta", 3: "Yüksek", 4: "Kritik" };
export const MEMBER_ROLES = { 1: "Üye", 2: "Katkıda Bulunan", 3: "İzleyici" };
export const CHANGE_TYPES = {
  1: "Durum Değişikliği",
  2: "Atama Değişikliği",
  3: "Öncelik Değişikliği",
  4: "Güncelleme",
};

const TASK_STATUS_NAME_LABEL = { Todo: "Yapılacak", InProgress: "Devam Ediyor", InReview: "İncelemede", Done: "Tamamlandı" };
const TASK_PRIORITY_NAME_LABEL = { Low: "Düşük", Medium: "Orta", High: "Yüksek", Critical: "Kritik" };

export function historyValueLabel(changeType, raw) {
  if (raw === null || raw === undefined || raw === "") return "-";
  if (changeType === 1 && TASK_STATUS_NAME_LABEL[raw]) return TASK_STATUS_NAME_LABEL[raw];
  if (changeType === 3 && TASK_PRIORITY_NAME_LABEL[raw]) return TASK_PRIORITY_NAME_LABEL[raw];
  return raw;
}

export const roleLabel = (v) => USER_ROLES[v] || v;
export const projectStatusLabel = (v) => PROJECT_STATUSES[v] || v;
export const taskStatusLabel = (v) => TASK_STATUSES[v] || v;
export const taskPriorityLabel = (v) => TASK_PRIORITIES[v] || v;
export const memberRoleLabel = (v) => MEMBER_ROLES[v] || v;
export const changeTypeLabel = (v) => CHANGE_TYPES[v] || v;

const PROJECT_STATUS_CLASS = { 1: "badge-gray", 2: "badge-blue", 3: "badge-amber", 4: "badge-green", 5: "badge-red" };
export function projectStatusBadge(v) {
  return `<span class="badge ${PROJECT_STATUS_CLASS[v] || "badge-gray"}">${escapeHtml(projectStatusLabel(v))}</span>`;
}

const TASK_STATUS_CLASS = { 1: "badge-gray", 2: "badge-blue", 3: "badge-amber", 4: "badge-green" };
export function taskStatusBadge(v) {
  return `<span class="badge ${TASK_STATUS_CLASS[v] || "badge-gray"}">${escapeHtml(taskStatusLabel(v))}</span>`;
}

const PRIORITY_CLASS = { 1: "badge-gray", 2: "badge-blue", 3: "badge-amber", 4: "badge-red" };
export function taskPriorityBadge(v) {
  return `<span class="badge ${PRIORITY_CLASS[v] || "badge-gray"}">${escapeHtml(taskPriorityLabel(v))}</span>`;
}

export function memberRoleBadge(v) {
  return `<span class="badge badge-gray">${escapeHtml(memberRoleLabel(v))}</span>`;
}

export function roleBadge(v) {
  return `<span class="badge badge-blue">${escapeHtml(roleLabel(v))}</span>`;
}

let toastTimer = null;
export function toast(message, type = "info") {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 3500);
}

export function openModal(titleText, bodyHtml) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.id = "modal-overlay";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${escapeHtml(titleText)}</h3>
        <button class="modal-close" id="modal-close-btn" type="button">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.getElementById("modal-close-btn").addEventListener("click", closeModal);
  return overlay.querySelector(".modal-body");
}

export function closeModal() {
  const existing = document.getElementById("modal-overlay");
  if (existing) existing.remove();
}

export function renderPagination(container, page, totalPages, onChange) {
  if (!container) return;
  if (!totalPages || totalPages <= 1) {
    container.innerHTML = "";
    return;
  }
  const prevDisabled = page <= 1 ? "disabled" : "";
  const nextDisabled = page >= totalPages ? "disabled" : "";
  container.innerHTML = `
    <div class="pagination">
      <button type="button" class="btn btn-ghost btn-sm" data-page="${page - 1}" ${prevDisabled}>&laquo; Önceki</button>
      <span class="pagination-info">Sayfa ${page} / ${totalPages}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-page="${page + 1}" ${nextDisabled}>Sonraki &raquo;</button>
    </div>
  `;
  container.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      onChange(parseInt(btn.getAttribute("data-page"), 10));
    });
  });
}

// Bitiş tarihi inputunun takviminde başlangıçtan önceki günleri seçilemez yapar.
// Başlangıç sonradan değişip mevcut bitiş tarihini geçersiz kılarsa bitişi temizler.
export function linkDateRange(startInput, endInput) {
  if (!startInput || !endInput) return;

  const sync = () => {
    if (startInput.value) {
      endInput.min = startInput.value;
      if (endInput.value && endInput.value < startInput.value) {
        endInput.value = "";
      }
    } else {
      endInput.removeAttribute("min");
    }
  };

  // Takvimde min'in altındaki günler tarayıcıya göre yine de tıklanabiliyor;
  // bitiş alanı değiştiği anda burada da kontrol edip anında geri alıyoruz.
  const guardEnd = () => {
    if (startInput.value && endInput.value && endInput.value < startInput.value) {
      endInput.value = "";
      toast("Bitiş tarihi başlangıç tarihinden önce olamaz.", "error");
    }
  };

  sync();
  startInput.addEventListener("change", sync);
  endInput.addEventListener("change", guardEnd);
}

export function showFieldErrors(formEl, fieldErrors) {
  if (!fieldErrors) return;
  Object.entries(fieldErrors).forEach(([field, msgs]) => {
    const list = Array.isArray(msgs) ? msgs : [msgs];
    const input = formEl.querySelector(`[name="${field}"], [name="${field.charAt(0).toLowerCase()}${field.slice(1)}"]`);
    if (!input) return;
    const err = document.createElement("div");
    err.className = "field-error";
    err.textContent = list.join(", ");
    input.insertAdjacentElement("afterend", err);
  });
}

export function loadingHtml(text = "Yükleniyor...") {
  return `<div class="spinner-wrap">${escapeHtml(text)}</div>`;
}

export function emptyStateHtml(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

export function alertHtml(message, type = "error") {
  return `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}
