const routes = [];

export function route(pattern, handler) {
  const paramNames = [];
  const regexStr =
    "^" +
    pattern
      .split("/")
      .map((segment) => {
        if (segment.startsWith(":")) {
          paramNames.push(segment.slice(1));
          return "([^/]+)";
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/") +
    "$";
  routes.push({ regex: new RegExp(regexStr), paramNames, handler });
}

function currentHashPath() {
  const hash = location.hash || "#/";
  return hash.slice(1) || "/";
}

let appEl = null;
let notFoundHandler = null;

async function render() {
  const full = currentHashPath();
  const [path, search = ""] = full.split("?");
  const query = Object.fromEntries(new URLSearchParams(search));

  for (const r of routes) {
    const match = path.match(r.regex);
    if (match) {
      const params = {};
      r.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      appEl.innerHTML = "";
      try {
        await r.handler(appEl, params, query);
      } catch (err) {
        appEl.innerHTML = `<div class="alert alert-error">${(err && err.message) || "Bir hata oluştu."}</div>`;
      }
      window.scrollTo(0, 0);
      return;
    }
  }

  if (notFoundHandler) notFoundHandler(appEl);
}

export function start(mountEl, onNotFound) {
  appEl = mountEl;
  notFoundHandler = onNotFound;
  window.addEventListener("hashchange", render);
  render();
}

export function navigate(path) {
  location.hash = "#" + path;
}

export function rerender() {
  render();
}
