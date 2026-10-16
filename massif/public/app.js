const pathInput = document.querySelector("#path");
const unitSelect = document.querySelector("#unit");
const emptySelect = document.querySelector("#empty-folders");
const scanBtn = document.querySelector("#scan");
const stopBtn = document.querySelector("#stop");
const csvBtn = document.querySelector("#export-csv");
const htmlBtn = document.querySelector("#export-html");
const shaft = document.querySelector("#shaft");
const empty = document.querySelector("#empty");
const grid = document.querySelector("#grid");
const tbody = grid.querySelector("tbody");
const statusLeft = document.querySelector("#status-left");
const statusRight = document.querySelector("#status-right");
const canvas = document.querySelector("#treemap");
const cutHint = document.querySelector("#cut-hint");

const UNITS = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };

let scanId = null;
let abortFetch = null;
let root = null;
let current = null;
let trail = [];
let sortKey = "size";
let sortDir = -1;

function formatSize(bytes) {
  const unit = unitSelect.value;
  if (unit !== "auto") {
    return `${(bytes / UNITS[unit]).toLocaleString("tr-TR", {
      maximumFractionDigits: 2,
    })} ${unit}`;
  }
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
}

function folderIcon() {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 4.5h4l1.2 1.4H14.5v7.1H1.5V4.5Z" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 6.2h13" stroke="currentColor" stroke-width="1.2"/></svg>`;
}

function fileIcon() {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 2.5h5.2L12.5 6v7.5H4V2.5Z" stroke="currentColor" stroke-width="1.2"/><path d="M9.2 2.5V6H12.5" stroke="currentColor" stroke-width="1.2"/></svg>`;
}

function visibleChildren(node) {
  const hideEmpty = emptySelect.value === "hide";
  const kids = (node.children || []).filter((child) => {
    if (hideEmpty && child.kind === "dir" && child.size === 0) return false;
    return true;
  });
  kids.sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (sortKey === "name") return String(av).localeCompare(String(bv), "tr") * sortDir;
    if (sortKey === "percent") {
      const parent = current.size || 1;
      return (a.size / parent - b.size / parent) * sortDir;
    }
    return (av - bv) * sortDir;
  });
  return kids;
}

function setBusy(busy) {
  scanBtn.disabled = busy;
  stopBtn.disabled = !busy;
  pathInput.disabled = busy;
}

function renderShaft() {
  shaft.hidden = trail.length === 0;
  shaft.replaceChildren();
  trail.forEach((node, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = node.name || node.path;
    btn.addEventListener("click", () => {
      trail = trail.slice(0, index + 1);
      current = node;
      render();
    });
    shaft.append(btn);
  });
}

function renderTable() {
  if (!current) {
    empty.hidden = false;
    grid.hidden = true;
    csvBtn.disabled = true;
    htmlBtn.disabled = true;
    return;
  }
  empty.hidden = true;
  grid.hidden = false;
  csvBtn.disabled = false;
  htmlBtn.disabled = false;
  const kids = visibleChildren(current);
  const total = current.size || 1;
  tbody.replaceChildren();
  kids.forEach((child) => {
    const tr = document.createElement("tr");
    const pct = (child.size / total) * 100;
    tr.setAttribute("role", "button");
    tr.tabIndex = 0;
    tr.innerHTML = `
      <td><span class="name">${child.kind === "dir" ? folderIcon() : fileIcon()}<span></span></span></td>
      <td>${formatSize(child.size)}</td>
      <td><span class="bar"><i style="width:${Math.min(100, pct)}%"></i></span>${pct.toFixed(1)}%</td>
      <td>${child.files.toLocaleString("tr-TR")}</td>
      <td>${child.folders.toLocaleString("tr-TR")}</td>
    `;
    tr.querySelector(".name span").textContent = child.name;
    const openChild = () => {
      if (child.kind !== "dir" || !child.children) return;
      trail.push(child);
      current = child;
      render();
    };
    tr.addEventListener("click", openChild);
    tr.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openChild();
      }
    });
    tbody.append(tr);
  });
}

function squarify(items, x, y, w, h) {
  const rects = [];
  const total = items.reduce((s, it) => s + it.size, 0) || 1;
  let rest = items.slice();
  let cx = x;
  let cy = y;
  let cw = w;
  let ch = h;
  while (rest.length) {
    const vertical = cw >= ch;
    const side = vertical ? ch : cw;
    const group = [rest.shift()];
    let gsum = group[0].size;
    while (rest.length) {
      const next = rest[0];
      const trial = gsum + next.size;
      const worst = (size) => {
        const len = (size / total) * (vertical ? cw : ch);
        const other = side * (size / trial);
        return Math.max(len / other, other / Math.max(len, 0.001));
      };
      if (worst(trial) <= worst(gsum)) {
        group.push(rest.shift());
        gsum = trial;
      } else break;
    }
    const span = (gsum / total) * (vertical ? cw : ch);
    let offset = 0;
    group.forEach((item) => {
      const slice = (item.size / gsum) * side;
      rects.push(
        vertical
          ? { ...item, x: cx, y: cy + offset, w: span, h: slice }
          : { ...item, x: cx + offset, y: cy, w: slice, h: span }
      );
      offset += slice;
    });
    if (vertical) {
      cx += span;
      cw -= span;
    } else {
      cy += span;
      ch -= span;
    }
  }
  return rects;
}

