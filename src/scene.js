// Scene initialization and helpers (imports three and controls as ES modules)
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/TransformControls.js';

export function initScene(container) {
  const { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight, DirectionalLight, GridHelper, AxesHelper, Color, BoxGeometry, EdgesGeometry, LineBasicMaterial, LineSegments } = THREE;

  const scene = new Scene();
  scene.background = new Color(0x111827);

  const w = container.clientWidth;
  const h = container.clientHeight;

  const camera = new PerspectiveCamera(75, w / h, 0.1, 1000);
  camera.position.set(15, 20, 25);
  camera.lookAt(0, 12, 0);

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target.set(0, 12, 0);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.space = 'world';
  transformControls.setMode('translate');
  transformControls.setTranslationSnap(1);

  transformControls.showX = true;
  transformControls.showY = true;
  transformControls.showZ = true;
  transformControls.showRotation = false;
  transformControls.showScale = false;
  transformControls.showXY = false;
  transformControls.showYZ = false;
  transformControls.showXZ = false;

  scene.add(transformControls);

  transformControls.addEventListener('dragging-changed', (e) => {
    orbitControls.enabled = !e.value;
  });

  const ambientLight = new AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  const directionalLight = new DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  const gridHelper = new GridHelper(16, 16, 0x4b5563, 0x4b5563);
  scene.add(gridHelper);

  const axesHelper = new AxesHelper(16);
  axesHelper.position.set(0, 0.01, 0);
  scene.add(axesHelper);

  const boundsGeom = new BoxGeometry(16, 24, 16);
  const boundsEdges = new EdgesGeometry(boundsGeom);
  const boundsMaterial = new LineBasicMaterial({ color: 0x4b5563, linewidth: 2 });
  const boundsWireframe = new LineSegments(boundsEdges, boundsMaterial);
  boundsWireframe.position.set(0, 12, 0);
  scene.add(boundsWireframe);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // World-aligned axis arrows shown when a box is selected.
  const axisGizmo = new THREE.Group();
  axisGizmo.visible = false;

  const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 4, 0xff0000);
  const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 4, 0x00ff00);
  const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 4, 0x0000ff);
  axisGizmo.add(arrowX, arrowY, arrowZ);
  scene.add(axisGizmo);

  function onWindowResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener('resize', onWindowResize, false);

  function animate() {
    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
  }

  animate();

  return {
    scene,
    camera,
    renderer,
    raycaster,
    mouse,
    transformControls,
    orbitControls,
    container,
    // Axis gizmo API
    attachAxisGizmo(object, size = 4) {
      if (!object) return;
      axisGizmo.position.copy(object.position);
      // scale arrows according to provided size
      arrowX.setLength(size);
      arrowY.setLength(size);
      arrowZ.setLength(size);
      axisGizmo.visible = true;
    },
    detachAxisGizmo() {
      axisGizmo.visible = false;
    },
  };
}
