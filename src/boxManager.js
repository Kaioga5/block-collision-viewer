import * as utils from './utils.js';
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

let sceneApi = null;
let boxes = [];
let selectedBox = null;
let onChange = null; // callback to inform UI/main

export function init(_sceneApi) {
  sceneApi = _sceneApi;
}

export function setOnChange(cb) {
  onChange = cb;
}

export function getBoxes() {
  return boxes;
}

export function getSelectedBox() {
  return selectedBox;
}

function emitChange() {
  if (typeof onChange === 'function') onChange(boxes, selectedBox);
}

export function addBox(origin = [0, 1, 0], size = [2, 2, 2]) {
  if (boxes.length >= utils.MAX_BOXES) return null;

  const id = THREE.MathUtils.generateUUID();
  // Pick a color based on current index. Guard against missing BOX_COLORS.
  const color = (utils.BOX_COLORS && utils.BOX_COLORS.length)
    ? utils.BOX_COLORS[boxes.length % utils.BOX_COLORS.length]
    : 0xe9ecec;

  const clampedOrigin = utils.clampOrigin(origin, size);
  const clampedSize = utils.clampSize(clampedOrigin, size);

  const boxMesh = utils.createCollisionBoxMesh(clampedOrigin, clampedSize, color);
  boxMesh.userData.id = id;
  boxMesh.userData.type = 'collisionBox';

  const boxState = { id, mesh: boxMesh, origin: clampedOrigin, size: clampedSize, color };

  boxes.push(boxState);
  sceneApi.scene.add(boxMesh);
  emitChange();
  return boxState;
}

export function duplicateBox(sourceId) {
  if (boxes.length >= utils.MAX_BOXES) return;
  const source = boxes.find(b => b.id === sourceId);
  if (!source) return;
  const newOrigin = [source.origin[0] + 1, source.origin[1], source.origin[2]];
  const newBox = addBox(newOrigin, source.size);
  if (newBox) selectBox(newBox.id);
}

export function deleteBox(id) {
  const idx = boxes.findIndex(b => b.id === id);
  if (idx === -1) return;
  const box = boxes[idx];

  if (selectedBox && selectedBox.id === id) {
    deselectBox();
  }

  sceneApi.scene.remove(box.mesh);
  box.mesh.children.forEach(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });

  boxes.splice(idx, 1);

  boxes.forEach((b, i) => {
    const newColor = utils.BOX_COLORS[i % utils.BOX_COLORS.length];
    b.color = newColor;
    try {
      if (b.mesh && b.mesh.userData && b.mesh.userData.mesh && b.mesh.userData.mesh.material) {
        b.mesh.userData.mesh.material.color.setHex(newColor);
      }
    } catch (e) {
      // ignore material update errors
    }
  });

  emitChange();
}

export function deleteAllBoxes() {
  deselectBox();
  boxes.forEach(box => {
    sceneApi.scene.remove(box.mesh);
    box.mesh.children.forEach(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  });
  boxes = [];
  emitChange();
}

export function updateBoxMesh(box) {
  if (selectedBox && selectedBox.id === box.id) sceneApi.transformControls.detach();

  sceneApi.scene.remove(box.mesh);
  box.mesh.children.forEach(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });

  box.mesh = utils.createCollisionBoxMesh(box.origin, box.size, box.color);
  box.mesh.userData.id = box.id;
  box.mesh.userData.type = 'collisionBox';
  sceneApi.scene.add(box.mesh);

  if (selectedBox && selectedBox.id === box.id) {
    sceneApi.transformControls.attach(box.mesh);
    if (sceneApi && typeof sceneApi.attachAxisGizmo === 'function') {
      const size = Math.max(box.size[0], box.size[1], box.size[2], 4);
      sceneApi.attachAxisGizmo(box.mesh, size);
    }
  }
  emitChange();
}

export function selectBox(idOrBox) {
  const box = typeof idOrBox === 'string' ? boxes.find(b => b.id === idOrBox) : idOrBox;
  if (!box) return;
  if (selectedBox && selectedBox.id === box.id) return;

  deselectBox();
  selectedBox = box;
  sceneApi.transformControls.attach(box.mesh);
  // Show world-aligned axis arrows matching the scene axes
  if (sceneApi && typeof sceneApi.attachAxisGizmo === 'function') {
    const size = Math.max(box.size[0], box.size[1], box.size[2], 4);
    sceneApi.attachAxisGizmo(box.mesh, size);
  }
  emitChange();
}

export function deselectBox() {
  if (!selectedBox) return;
  sceneApi.transformControls.detach();
  if (sceneApi && typeof sceneApi.detachAxisGizmo === 'function') sceneApi.detachAxisGizmo();
  selectedBox = null;
  emitChange();
}

// Update origin/size values and rebuild/move mesh appropriately
export function setBoxValuesFromUI(id, newOrigin, newSize) {
  const box = boxes.find(b => b.id === id);
  if (!box) return;

  // Apply snapping/clamping logic (origin first, then size)
  newOrigin = newOrigin.map(v => Math.round(v));
  newSize = newSize.map(v => Math.max(1, Math.round(v)));

  newOrigin = utils.clampOrigin(newOrigin, newSize);
  newSize = utils.clampSize(newOrigin, newSize);

  box.origin = newOrigin;
  const sizeChanged = box.size.some((s, i) => s !== newSize[i]);
  box.size = newSize;

  if (sizeChanged) updateBoxMesh(box);
  else {
    box.mesh.position.set(box.origin[0] + box.size[0] / 2, box.origin[1] + box.size[1] / 2, box.origin[2] + box.size[2] / 2);
    if (selectedBox && selectedBox.id === box.id && sceneApi && typeof sceneApi.attachAxisGizmo === 'function') {
      const size = Math.max(box.size[0], box.size[1], box.size[2], 4);
      sceneApi.attachAxisGizmo(box.mesh, size);
    }
    emitChange();
  }
}
