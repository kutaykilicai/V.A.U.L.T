const express = require("express");
const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3847;
const scans = new Map();

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

function normalizePath(input) {
  if (typeof input !== "string" || !input.trim()) {
    throw Object.assign(new Error("Path is required."), { status: 400 });
  }
  const resolved = path.resolve(input.trim());
  if (!path.isAbsolute(resolved)) {
    throw Object.assign(new Error("Path must be absolute."), { status: 400 });
  }
  return resolved;
}

function listDrives() {
  if (process.platform !== "win32") return [os.homedir()];
  const found = [];
  for (let i = 65; i <= 90; i += 1) {
    const root = `${String.fromCharCode(i)}:\\`;
    try {
      fs.accessSync(root);
      found.push(root);
    } catch {
      /* empty */
    }
  }
  return found.length ? found : [os.homedir()];
}

async function safeStat(target) {
  try {
    return await fsp.lstat(target);
  } catch (err) {
    return { error: err.code || err.message };
  }
}

async function scanTree(root, signal, onProgress) {
  const skipped = [];
  let files = 0;
  let folders = 0;
  let visited = 0;

  async function walk(current) {
    if (signal.aborted) {
      const abort = new Error("Scan stopped.");
      abort.code = "STOPPED";
      throw abort;
    }
    visited += 1;
    if (visited % 40 === 0) onProgress({ current, visited, files, folders });

    const st = await safeStat(current);
    if (st.error) {
      skipped.push({ path: current, reason: st.error });
      return {
        name: path.basename(current) || current,
        path: current,
        kind: "unknown",
        size: 0,
        files: 0,
        folders: 0,
        mtime: null,
        children: [],
      };
    }
    if (st.isSymbolicLink()) {
      skipped.push({ path: current, reason: "symlink" });
      return {
        name: path.basename(current) || current,
        path: current,
        kind: "link",
        size: 0,
        files: 0,
        folders: 0,
        mtime: st.mtimeMs,
        children: [],
      };
    }
    if (st.isFile()) {
      files += 1;
      return {
        name: path.basename(current),
        path: current,
        kind: "file",
        size: st.size,
        files: 1,
        folders: 0,
        mtime: st.mtimeMs,
        children: [],
      };
    }
    if (!st.isDirectory()) {
      return {
        name: path.basename(current) || current,
        path: current,
        kind: "other",
        size: st.size || 0,
        files: 0,
        folders: 0,
        mtime: st.mtimeMs,
        children: [],
      };
    }

    folders += 1;
    let entries = [];
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch (err) {
      skipped.push({ path: current, reason: err.code || err.message });
      return {
        name: path.basename(current) || current,
        path: current,
        kind: "dir",
        size: 0,
        files: 0,
        folders: 0,
        mtime: st.mtimeMs,
        children: [],
      };
    }

    const children = [];
    for (const entry of entries) {
      children.push(await walk(path.join(current, entry.name)));
    }
    children.sort((a, b) => b.size - a.size);
    const size = children.reduce((sum, child) => sum + child.size, 0);
    const fileCount = children.reduce((sum, child) => sum + child.files, 0);
    const folderCount = children.reduce(
      (sum, child) => sum + (child.kind === "dir" ? 1 + child.folders : 0),
      0
    );
    return {
      name: path.basename(current) || current,
      path: current,
      kind: "dir",
      size,
      files: fileCount,
      folders: folderCount,
      mtime: st.mtimeMs,
      children,
    };
  }

  const tree = await walk(root);
  onProgress({ current: root, visited, files, folders, done: true });
  return { tree, skipped, files, folders, visited };
}

app.get("/api/roots", (_req, res) => {
  res.json({
    home: os.homedir(),
    drives: listDrives(),
  });
});

app.get("/api/ls", async (req, res) => {
  try {
    const dir = normalizePath(req.query.path || os.homedir());
    const st = await fsp.stat(dir);
    if (!st.isDirectory()) {
      return res.status(400).json({ error: "Not a directory." });
    }
    const names = await fsp.readdir(dir, { withFileTypes: true });
    const dirs = names
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        path: path.join(dir, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ path: dir, parent: path.dirname(dir), dirs });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/scan", async (req, res) => {
  let root;
  try {
    root = normalizePath(req.body && req.body.path);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ac = new AbortController();
  scans.set(id, ac);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  const write = (obj) => {
    if (!res.writableEnded) res.write(`${JSON.stringify(obj)}\n`);
  };

  try {
    const started = Date.now();
    write({ type: "start", id, path: root });
    const result = await scanTree(root, ac.signal, (progress) => {
      write({ type: "progress", ...progress });
    });
    write({
      type: "result",
      elapsedMs: Date.now() - started,
      ...result,
    });
  } catch (err) {
    write({
      type: "error",
      error: err.code === "STOPPED" ? "Scan stopped." : err.message,
      stopped: err.code === "STOPPED",
    });
  } finally {
    scans.delete(id);
    res.end();
  }
});

app.post("/api/stop", (req, res) => {
  const id = req.body && req.body.id;
  const ac = scans.get(id);
  if (ac) ac.abort();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  process.stdout.write(`Massif on http://127.0.0.1:${PORT}\n`);
});
