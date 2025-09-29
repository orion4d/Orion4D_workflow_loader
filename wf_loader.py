# -*- coding: utf-8 -*-
import os
import json
from typing import Dict
from aiohttp import web
from server import PromptServer

PKG_DIR = os.path.dirname(__file__)
WEB_DIRECTORY = os.path.join(PKG_DIR, "web")
WORKFLOWS_ROOT = os.path.join(PKG_DIR, "workflows")

# --- Utils ---
def _safe_read_json(path: str):
    with open(path, "rb") as f:
        raw = f.read()
    try:
        return json.loads(raw)
    except Exception:
        return json.loads(raw.decode("utf-8", errors="ignore"))

def _read_png_workflow(path: str):
    try:
        from PIL import Image
    except ImportError:
        return None
    try:
        im = Image.open(path)
        meta = im.info or {}
        for key in ("workflow", "prompt", "workflow_json"):
            if key in meta:
                return json.loads(meta[key])
    except Exception:
        return None
    return None

def _normalize_workflow(wf: dict):
    if wf is None:
        return None
    if "nodes" not in wf and "workflow" in wf and isinstance(wf["workflow"], dict):
        wf = wf["workflow"]
    wf.setdefault("nodes", [])
    wf.setdefault("links", [])
    wf.setdefault("groups", [])
    wf.setdefault("extra", {})
    wf.setdefault("config", {})
    wf.setdefault("definitions", {})
    return wf

def _build_dir_tree(root_path: str) -> Dict:
    tree = {"files": [], "dirs": {}}
    if not os.path.isdir(root_path):
        return tree
    for item in sorted(os.listdir(root_path), key=str.lower):
        full_path = os.path.join(root_path, item)
        if os.path.isdir(full_path):
            tree["dirs"][item] = _build_dir_tree(full_path)
        else:
            ext = os.path.splitext(item)[1].lower()
            if ext in (".json", ".png"):
                tree["files"].append(item)
    return tree

def _sanitize_rel(rel: str) -> str:
    """Neutralise ../ et chemins absolus pour rester sous WORKFLOWS_ROOT."""
    rel = rel.replace("\\", "/").strip()
    safe = os.path.normpath(os.path.join(WORKFLOWS_ROOT, rel))
    if not safe.startswith(os.path.abspath(WORKFLOWS_ROOT) + os.sep):
        raise ValueError("invalid_rel_path")
    return safe

# --- API ---
routes = web.RouteTableDef()

@routes.get("/orion4d/wf-list")
async def api_list(request):
    return web.json_response({"root": WORKFLOWS_ROOT, "tree": _build_dir_tree(WORKFLOWS_ROOT)})

@routes.get("/orion4d/workflow")
async def api_get(request):
    rel = (request.rel_url.query.get("rel") or "").strip()
    if not rel:
        return web.json_response({"error": "missing_rel_path"}, status=400)
    try:
        chosen = _sanitize_rel(rel)
    except ValueError:
        return web.json_response({"error": "invalid_rel_path"}, status=400)

    if not os.path.isfile(chosen):
        return web.json_response({"error": "file_not_found", "path": chosen}, status=404)

    ext = os.path.splitext(chosen)[1].lower()
    wf = None
    if ext == ".json":
        wf = _normalize_workflow(_safe_read_json(chosen))
    elif ext == ".png":
        wf = _normalize_workflow(_read_png_workflow(chosen))

    if not wf:
        return web.json_response({"error": "no_workflow"}, status=400)
    return web.json_response({"workflow": wf, "name": os.path.basename(chosen)})

PromptServer.instance.app.add_routes(routes)

# --- Node ---
class Orion4DWorkflowLoader:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "merge_mode": (["Add workflow", "new canvas"],),
                "workflow_file": ("STRING", {"multiline": False, "default": "—", "visible": False}),
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "do_nothing"
    OUTPUT_NODE = True
    CATEGORY = "workflows"

    def do_nothing(self, *args, **kwargs):
        return {"ui": {}}

NODE_CLASS_MAPPINGS = {"orion4D_workflow_loader": Orion4DWorkflowLoader}
NODE_DISPLAY_NAME_MAPPINGS = {"orion4D_workflow_loader": "Workflow Loader by Orion4D"}
