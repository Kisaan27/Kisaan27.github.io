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

  const SPACING = SIZE + GAP;

  voxels.forEach(([x, y, z, mat]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x * SPACING, y * SPACING, z * SPACING);
    // Integer lattice coords, kept in step with every face turn — this is what
    // decides which cubes belong to the next turn.
    m.userData.g = { x, y, z };
    cluster.add(m);
  });

  // Centring goes on a wrapper, NOT baked into each cube: a face turn has to
  // pivot about the lattice origin, and an offset baked into the cubes would
  // make every face swing around a point slightly off its own centre.
  const box = new THREE.Box3().setFromObject(cluster);
  const centre = box.getCenter(new THREE.Vector3());
  const centerer = new THREE.Group();
  centerer.position.copy(centre).multiplyScalar(-1);
  centerer.add(cluster);

  const rig = new THREE.Group();
  rig.add(centerer);
  // Base angle is the logo's own isometric three-quarter view; the loop below
  // only sways around it rather than spinning full circle, which would pass
  // through angles where the cluster reads as an undifferentiated block.
  const BASE_YAW = -0.42;
  const SWAY = 0.42;          // radians either side
  rig.rotation.x = 0.30;
  rig.rotation.y = BASE_YAW;
  scene.add(rig);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- interaction ---------------------------------------------------------
  // Motion is gated on hover: at rest the cluster holds its pose, and the sway
  // eases in only while the pointer is over the pane.
  let hovered = false;
  let motion = 0;              // smoothed 0..1 follower of `hovered`
  let swayClock = 0;           // advances only while moving, so the sway
                               // resumes from where it stopped rather than jumping

  pane.addEventListener('pointerenter', () => { hovered = true; });
  pane.addEventListener('pointerleave', () => { hovered = false; });

  // A face turn, Rubik-style: pick an axis and one of its layers, reparent that
  // layer under a pivot at the lattice origin, spin a quarter turn, then bake
  // the result back and update the lattice coords so the next turn selects the
  // right cubes.
  const AXES = ['x', 'y', 'z'];
  const TURN_DUR = 0.52;
  let turn = null;

  function startTurn() {
    if (turn) return;                                  // one at a time
    const axis = AXES[Math.floor(Math.random() * AXES.length)];
    const layers = [...new Set(cluster.children.map((m) => m.userData.g[axis]))];
    const layer = layers[Math.floor(Math.random() * layers.length)];
    const members = cluster.children.filter((m) => m.userData.g[axis] === layer);
    if (!members.length) return;

    const pivot = new THREE.Group();
    cluster.add(pivot);
    // attach() preserves world transform, so cubes do not jump on reparent
    members.forEach((m) => pivot.attach(m));
    turn = { pivot, members, axis, dir: Math.random() < 0.5 ? 1 : -1, t: 0 };
  }

  function finishTurn() {
    const { pivot, members, axis, dir } = turn;
    pivot.rotation[axis] = dir * Math.PI / 2;
    pivot.updateMatrixWorld(true);
    members.forEach((m) => cluster.attach(m));         // bake transform back
    cluster.remove(pivot);

    // Rotate the lattice coords to match. Derived from the turn rather than
    // re-read from position, so rounding cannot drift over many turns.
    members.forEach((m) => {
      const g = m.userData.g;
      const { x, y, z } = g;
      if (axis === 'x') { g.y = -dir * z; g.z = dir * y; }
      if (axis === 'y') { g.x = dir * z;  g.z = -dir * x; }
      if (axis === 'z') { g.x = -dir * y; g.y = dir * x; }
    });
    turn = null;
  }

  canvas.addEventListener('pointerdown', () => { if (!reduceMotion) startTurn(); });
  canvas.style.cursor = 'pointer';

  // Solve the camera distance from the cluster's bounding sphere against BOTH
  // the vertical and horizontal field of view — fitting only the vertical one
  // crops the sides as soon as the pane is taller than it is wide, which this
  // one is.
  const bounds = new THREE.Box3().setFromObject(centerer);
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
  let lastT = 0;
  const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = (performance.now() - t0) / 1000;
    const dt = Math.min(t - lastT, 0.05);              // clamp after a tab stall
    lastT = t;

    if (!reduceMotion) {
      // Ease toward the hover state rather than snapping, so leaving the pane
      // settles the cluster instead of freezing it mid-sway. The decay is
      // asymptotic, so snap the tail to zero — otherwise it creeps
      // imperceptibly forever and the scene never actually comes to rest.
      motion += ((hovered ? 1 : 0) - motion) * Math.min(dt * 4.5, 1);
      if (!hovered && motion < 0.002) motion = 0;

      swayClock += dt * motion;

      rig.rotation.y = BASE_YAW + Math.sin(swayClock * 0.5) * SWAY * motion;
      rig.rotation.x = 0.30 + Math.sin(swayClock * 0.38) * 0.07 * motion;
      rig.position.y = Math.sin(swayClock * 0.9) * 0.12 * motion;

      if (turn) {
        turn.t += dt;
        const k = Math.min(turn.t / TURN_DUR, 1);
        turn.pivot.rotation[turn.axis] = turn.dir * (Math.PI / 2) * easeInOutCubic(k);
        if (k >= 1) finishTurn();
      }
    }

    // Deliberately still renders every frame when idle: skipping draws with a
    // non-preserved drawing buffer lets the compositor sample unstable
    // contents, which showed up as flicker between otherwise identical frames.
    renderer.render(scene, camera);
  });

  window.__brandSceneReady = true;
}
