/**
 * Workflow Loader (orion4D) — Frontend
 * Ajustement cosmétique: centrage vertical des champs via widgets_start_y
 * + computeSize() après création/ajout.
 */

import { app } from "/scripts/app.js";

// Utils
function getWidget(node, name) { return node.widgets?.find(w => w.name === name); }
function getValue(node, name) { const w = getWidget(node, name); return w ? w.value : undefined; }
function setStatus(node, txt) {
  let w = getWidget(node, "Status");
  if (!w) w = node.addWidget("text", "Status", "", null, { serialize: false });
  w.value = String(txt ?? "");
}

// Chargement principal
async function runLoader(node) {
  try {
    const mode = getValue(node, "merge_mode") || "Add workflow";
    const rel = getValue(node, "workflow_file");
    if (!rel || rel === "—") { setStatus(node, "Aucun fichier sélectionné."); return; }

    setStatus(node, "Chargement…");
    const res = await fetch(`/orion4d/workflow?rel=${encodeURIComponent(rel)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
    const data = await res.json();
    if (!data?.workflow) { setStatus(node, "Workflow non trouvé dans le fichier."); return; }

    injectWorkflow(node, data.workflow, mode);
    setStatus(node, `Chargé: ${data.name}`);
  } catch (e) {
    console.error("[orion4D] Erreur de chargement:", e);
    setStatus(node, `Erreur: ${e.message}`);
  }
}

// Injection / fusion
function injectWorkflow(node, wf, mode) {
  if (mode === "remplacement") {
    // mode non exposé, gardé pour compat éventuelle
    const keep = node.serialize();
    app.graph.clear();
    app.graph.configure(wf);
    try {
      const newNode = LiteGraph.createNode(keep.type);
      if (newNode) { newNode.configure(keep); app.graph.add(newNode); }
    } catch (e) { console.warn("[orion4D] Réinjection du loader échouée:", e); }
  } else if (mode === "new canvas") {
    app.loadGraphData(wf, true);
  } else if (mode === "Add workflow") {
    const currentGraphData = app.graph.serialize();
    const newWfData = JSON.parse(JSON.stringify(wf));

    const PADDING = 50;
    const loaderPos = node.pos;
    const loaderSize = node.size;
    const targetPos = [loaderPos[0] + loaderSize[0] + PADDING, loaderPos[1]];

    let minX = Infinity, minY = Infinity;
    (newWfData.nodes || []).forEach(n => { if (n?.pos) { if (n.pos[0] < minX) minX = n.pos[0]; if (n.pos[1] < minY) minY = n.pos[1]; } });
    (newWfData.groups || []).forEach(g => { if (g?.bounding) { if (g.bounding[0] < minX) minX = g.bounding[0]; if (g.bounding[1] < minY) minY = g.bounding[1]; } });
    if (minX === Infinity) { minX = 0; minY = 0; }

    const dx = targetPos[0] - minX;
    const dy = targetPos[1] - minY;

    (newWfData.nodes || []).forEach(n => { if (n?.pos) { n.pos[0] += dx; n.pos[1] += dy; } });
    (newWfData.groups || []).forEach(g => { if (g?.bounding) { g.bounding[0] += dx; g.bounding[1] += dy; } });

    currentGraphData.nodes.push(...(newWfData.nodes || []));
    currentGraphData.links.push(...(newWfData.links || []));
    currentGraphData.groups.push(...(newWfData.groups || []));

    if (newWfData.extra) { currentGraphData.extra ||= {}; Object.assign(currentGraphData.extra, newWfData.extra); }
    if (newWfData.definitions) { currentGraphData.definitions ||= {}; Object.assign(currentGraphData.definitions, newWfData.definitions); }

    app.graph.configure(currentGraphData);
  }
  app.graph.setDirtyCanvas(true, true);
}

// Sélecteur de fichier
function createModal() {
  const id = "orion4d-wf-modal";
  document.getElementById(id)?.remove();
  const c = document.createElement("div");
  c.id = id;
  c.innerHTML = `
  <style>
  #${id}{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.8);z-index:1001;display:flex;align-items:center;justify-content:center}
  #${id} .modal-content{background:#282828;border:1px solid #444;border-radius:8px;padding:20px;width:90%;max-width:600px;max-height:80vh;display:flex;flex-direction:column}
  #${id} h3{margin-top:0;padding-bottom:10px;border-bottom:1px solid #333}
  #${id} .tree-container{overflow-y:auto;flex-grow:1}
  #${id} ul{list-style:none;padding-left:18px}
  #${id} li{cursor:pointer;padding:3px 0}
  #${id} .dir>span:before{content:'📁 ';font-size:.9em}
  #${id} .file:before{content:'📄 ';font-size:.9em}
  #${id} .dir.open>span:before{content:'📂 ';font-size:.9em}
  #${id} .dir>ul{display:none}
  #${id} .dir.open>ul{display:block}
  #${id} .file:hover{color:#5f5}
  </style>
  <div class="modal-content"><h3>Select Workflow</h3><div class="tree-container"></div></div>`;
  document.body.appendChild(c);
  c.addEventListener("click", () => c.remove());
  c.querySelector(".modal-content").addEventListener("click", e => e.stopPropagation());
  return c.querySelector(".tree-container");
}
function buildTree(parent, data, path, onSelect) {
  Object.keys(data.dirs || {}).sort().forEach(dir => {
    const li = document.createElement("li");
    li.className = "dir";
    li.innerHTML = `<span>${dir}</span>`;
    parent.appendChild(li);
    li.querySelector("span").addEventListener("click", e => { e.stopPropagation(); li.classList.toggle("open"); });
    const ul = document.createElement("ul");
    li.appendChild(ul);
    buildTree(ul, data.dirs[dir], `${path}${dir}/`, onSelect);
  });
  (data.files || []).sort().forEach(file => {
    const li = document.createElement("li");
    li.className = "file";
    li.textContent = file;
    li.addEventListener("click", e => { e.stopPropagation(); onSelect(`${path}${file}`); });
    parent.appendChild(li);
  });
}
async function showWorkflowDialog(node) {
  try {
    setStatus(node, "Ouverture...");
    const res = await fetch("/orion4d/wf-list");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const tree = createModal();
    const root = document.createElement("ul");
    tree.appendChild(root);
    buildTree(root, data.tree, "", (file) => {
      getWidget(node, "workflow_file").value = file;
      document.getElementById("orion4d-wf-modal")?.remove();
      setStatus(node, `Sélectionné: ${file.split("/").pop()}`);
    });
    setStatus(node, "Prêt.");
  } catch (e) {
    alert(`Erreur: ${e.message}`);
    setStatus(node, "Erreur liste.");
  }
}

// Enregistrement
app.registerExtension({
  name: "orion4D.workflow_loader.centered",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData?.name !== "orion4D_workflow_loader") return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      onNodeCreated?.apply(this, arguments);

      // 1) Widgets
      if (!getWidget(this, "Status")) this.addWidget("text", "Status", "Prêt.", null, { serialize: false });
      if (!getWidget(this, "Select Workflow...")) this.addWidget("button", "Select Workflow...", null, () => showWorkflowDialog(this));
      if (!getWidget(this, "Run workflow")) this.addWidget("button", "Run workflow", null, () => runLoader(this));
      if (!getWidget(this, "Clear Canvas")) {
        this.addWidget("button", "Clear Canvas", null, () => {
          const state = this.serialize();
          app.graph.clear();
          try {
            const n = LiteGraph.createNode(state.type);
            if (n) { n.configure(state); app.graph.add(n); }
          } catch (e) { console.error("[orion4D] Échec réinjection:", e); }
          app.graph.setDirtyCanvas(true, true);
        });
      }

      // 2) CENTRAGE VERTICAL DOUX
      // Décale le bloc de widgets pour qu’il soit visuellement centré dans le node.
      // 28–32 fonctionne bien avec le thème par défaut de ComfyUI.
      this.widgets_start_y = 32;

      // Recalcule la taille après création
      setTimeout(() => this.computeSize(), 0);
    };

    // Recalcule aussi après insertion dans le canvas (sécurité)
    const onAdded = nodeType.prototype.onAdded;
    nodeType.prototype.onAdded = function () {
      onAdded?.apply(this, arguments);
      setTimeout(() => this.computeSize(), 0);
    };
  },
});
