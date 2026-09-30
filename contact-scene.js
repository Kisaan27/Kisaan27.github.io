import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const pane = document.getElementById('brand-scene-pane');
const canvas = document.getElementById('brand-scene');
if (pane && canvas) init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return; // no WebGL — the CSS backdrop alone still reads fine
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  // Direction is fixed; the distance is solved in fitCamera() so the cluster
  // always sits fully in frame whatever shape the pane is.
  const VIEW_DIR = new THREE.Vector3(0.78, 0.58, 0.92).normalize();

  // Image-based lighting does the heavy lifting on the bevels — without it
  // the rounded edges read as flat colour rather than catching light.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;

  const key = new THREE.DirectionalLight(0xfff4e6, 2.6);
  key.position.set(5, 7, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x9fd3a8, 1.9);   // sage rim, brand accent
  rim.position.set(-6, 2, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x8fb0ff, 0.9);
  fill.position.set(-3, -4, 3);
  scene.add(fill);

  scene.add(new THREE.HemisphereLight(0xa8c0ea, 0x0b1022, 0.5));

  // --- the brand mark, as real voxels -------------------------------------
  const NAVY  = new THREE.MeshPhysicalMaterial({ color: 0x2c3a6b, roughness: 0.34, metalness: 0.12, clearcoat: 0.55, clearcoatRoughness: 0.28 });
  const NAVY_D= new THREE.MeshPhysicalMaterial({ color: 0x1d2749, roughness: 0.38, metalness: 0.12, clearcoat: 0.5,  clearcoatRoughness: 0.3 });
  const SAGE  = new THREE.MeshPhysicalMaterial({ color: 0x7aaa66, roughness: 0.30, metalness: 0.10, clearcoat: 0.6,  clearcoatRoughness: 0.25 });
  const STEEL = new THREE.MeshPhysicalMaterial({ color: 0x94a1b8, roughness: 0.26, metalness: 0.45, clearcoat: 0.5,  clearcoatRoughness: 0.22 });

  // Interlocking cluster echoing the logo: a stepped core with sage on the
  // upper faces and steel catching the light at the lower left.
  const voxels = [
    // dense core
    [ 0, 0, 0, NAVY  ], [ 1, 0, 0, SAGE  ], [ 0, 1, 0, SAGE  ], [ 1, 1, 0, SAGE  ],
    [ 0, 0, 1, NAVY_D], [ 1, 0, 1, NAVY  ], [ 0, 1, 1, SAGE  ], [ 1, 1, 1, NAVY  ],
    // lower navy mass
    [ 0,-1, 0, NAVY  ], [ 1,-1, 0, NAVY_D], [ 0,-1, 1, NAVY  ],
    // steel steps out to the left
    [-1, 0, 0, STEEL ], [-1, 0, 1, STEEL ], [-1,-1, 0, STEEL ],
    // navy shoulders
    [-1, 1, 0, NAVY  ], [ 0, 0,-1, NAVY_D], [ 1, 0,-1, NAVY  ], [ 0, 1,-1, NAVY_D],
  ];

  const SIZE = 1.0, GAP = 0.045;
  const geo = new RoundedBoxGeometry(SIZE, SIZE, SIZE, 4, 0.085);
  const cluster = new THREE.Group();

  voxels.forEach(([x, y, z, mat], i) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x * (SIZE + GAP), y * (SIZE + GAP), z * (SIZE + GAP));
    m.userData.baseY = m.position.y;
    m.userData.phase = i * 0.55;
    cluster.add(m);
  });

  // Centre the cluster on its own bounds so rotation stays on-axis.
  const box = new THREE.Box3().setFromObject(cluster);
  const centre = box.getCenter(new THREE.Vector3());
  cluster.children.forEach((m) => { m.position.sub(centre); m.userData.baseY = m.position.y; });

  const rig = new THREE.Group();
  rig.add(cluster);
  // Base angle is the logo's own isometric three-quarter view; the loop below
  // only sways around it rather than spinning full circle, which would pass
  // through angles where the cluster reads as an undifferentiated block.
  const BASE_YAW = -0.42;
  const SWAY = 0.42;          // radians either side
  rig.rotation.x = 0.30;
  rig.rotation.y = BASE_YAW;
  scene.add(rig);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Solve the camera distance from the cluster's bounding sphere against BOTH
  // the vertical and horizontal field of view — fitting only the vertical one
  // crops the sides as soon as the pane is taller than it is wide, which this
  // one is.
  const bounds = new THREE.Box3().setFromObject(cluster);
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const MARGIN = 1.10;

  function fitCamera() {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = Math.max(
      sphere.radius / Math.sin(vFov / 2),
      sphere.radius / Math.sin(hFov / 2)
    ) * MARGIN;
    camera.position.copy(VIEW_DIR).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
  }

  function resize() {
    const w = pane.clientWidth, h = pane.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitCamera();
  }
  resize();
  new ResizeObserver(resize).observe(pane);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 }).observe(pane);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  pane.classList.add('is-ready');

  const t0 = performance.now();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = (performance.now() - t0) / 1000;
    if (!reduceMotion) {
      rig.rotation.y = BASE_YAW + Math.sin(t * 0.24) * SWAY;
      rig.rotation.x = 0.30 + Math.sin(t * 0.19) * 0.07;
      rig.position.y = Math.sin(t * 0.5) * 0.12;
      // Each voxel breathes very slightly out of phase, so the cluster feels
      // alive rather than like one rigid block.
      cluster.children.forEach((m) => {
        m.position.y = m.userData.baseY + Math.sin(t * 0.8 + m.userData.phase) * 0.022;
      });
    }
    renderer.render(scene, camera);
  });

  window.__brandSceneReady = true;
}
