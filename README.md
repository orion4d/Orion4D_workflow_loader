# Workflow Loader (orion4D) — ComfyUI custom node

Charge, fusionne et exécute des **workflows** (JSON ou PNG avec métadonnées) directement depuis un sélecteur intégré à ComfyUI.  
Pensé pour les installations multiples en venv et les bibliothèques partagées sur disque externe.

---

## Fonctionnalités

- **Sélecteur de workflow** (arbre de dossiers) avec statut.
- **Modes de fusion** :
  - `Add workflow` : insère le workflow à droite du node, en conservant le canvas courant (déplacement auto des groupes & nodes).
  - `new canvas` : remplace le canvas courant par le workflow chargé.
- **Actions rapides** : `Select Workflow…`, `Run workflow`, `Clear Canvas`.
- **API locale** (pour outils externes) :
  - `GET /orion4d/wf-list` → arborescence disponible
  - `GET /orion4d/workflow?rel=<chemin-relatif>` → contenu normalisé du workflow

---

## Installation

1. **Cloner / copier** ce repo dans `ComfyUI/custom_nodes` :
   ```text
   ComfyUI/custom_nodes/orion4D_workflow_loader/
     ├─ __init__.py
     ├─ wf_loader.py
     ├─ web/           (JS/HTML/CSS du sélecteur)
     └─ workflows/     (dossier cible — voir ci-dessous : jonctions)
   ```

2. **Redémarrer ComfyUI.**  
   Le node apparaît sous **`orion4D / utils`** sous le nom **“Workflow Loader (orion4D)”**.

---

## Conseil d'utilisation : utiliser une *jonction* pour le dossier `workflows`

**Principe**  
- Garder `custom_nodes/orion4D_workflow_loader/workflows` comme **jonction** pointant vers `../ComfyUI/user/default/workflows`.
- Et **ce** `user/default/workflows` peut lui-même être une **jonction** vers un dossier sur **disque externe** (partagé entre plusieurs ComfyUI en venv).

### Pourquoi ?
- **Ajout/modification/suppression des workflows directement dans comfyui.
- **Une seule bibliothèque** de workflows à maintenir.
- **Partage** entre plusieurs installations.
- **Pas de duplication** ni chemins cassés lors des mises à jour.

### Windows (CMD, recommandé)

> Ouvrir **Invite de commandes en administrateur**.

1) Faire de `ComfyUI\user\default\workflows` une jonction vers un dossier externe (ex. `E:\AI\SharedWorkflows`) :

```bat
cd /d D:\ComfyUI_dev\ComfyUI\user\default
rmdir /s /q workflows  2>nul
mklink /J workflows E:\AI\SharedWorkflows
```

2) Dans le node, faire pointer `custom_nodes\orion4D_workflow_loader\workflows` vers `user\default\workflows` :

```bat
cd /d D:\ComfyUI_dev\ComfyUI\custom_nodes\orion4D_workflow_loader
rmdir /s /q workflows  2>nul
mklink /J workflows D:\ComfyUI_dev\ComfyUI\user\default\workflows
```

> Répétez **l’étape 2** dans **chaque** installation ComfyUI (venv différente) pour mutualiser la même bibliothèque externe.

### PowerShell (équivalent)

```powershell
# Jonction depuis user\default vers le disque externe
Remove-Item -Recurse -Force "D:\ComfyUI_dev\ComfyUI\user\default\workflows" -ErrorAction SilentlyContinue
New-Item -ItemType Junction -Path "D:\ComfyUI_dev\ComfyUI\user\default\workflows" -Target "E:\AI\SharedWorkflows"

# Jonction depuis le custom node vers user\default\workflows
Remove-Item -Recurse -Force "D:\ComfyUI_dev\ComfyUI\custom_nodes\orion4D_workflow_loader\workflows" -ErrorAction SilentlyContinue
New-Item -ItemType Junction -Path "D:\ComfyUI_dev\ComfyUI\custom_nodes\orion4D_workflow_loader\workflows" -Target "D:\ComfyUI_dev\ComfyUI\user\default\workflows"
```

### macOS / Linux (symlinks)

```bash
# Exemple : dossier partagé /Volumes/External/SharedWorkflows
rm -rf ~/ComfyUI/user/default/workflows
ln -s /Volumes/External/SharedWorkflows ~/ComfyUI/user/default/workflows

rm -rf ~/ComfyUI/custom_nodes/orion4D_workflow_loader/workflows
ln -s ~/ComfyUI/user/default/workflows ~/ComfyUI/custom_nodes/orion4D_workflow_loader/workflows
```

> macOS : si nécessaire, accorder **Full Disk Access** au Terminal.

Bonus : un script Windows .bat est inclus pour créer des jonctions de dossier !
---

## Utilisation

1. Déposer le node **Workflow Loader (orion4D)** sur le canvas.
2. Cliquer **“Select Workflow…”** et choisir un `.json` ou `.png` (avec métadonnée `workflow`/`prompt`).
3. Choisir le **merge mode** :
   - `Add workflow` (par défaut) : insère à droite du node.
   - `new canvas` : remplace le canvas.
4. **Run workflow** pour charger/ajouter.
5. **Clear Canvas** pour repartir de zéro (le node est ré-injecté automatiquement).

---

## Compatibilité

- Testé sur **Windows 11** (Python 3.12.x, ComfyUI ≥ `v0.3.58`).  
- Fonctionne avec des workflows **JSON** et **PNG** exportés par ComfyUI (métadonnées).

---

## Sécurité & limitations

- L’API bloque l’accès hors `workflows/` (chemins relatifs `..` neutralisés).
- Si des custom nodes manquent, ComfyUI affichera les types “Unknown”.
- En mode `Add workflow`, un décalage automatique aligne le workflow **à droite** du node.

---

## Arborescence recommandée

```text
ComfyUI/
├─ user/
│  └─ default/
│     └─ workflows  → (jonction) E:\AI\SharedWorkflows
└─ custom_nodes/
   └─ orion4D_workflow_loader/
      ├─ __init__.py
      ├─ wf_loader.py
      ├─ web/
      └─ workflows    → (jonction) ..\..\user\default\workflows
```

---

## Dépannage

- **Le bouton “Select Workflow…” n’affiche rien**  
  Vérifier que `workflows/` existe et pointe vers un dossier valide avec des `.json`/`.png`.  
  Sous Windows, recréer la jonction en **Invite admin**.

- **“file_not_found”** après sélection  
  Le lien de jonction ciblait un lecteur non monté (disque externe débranché).

- **Le workflow ne se connecte pas au reste**  
  Normal : l’outil **ajoute**/charge sans câbler automatiquement. Connecter selon besoin.

---

## Mise à jour / Contributions

1. Mettre à jour depuis GitHub (ou copier les fichiers).
2. Redémarrer ComfyUI.  
