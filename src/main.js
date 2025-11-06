import { initScene } from './scene.js';
import * as utils from './utils.js';
import * as boxManager from './boxManager.js';
import * as UI from './ui.js';

// DOM refs
const sceneContainer = document.getElementById('scene-container');
const boxListContainer = document.getElementById('box-list-container');
const noBoxesMsg = document.getElementById('no-boxes-msg');
const jsonOutput = document.getElementById('json-output');
const addBoxBtn = document.getElementById('add-box-btn');
const copyJsonBtn = document.getElementById('copy-json-btn');
const copyFeedback = document.getElementById('copy-feedback');
const boxTemplate = document.getElementById('box-item-template');
const jsonImportInput = document.getElementById('json-import-input');
const loadJsonBtn = document.getElementById('load-json-btn');
const importSuccess = document.getElementById('import-feedback-success');
const importError = document.getElementById('import-feedback-error');

// Initialize scene
const sceneApi = initScene(sceneContainer);

// Initialize box manager with scene reference
boxManager.init(sceneApi);
boxManager.setOnChange(() => updateUI());

// Initialize UI with callbacks
UI.init(
  {
    addBoxBtn,
    copyJsonBtn,
    loadJsonBtn,
    boxListContainer,
    noBoxesMsg,
    jsonOutput,
    jsonImportInput,
    importSuccess,
    importError,
    copyFeedback,
    boxTemplate,
  },
  {
    addBox: () => {
      const b = boxManager.addBox([0, 8, 0], [4, 4, 4]);
      if (b) boxManager.selectBox(b.id);
    },
    setBoxColor: (id, color) => boxManager.setBoxColor(id, color),
    copyJson: null,
    loadBoxes: (arr) => {
      boxManager.deleteAllBoxes();
      let loaded = 0;
      for (const b of arr) {
        if (loaded >= utils.MAX_BOXES) break;
        // If the payload includes a color, prefer it when creating the box
        const nb = boxManager.addBox(b.origin, b.size);
        if (nb && (b.color || b.hexColor || b.col)) {
          // accept color values like '#rrggbb' or numeric
          const c = b.color || b.hexColor || b.col;
          boxManager.setBoxColor(nb.id, c);
        }
        if (nb) loaded++;
      }
      if (boxManager.getBoxes().length > 0) boxManager.selectBox(boxManager.getBoxes()[0].id);
    },
    setBoxValues: (id, origin, size) => boxManager.setBoxValuesFromUI(id, origin, size),
    deleteBox: (id) => boxManager.deleteBox(id),
    duplicateBox: (id) => boxManager.duplicateBox(id),
    selectBox: (id) => boxManager.selectBox(id),
  }
);

// Wire click on canvas to select/deselect boxes
sceneApi.renderer.domElement.addEventListener('click', (event) => {
  if (sceneApi.transformControls.dragging) return;
  const rect = sceneApi.renderer.domElement.getBoundingClientRect();
  sceneApi.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  sceneApi.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  sceneApi.raycaster.setFromCamera(sceneApi.mouse, sceneApi.camera);
  const meshes = boxManager.getBoxes().map(b => b.mesh.userData.mesh);
  const intersects = sceneApi.raycaster.intersectObjects(meshes, false);
  if (intersects.length > 0) {
    const group = utils.findBoxGroup(intersects[0].object);
    if (group) {
      const box = boxManager.getBoxes().find(b => b.id === group.userData.id);
      if (box) boxManager.selectBox(box.id);
    }
  } else {
    boxManager.deselectBox();
  }
});

// TransformControls change handler: snap, clamp, update state
sceneApi.transformControls.addEventListener('objectChange', () => {
  const selected = boxManager.getSelectedBox();
  if (!selected) return;
  const { mesh, size } = selected;
  const center = mesh.position;
  let newOrigin = [center.x - size[0] / 2, center.y - size[1] / 2, center.z - size[2] / 2];
  newOrigin = newOrigin.map(v => Math.round(v));
  const clamped = utils.clampOrigin(newOrigin, size);
  mesh.position.set(clamped[0] + size[0] / 2, clamped[1] + size[1] / 2, clamped[2] + size[2] / 2);
  selected.origin = clamped;
  // keep world-aligned axis gizmo positioned on the selected mesh
  if (sceneApi && typeof sceneApi.attachAxisGizmo === 'function') {
    const gizmoSize = Math.max(size[0], size[1], size[2], 4);
    sceneApi.attachAxisGizmo(mesh, gizmoSize);
  }
  updateUI();
});

// UI update wrapper
function updateUI() {
  UI.updateUI(boxManager.getBoxes(), boxManager.getSelectedBox());
}

// Initial UI render (if any initial boxes)
updateUI();

// Expose for debugging
window._bcv = { sceneApi, boxManager };