function renderTreemap() {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 1;
  const height = canvas.clientHeight || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#161410";
  ctx.fillRect(0, 0, width, height);
  if (!current) {
    cutHint.textContent = "";
    return;
  }
  const kids = visibleChildren(current).filter((child) => child.size > 0);
  cutHint.textContent = current.path;
  if (!kids.length) return;
  const rects = squarify(kids, 1, 1, width - 2, height - 2);
  rects.forEach((rect, i) => {
    const t = 0.22 + (i % 7) * 0.08;
    ctx.fillStyle = `rgba(212,120,58,${t})`;
    ctx.fillRect(rect.x, rect.y, Math.max(0, rect.w - 1), Math.max(0, rect.h - 1));
    if (rect.w > 64 && rect.h > 22) {
      ctx.fillStyle = "#ece6d8";
      ctx.font = "12px Segoe UI";
      ctx.fillText(rect.name.slice(0, 28), rect.x + 8, rect.y + 16);
      ctx.fillStyle = "#b7ae9c";
      ctx.fillText(formatSize(rect.size), rect.x + 8, rect.y + 32);
    }
  });
  canvas.onclick = (event) => {
    const box = canvas.getBoundingClientRect();
    const px = event.clientX - box.left;
    const py = event.clientY - box.top;
    const hit = rects.find(
      (rect) => px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h
    );
    if (hit && hit.kind === "dir") {
      trail.push(hit);
      current = hit;
      render();
    }
  };
}

function render() {
  renderShaft();
  renderTable();
  renderTreemap();
}

function download(name, mime, text) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function rowsFrom(node, acc = []) {
  (node.children || []).forEach((child) => {
    acc.push(child);
    if (child.kind === "dir") rowsFrom(child, acc);
  });
  return acc;
}

async function startScan(event) {
  event.preventDefault();
  const target = pathInput.value.trim();
  if (!target) {
    statusLeft.textContent = "Bir yol yaz.";
    statusLeft.classList.add("error");
    return;
  }
  statusLeft.classList.remove("error");
  setBusy(true);
  abortFetch = new AbortController();
  root = null;
  current = null;
  trail = [];
  render();
  let lastProgress = Date.now();
  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: target }),
      signal: abortFetch.signal,
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = JSON.parse(line);
        if (msg.type === "start") scanId = msg.id;
        if (msg.type === "progress") {
          if (Date.now() - lastProgress > 80) {
            statusLeft.textContent = `Taranıyor · ${msg.visited || 0} öğe`;
            statusRight.textContent = msg.current || "";
            lastProgress = Date.now();
          }
        }
        if (msg.type === "result") {
          root = msg.tree;
          current = msg.tree;
          trail = [msg.tree];
          const skipped = msg.skipped.length;
          statusLeft.textContent = `Bitti · ${formatSize(msg.tree.size)} · ${msg.files} dosya · ${msg.folders} klasör · ${skipped} atlandı · ${(msg.elapsedMs / 1000).toFixed(1)}s`;
          statusRight.textContent = msg.tree.path;
          render();
        }
        if (msg.type === "error") {
          statusLeft.textContent = msg.error;
          statusLeft.classList.toggle("error", !msg.stopped);
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      statusLeft.textContent = err.message;
      statusLeft.classList.add("error");
    }
  } finally {
    setBusy(false);
    scanId = null;
    abortFetch = null;
  }
}

document.querySelector("#scan-form").addEventListener("submit", startScan);

stopBtn.addEventListener("click", async () => {
  if (scanId) await fetch("/api/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: scanId }) });
  abortFetch?.abort();
});

unitSelect.addEventListener("change", render);
emptySelect.addEventListener("change", render);
window.addEventListener("resize", renderTreemap);

grid.querySelectorAll("th").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    if (sortKey === key) sortDir *= -1;
    else {
      sortKey = key;
      sortDir = key === "name" ? 1 : -1;
    }
    render();
  });
});

csvBtn.addEventListener("click", () => {
  if (!root) return;
  const lines = ["path,kind,size,files,folders"];
  rowsFrom(root).forEach((row) => {
    lines.push(`"${row.path.replaceAll('"', '""')}",${row.kind},${row.size},${row.files},${row.folders}`);
  });
  download("massif.csv", "text/csv", lines.join("\n"));
});

htmlBtn.addEventListener("click", () => {
  if (!root) return;
  const rows = rowsFrom(root)
    .slice(0, 4000)
    .map(
      (row) =>
        `<tr><td>${row.path}</td><td>${row.kind}</td><td>${formatSize(row.size)}</td></tr>`
    )
    .join("");
  download(
    "massif.html",
    "text/html",
    `<!doctype html><title>Massif</title><table border="1"><tr><th>Yol</th><th>Tür</th><th>Boyut</th></tr>${rows}</table>`
  );
});

fetch("/api/roots")
  .then((r) => r.json())
  .then((data) => {
    pathInput.value = data.home;
    pathInput.placeholder = data.drives[0] || data.home;
  })
  .catch(() => {
    pathInput.placeholder = "C:\\\\Users\\\\...";
  });
