// Import three.js as an ES module so other modules can import this file
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';

// Utility helpers and constants used across modules
export const MAX_BOXES = 16;
export const BOUNDS = {
  min: { x: -8, y: 0, z: -8 },
  max: { x: 8, y: 24, z: 8 },
};

// Minecraft Concrete Colors (16)
export const BOX_COLORS = [
  0xb02e26, // Red
  0xf9801d, // Orange
  0xfad21d, // Yellow
  0x80c71f, // Lime
  0x5e7c16, // Green
  0x169c9c, // Cyan
  0x3ab3da, // Light Blue
  0x3c44aa, // Blue
  0x8932b8, // Purple
  0xc74ebd, // Magenta
  0xf38baa, // Pink
  0x835432, // Brown
  0x9d9d95, // Light Gray
  0x474f52, // Gray
  0x1d1d21, // Black
  0xe9ecec, // White (moved to end so defaults are more colorful)
];

/**
 * Clamp origin so that box remains inside bounds (and at least 1 unit space)
 */
export function clampOrigin(origin, size) {
  const [w, h, d] = size;
  let [x, y, z] = origin;

  x = Math.max(BOUNDS.min.x, Math.min(BOUNDS.max.x - 1, x));
  y = Math.max(BOUNDS.min.y, Math.min(BOUNDS.max.y - 1, y));
  z = Math.max(BOUNDS.min.z, Math.min(BOUNDS.max.z - 1, z));

  x = Math.max(BOUNDS.min.x, Math.min(BOUNDS.max.x - w, x));
  y = Math.max(BOUNDS.min.y, Math.min(BOUNDS.max.y - h, y));
  z = Math.max(BOUNDS.min.z, Math.min(BOUNDS.max.z - d, z));

  return [x, y, z];
}

/**
 * Clamp size so that box remains within bounds given origin
 */
export function clampSize(origin, size) {
  const [ox, oy, oz] = origin;
  let [w, h, d] = size;

  w = Math.max(1, Math.min(BOUNDS.max.x - ox, w));
  h = Math.max(1, Math.min(BOUNDS.max.y - oy, h));
  d = Math.max(1, Math.min(BOUNDS.max.z - oz, d));

  return [w, h, d];
}

/**
 * Create a THREE.Group containing a transparent fill mesh and wireframe outline.
 */
export function createCollisionBoxMesh(origin, size, hexColor) {
  const { BoxGeometry, MeshBasicMaterial, Mesh, EdgesGeometry, LineBasicMaterial, LineSegments, Group } = THREE;
  const [w, h, d] = size;
  const geometry = new BoxGeometry(w, h, d);

  const material = new MeshBasicMaterial({
    color: hexColor,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });

  const mesh = new Mesh(geometry, material);

  const edges = new EdgesGeometry(geometry);
  const lineMaterial = new LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
  const wireframe = new LineSegments(edges, lineMaterial);

  const group = new Group();
  group.add(mesh);
  group.add(wireframe);

  const [ox, oy, oz] = origin;
  group.position.set(ox + w / 2, oy + h / 2, oz + d / 2);

  group.userData.mesh = mesh;

  return group;
}

/**
 * Walk up parent chain to find a group with userData.type === 'collisionBox'
 */
export function findBoxGroup(object) {
  let current = object;
  while (current) {
    if (current.userData && current.userData.type === 'collisionBox') return current;
    current = current.parent;
  }
  return null;
}
