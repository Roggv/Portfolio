// One small sculpture ("emblem") per project, on a plinth in the aisle.
// Builders return { object, update?(t, dt, camera) }, sit on y = 0 and fit in about 0.8 x 0.9 m.
// Kinds: a procedural model from EMBLEMS, a flat pixel-art 'sprite', or a .glb `model`.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture, glowTexture, hash, rng, FONT } from './textures.js';

const TAU = Math.PI * 2;
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (x) => x * x * (3 - 2 * x);
const tmp = new THREE.Vector3();

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, flatShading: true, ...o });
const bright = (color, o = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, ...o });

function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
const ball = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);

// A triangular prism along z: the roof of a house
function gable(w, h, d, mat) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return new THREE.Mesh(geo, mat);
}

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// Turn a group so its front (+z) faces the camera, turning only round the vertical axis
function faceCamera(object, camera) {
  tmp.copy(camera.position);
  object.parent.worldToLocal(tmp);
  object.rotation.y = Math.atan2(tmp.x - object.position.x, tmp.z - object.position.z);
}

// Unity

// Tank Wars: the turret follows the visitor around
function tank() {
  const g = new THREE.Group();
  const hullM = std('#6f8f3f');
  const darkM = std('#2b3320', { roughness: 0.8 });
  const wheelM = std('#2c2c2c', { roughness: 0.7 });
  const hubM = std('#8d9178', { roughness: 0.5 });

  add(g, box(0.44, 0.12, 0.7), hullM, 0, 0.17, 0);
  add(g, box(0.4, 0.05, 0.24), hullM, 0, 0.245, -0.23); // sloped front plate
  for (const sx of [-1, 1]) {
    for (const z of [-0.27, 0, 0.27]) {
      add(g, cyl(0.085, 0.085, 0.15, 12), wheelM, sx * 0.28, 0.1, z).rotation.z = Math.PI / 2;
      add(g, cyl(0.04, 0.04, 0.16, 8), hubM, sx * 0.28, 0.1, z).rotation.z = Math.PI / 2;
    }
  }

  const turret = new THREE.Group();
  turret.position.y = 0.23;
  g.add(turret);
  add(turret, cyl(0.14, 0.17, 0.1, 10), hullM, 0, 0.05, 0.02);
  add(turret, cyl(0.04, 0.04, 0.035, 8), darkM, 0.05, 0.12, 0.05); // hatch
  add(turret, cyl(0.022, 0.026, 0.46, 8), darkM, 0, 0.06, -0.3).rotation.x = Math.PI / 2;
  add(turret, cyl(0.034, 0.034, 0.06, 8), darkM, 0, 0.06, -0.52).rotation.x = Math.PI / 2;
  g.scale.setScalar(0.9);
  g.rotation.y = 0.5;

  return {
    object: g,
    update(t, dt, camera) {
      tmp.copy(camera.position);
      g.worldToLocal(tmp);
      const near = Math.hypot(tmp.x, tmp.z) < 7;
      const target = near ? Math.atan2(-tmp.x, -tmp.z) : Math.sin(t * 0.4) * 0.9;
      turret.rotation.y += wrapPi(target - turret.rotation.y) * (1 - Math.exp(-dt * 3));
    },
  };
}

function pipTexture(n, bg, fg) {
  const S = 128;
  const [c, x] = canvas2d(S, S);
  x.fillStyle = bg;
  x.fillRect(0, 0, S, S);
  x.fillStyle = fg;
  const spots = {
    1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
    6: [[0.28, 0.25], [0.72, 0.25], [0.28, 0.5], [0.72, 0.5], [0.28, 0.75], [0.72, 0.75]],
  }[n];
  for (const [px, py] of spots) {
    x.beginPath();
    x.arc(px * S, py * S, S * 0.085, 0, TAU);
    x.fill();
  }
  return canvasTexture(c);
}

function die(bg, fg, size = 0.15) {
  const faces = [3, 4, 1, 6, 2, 5]; // +x, -x, +y, -y, +z, -z
  return new THREE.Mesh(
    box(size, size, size),
    faces.map((n) => new THREE.MeshStandardMaterial({ map: pipTexture(n, bg, fg), roughness: 0.4 })),
  );
}

function boardTexture() {
  const S = 256;
  const [c, x] = canvas2d(S, S);
  x.fillStyle = '#5a3d25';
  x.fillRect(0, 0, S, S);
  const n = 6;
  const cell = (S - 24) / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const edge = i === 0 || j === 0 || i === n - 1 || j === n - 1;
      x.fillStyle = edge ? '#f1ede0' : '#5f9d3d';
      x.fillRect(12 + i * cell + 1, 12 + j * cell + 1, cell - 2, cell - 2);
    }
  }
  x.fillStyle = '#c93c3c';
  x.fillRect(12 + 1, 12 + (n - 1) * cell + 1, cell - 2, cell - 2);
  for (const [i, j] of [[2, 0], [n - 1, 2], [3, n - 1]]) {
    x.fillStyle = '#e8c93a';
    x.fillRect(12 + i * cell + 1, 12 + j * cell + 1, cell - 2, cell - 2);
    x.fillStyle = '#3f7fc4';
    x.fillRect(12 + i * cell + cell * 0.2, 12 + j * cell + cell * 0.2, cell * 0.6, cell * 0.6);
  }
  return canvasTexture(c);
}

// A goose, as plump and friendly as La Oca's
function goose() {
  const g = new THREE.Group();
  const white = std('#f6f3ea', { roughness: 0.5, flatShading: false });
  const orange = std('#f09a2a', { flatShading: false });
  const black = std('#101010', { flatShading: false, roughness: 0.3 });

  const LEG = 0.05; // how far the body is lifted on its legs
  const upper = new THREE.Group(); // body, neck and head: everything above the legs
  upper.position.y = LEG;
  g.add(upper);

  add(upper, ball(0.085, 16, 12), white, 0, 0.1, 0).scale.set(1, 0.85, 1.45);
  for (const sx of [-1, 1]) {
    const wing = add(upper, ball(0.06, 10, 8), white, sx * 0.075, 0.115, 0.015);
    wing.scale.set(0.35, 0.7, 1.15);
    wing.rotation.z = sx * 0.2;
    add(g, cyl(0.011, 0.013, 0.09, 8), orange, sx * 0.035, 0.05, -0.02); // leg
    add(g, ball(0.02, 8, 6), orange, sx * 0.035, 0.008, -0.035).scale.set(1.1, 0.3, 1.7); // webbed foot
  }
  const neck = add(upper, cyl(0.022, 0.03, 0.17, 10), white, 0, 0.22, -0.09);
  neck.rotation.x = -0.3;
  add(upper, ball(0.04, 14, 10), white, 0, 0.31, -0.115);
  const beak = add(upper, new THREE.ConeGeometry(0.018, 0.06, 8), orange, 0, 0.3, -0.175);
  beak.rotation.x = -Math.PI / 2;
  beak.scale.set(1.3, 1, 0.8);
  for (const sx of [-1, 1]) {
    add(upper, ball(0.0105, 8, 6), black, sx * 0.034, 0.32, -0.13); // eyes
    add(upper, ball(0.0035, 6, 4), white, sx * 0.0385, 0.3245, -0.1345); // and a glint in each
  }
  return g;
}

// La Oca VR: a goose waits on the board while dice tumble overhead
function dice() {
  const g = new THREE.Group();
  const wood = std('#5a3d25', { roughness: 0.7 });
  const top = new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.7 });
  add(g, new THREE.BoxGeometry(0.86, 0.06, 0.86), [wood, wood, top, wood, wood, wood], 0, 0.03, 0);

  const bird = goose();
  bird.position.set(-0.28, 0.06, 0.28);
  bird.rotation.y = 2.4;
  g.add(bird);

  const resting = die('#2f9e44', '#ffffff');
  resting.position.set(0.2, 0.135, -0.18);
  resting.rotation.y = 0.5;
  g.add(resting);
  const flying = [[die('#d63a3a', '#ffffff'), 0.4, 0], [die('#f1ede0', '#222222'), 0.62, 2.1], [die('#2f9e44', '#ffffff', 0.12), 0.5, 4.2]]
    .map(([m, y, phase]) => { g.add(m); return { m, y, phase }; });

  return {
    object: g,
    update(t) {
      flying.forEach(({ m, y, phase }, i) => {
        const a = t * 0.9 + phase;
        m.position.set(Math.cos(a * 0.7) * 0.22, y + Math.sin(a * 1.3) * 0.05, Math.sin(a * 0.7) * 0.22);
        m.rotation.set(a * 1.1 + i, a * 0.8, a * 0.5);
      });
    },
  };
}

// Z-Run: a runner and a zombie chasing each other round a stretch of road
function figure({ skin, shirt, pants, zombie = false }) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skinM = std(skin);
  const shirtM = std(shirt);
  const pantsM = std(pants);
  add(body, box(0.15, 0.2, 0.09), shirtM, 0, 0.36, 0);
  add(body, ball(0.062, 10, 8), skinM, 0, 0.53, 0);
  const limb = (m, w, h, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    add(pivot, box(w, h, w), m, 0, -h / 2, 0);
    body.add(pivot);
    return pivot;
  };
  const arms = [limb(zombie ? skinM : shirtM, 0.045, 0.2, -0.1, 0.45), limb(zombie ? skinM : shirtM, 0.045, 0.2, 0.1, 0.45)];
  const legs = [limb(pantsM, 0.055, 0.26, -0.04, 0.26), limb(pantsM, 0.055, 0.26, 0.04, 0.26)];
  return { root, body, arms, legs, zombie };
}

function runner() {
  const g = new THREE.Group();
  add(g, cyl(0.5, 0.5, 0.05, 40), std('#4c5156', { roughness: 0.9 }), 0, 0.025, 0);
  const dashM = bright('#d9b94a');
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const dash = add(g, box(0.1, 0.006, 0.02), dashM, Math.cos(a) * 0.3, 0.052, -Math.sin(a) * 0.3);
    dash.rotation.y = a + Math.PI / 2;
  }

  const ring = new THREE.Group();
  g.add(ring);
  const hero = figure({ skin: '#e0b48a', shirt: '#d9d4c8', pants: '#3c4658' });
  const horde = [0, 1].map(() => figure({ skin: '#8aa862', shirt: '#4d5a40', pants: '#3a3a36', zombie: true }));
  const cast = [[hero, 0], [horde[0], -0.95], [horde[1], -1.55]];
  for (const [f, angle] of cast) {
    const pivot = new THREE.Group();
    pivot.rotation.y = angle;
    f.root.position.x = 0.3;
    f.root.position.y = 0.05;
    pivot.add(f.root);
    ring.add(pivot);
  }

  return {
    object: g,
    update(t) {
      ring.rotation.y = t * 1.3;
      cast.forEach(([f], i) => {
        const ph = t * 9 + i * 1.7;
        const swing = Math.sin(ph);
        f.legs[0].rotation.x = swing * 0.9;
        f.legs[1].rotation.x = -swing * 0.9;
        if (f.zombie) {
          f.arms.forEach((a) => { a.rotation.x = 1.45 + Math.sin(ph * 0.5) * 0.1; }); // arms reaching forward
          f.body.rotation.x = -0.28;
        } else {
          f.arms[0].rotation.x = -swing * 0.8;
          f.arms[1].rotation.x = swing * 0.8;
          f.body.rotation.x = -0.14;
        }
        f.body.position.y = Math.abs(swing) * 0.012;
      });
    },
  };
}

// Unreal

// Johnson's Mansion: a gabled house with softly glowing windows
function mansion() {
  const g = new THREE.Group();
  const wall = std('#5a4650');
  const roof = std('#2a2230');
  const trim = std('#3a2c34');
  const house = new THREE.Group();
  house.position.y = 0.03;
  g.add(house);

  add(g, box(0.9, 0.03, 0.62), std('#2b2724', { roughness: 0.9 }), 0, 0.015, 0);
  add(house, box(0.74, 0.38, 0.4), wall, 0, 0.19, 0);
  const r = gable(0.82, 0.24, 0.38, roof); // shallower than the house, so the tower stands clear of the roof
  r.position.y = 0.38;
  house.add(r);
  add(house, box(0.22, 0.62, 0.25), wall, 0, 0.31, 0.08); // tower, a few millimetres proud of the front wall so their faces never coincide
  const tr = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.26, 4), roof);
  tr.position.set(0, 0.75, 0.08);
  tr.rotation.y = Math.PI / 4;
  house.add(tr);
  add(house, box(0.07, 0.2, 0.07), trim, 0.27, 0.55, -0.06); // chimney
  add(house, box(0.1, 0.17, 0.02), std('#1b1410'), 0, 0.085, 0.205); // door

  const lit = new THREE.Color('#ffcb6b');
  const windows = [];
  // windows are thin blocks sunk into the wall, a flat pane would z-fight with it
  const pane = box(0.07, 0.1, 0.03);
  const OUT = 0.008; // block centre offset from the wall surface
  const addWindow = (x, y, z, ry = 0) => {
    const m = bright(lit.clone());
    const w = add(house, pane, m, x, y, z);
    w.rotation.y = ry;
    windows.push(m);
  };
  for (const x of [-0.3, -0.18, 0.18, 0.3]) addWindow(x, 0.22, 0.2 + OUT);
  addWindow(0, 0.42, 0.2 + OUT); // the tower's window
  for (const x of [-0.2, 0, 0.2]) addWindow(x, 0.22, -0.2 - OUT, Math.PI);
  for (const z of [-0.08, 0.08]) { addWindow(0.37 + OUT, 0.22, z, Math.PI / 2); addWindow(-0.37 - OUT, 0.22, z, -Math.PI / 2); }

  return {
    object: g,
    update(t) {
      g.rotation.y = t * 0.25;
      windows.forEach((m, i) => { // a slow, soft candle glow: no sudden blackouts
        const f = 0.88 + 0.12 * Math.sin(t * 1.3 + i * 1.9) * Math.sin(t * 0.7 + i * 0.7);
        m.color.copy(lit).multiplyScalar(f);
      });
    },
  };
}

// Godot

function checkerTexture() {
  const S = 192;
  const [c, x] = canvas2d(S, S);
  const n = 6;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      x.fillStyle = (i + j) % 2 ? '#c8202f' : (i % 2 ? '#2b2b2b' : '#8c8c8c');
      x.fillRect((i * S) / n, (j * S) / n, S / n + 1, S / n + 1);
    }
  }
  return canvasTexture(c);
}

// Takes Two to Tango: the left, up and right arrows light up on the beat
function arrows() {
  const g = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.6 });
  const side = std('#1b1b1b');
  add(g, new THREE.BoxGeometry(0.86, 0.05, 0.86), [side, side, top, side, side, side], 0, 0.025, 0);

  const s = new THREE.Shape();
  s.moveTo(0, 0.14);
  s.lineTo(0.12, 0);
  s.lineTo(0.05, 0);
  s.lineTo(0.05, -0.14);
  s.lineTo(-0.05, -0.14);
  s.lineTo(-0.05, 0);
  s.lineTo(-0.12, 0);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
  geo.translate(0, 0, -0.02);

  const turn = new THREE.Group();
  g.add(turn);
  const items = [Math.PI / 2, 0, -Math.PI / 2].map((rot, i) => { // left, up, right
    const mat = std('#e63946', { emissive: '#e63946', emissiveIntensity: 0.1, flatShading: false });
    const m = add(turn, geo, mat, (i - 1) * 0.33, 0.42, 0);
    m.rotation.z = rot;
    return { m, mat, level: 0 };
  });

  return {
    object: g,
    update(t, dt) {
      const beat = Math.floor(t * (112 / 60)) % 3;
      turn.rotation.y = Math.sin(t * 0.5) * 0.6;
      items.forEach((it, i) => {
        it.level += ((i === beat ? 1 : 0) - it.level) * (1 - Math.exp(-dt * 14));
        it.m.scale.setScalar(1 + it.level * 0.3);
        it.mat.emissiveIntensity = 0.1 + it.level * 1.1;
      });
    },
  };
}

const NOISE_VERT = /* glsl */`
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

// The same dissolve idea as the Shader Gallery, running live on a sphere
const NOISE_FRAG = /* glsl */`
  uniform float uTime;
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  void main() {
    float n = noise(vPos * 8.0) * 0.65 + noise(vPos * 17.0) * 0.35;
    float cut = 0.45 + 0.5 * sin(uTime * 0.7);
    float edge = n - cut;
    if (edge < 0.0) discard;
    vec3 N = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 base = mix(vec3(0.16, 0.38, 0.62), vec3(0.3, 0.64, 0.88), N.y * 0.5 + 0.5);
    float rim = pow(1.0 - max(dot(N, normalize(vView)), 0.0), 2.5);
    vec3 col = base + rim * vec3(0.25, 0.45, 0.6);
    col = mix(col, vec3(1.0, 0.6, 0.18) * 1.8, smoothstep(0.07, 0.0, edge));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// Shader Test
function shader() {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, vertexShader: NOISE_VERT, fragmentShader: NOISE_FRAG, side: THREE.DoubleSide,
  });
  const orb = add(g, new THREE.SphereGeometry(0.3, 64, 48), mat, 0, 0.5, 0);
  return {
    object: g,
    update(t) {
      mat.uniforms.uTime.value = t;
      orb.rotation.y = t * 0.3;
    },
  };
}

// A flat pixel-art character that always faces the visitor.
// 'spin' turns it in its own plane, speeding up and then letting go. 'bob' floats it with projectiles orbiting.
function sprite({ src, motion = 'bob', height = 0.7 }) {
  const g = new THREE.Group();
  const flat = new THREE.Group();
  g.add(flat);
  const material = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false });
  const plate = add(flat, new THREE.PlaneGeometry(1, 1), material, 0, 0, 0);
  plate.scale.set(height, height, 1);
  new THREE.TextureLoader().load(src, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = tex.minFilter = THREE.NearestFilter; // keep the pixels sharp
    tex.generateMipmaps = false;
    material.map = tex;
    material.needsUpdate = true;
    plate.scale.set((height * tex.image.width) / tex.image.height, height, 1);
    if (motion === 'spin') { // a spinning picture sweeps a circle, so lift it clear of the plinth
      base = Math.hypot(plate.scale.x, height) / 2 + 0.03;
      flat.position.y = base;
    }
  }, undefined, () => console.warn(`[museum] Could not load the sprite "${src}".`));

  let base = motion === 'spin' ? 0.45 : height / 2 + 0.06;
  flat.position.y = base;
  add(g, cyl(0.26, 0.28, 0.02, 24), std('#2c2a30', { roughness: 0.8, flatShading: false }), 0, 0.01, 0);

  const bolts = motion === 'bob'
    ? [0, 1, 2].map(() => add(g, box(0.045, 0.045, 0.045), bright('#ff8a3d'), 0, base, 0))
    : [];
  let angle = 0;
  return {
    object: g,
    update(t, dt, camera) {
      faceCamera(flat, camera);
      if (motion === 'spin') {
        const phase = (t % 9) / 9; // build up speed, then release (rad/s: never faster than about three quarters of a turn a second)
        const speed = phase < 0.75 ? 0.5 + smooth(phase / 0.75) * 4.2 : 4.7 - smooth((phase - 0.75) / 0.25) * 4.2;
        angle += speed * dt;
        plate.rotation.z = angle;
      } else {
        flat.position.y = base + Math.sin(t * 2) * 0.025;
        plate.rotation.z = Math.sin(t * 1.1) * 0.06;
        bolts.forEach((b, i) => {
          const a = t * 1.5 + (i * TAU) / 3;
          b.position.set(Math.cos(a) * 0.4, base + Math.sin(a * 2) * 0.08, Math.sin(a) * 0.4);
        });
      }
    },
  };
}

// Blender

// Dinosaur Park: a little diorama with a gate, a jeep, trees and the lab, floating just above its base
function diorama() {
  const g = new THREE.Group();
  const soil = std('#33302b');
  const grass = std('#5cc13a');
  const path = std('#d8cfae');
  const trunk = std('#6b4a2b');
  const leaves = ['#3f9e2a', '#78c93c', '#c8c63a'].map((c) => std(c));
  const stone = std('#8e8571');

  add(g, box(0.9, 0.16, 0.9), soil, 0, 0.08, 0);
  add(g, box(0.9, 0.07, 0.9), grass, 0, 0.195, 0);
  // sunk into the grass and slightly longer than it, so no face is coplanar with the grass
  add(g, box(0.15, 0.038, 0.91), path, 0, 0.219, 0);

  for (const sx of [-1, 1]) {
    add(g, box(0.05, 0.22, 0.05), stone, sx * 0.14, 0.34, -0.3);
    add(g, box(0.25, 0.015, 0.02), std('#6e6a5e'), sx * 0.27, 0.27, -0.3);
  }
  add(g, box(0.34, 0.04, 0.06), std('#7a5a34'), 0, 0.44, -0.3);

  const rand = rng(hash('diorama'));
  [[-0.3, -0.28], [-0.33, 0.1], [0.31, -0.22], [0.34, 0.2], [-0.27, 0.35], [0.2, 0.36], [-0.12, -0.15]].forEach(([x, z], i) => {
    const trunkH = 0.1;
    const r = 0.075 + rand() * 0.03;
    add(g, cyl(0.014, 0.02, trunkH, 6), trunk, x, 0.23 + trunkH / 2, z);
    // the crown sits down over the top of the trunk, so the two touch
    const crown = add(g, new THREE.IcosahedronGeometry(r, 0), leaves[i % 3], x, 0.23 + trunkH + r * 0.45, z);
    crown.rotation.y = rand() * 3;
  });

  const jeep = new THREE.Group();
  jeep.position.set(0.0, 0.238, 0.22);
  jeep.rotation.y = 0.15;
  g.add(jeep);
  add(jeep, box(0.1, 0.035, 0.18), std('#9aa05a'), 0, 0.04, 0);
  add(jeep, box(0.09, 0.04, 0.08), std('#9aa05a'), 0, 0.075, 0.02);
  for (const [x, z] of [[-0.055, -0.06], [0.055, -0.06], [-0.055, 0.06], [0.055, 0.06]]) {
    add(jeep, cyl(0.025, 0.025, 0.02, 8), std('#1f1f1f'), x, 0.025, z).rotation.z = Math.PI / 2;
  }

  add(g, box(0.22, 0.1, 0.2), std('#2a2f2c'), 0.26, 0.28, 0); // the lab, with glowing tubes along its wall
  for (const dz of [-0.06, 0, 0.06]) add(g, cyl(0.022, 0.022, 0.09, 8), bright('#4dff2f'), 0.372, 0.28, dz);

  // It hovers a few centimetres above the plinth, with a soft shadow to show the gap
  const FLOAT = 0.07;
  const group = new THREE.Group(); // the root keeps its position: the museum sets it to the plinth's height
  group.add(g);
  group.scale.setScalar(1.05);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: glowTexture(), color: '#000', transparent: true, opacity: 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
  });
  const shadow = add(group, new THREE.PlaneGeometry(1, 1), shadowMat, 0, 0.002, 0);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.setScalar(0.62); // no wider than the plinth, so it never spills over the edge
  shadow.raycast = () => {};
  return {
    object: group,
    update(t) {
      const lift = Math.sin(t * 0.9);
      g.rotation.y = t * 0.3;
      g.position.y = FLOAT + lift * 0.015;
      shadowMat.opacity = 0.34 - lift * 0.04;
    },
  };
}

// A plain sword: a blade, a guard and a grip
function sword() {
  const k = new THREE.Group();
  add(k, box(0.035, 0.16, 0.035), std('#1b1b1b'), 0, 0.08, 0); // grip
  add(k, box(0.1, 0.02, 0.05), std('#d8b24f', { metalness: 1, roughness: 0.3 }), 0, 0.17, 0); // guard
  add(k, box(0.04, 0.62, 0.012), std('#e4e8ee', { metalness: 0.5, roughness: 0.25, flatShading: false }), 0, 0.49, 0); // blade
  return k;
}

// Zoro, in the same pose as the render: arms out with a sword in each hand and a third in his teeth
function zoro() {
  const g = new THREE.Group();
  const skin = std('#e8b48c');
  const white = std('#f2f0ea');
  const black = std('#1c1c22');
  const green = std('#4a9a3c');
  const gold = std('#d8b24f', { metalness: 1, roughness: 0.3 });

  const body = new THREE.Group();
  g.add(body);
  add(g, cyl(0.2, 0.22, 0.03, 20), std('#2b2724', { roughness: 0.8 }), 0, 0.015, 0);
  for (const sx of [-1, 1]) {
    add(body, box(0.075, 0.34, 0.085), black, sx * 0.055, 0.2, 0); // legs
    add(body, box(0.085, 0.07, 0.125), std('#2a2a30'), sx * 0.055, 0.065, -0.012); // boots
    add(body, box(0.26, 0.05, 0.05), white, sx * 0.17, 0.62, 0); // arms, held straight out
    add(body, ball(0.03, 8, 6), skin, sx * 0.3, 0.62, 0); // hands
  }
  add(body, box(0.2, 0.28, 0.11), white, 0, 0.52, 0); // shirt
  add(body, box(0.215, 0.075, 0.125), green, 0, 0.385, 0); // the green sash
  add(body, ball(0.078, 14, 10), skin, 0, 0.72, 0); // head
  const cap = add(body, ball(0.083, 14, 8), black, 0, 0.75, 0); // black bandana
  cap.scale.y = 0.62;
  for (let i = 0; i < 3; i++) add(body, box(0.012, 0.03, 0.012), gold, -0.087, 0.7 - i * 0.032, 0.01); // earrings
  for (const sx of [-1, 1]) add(body, ball(0.01, 6, 4), black, sx * 0.03, 0.73, 0.073); // eyes

  const place = (k, x, y, z, rz, s = 0.5) => {
    k.position.set(x, y, z);
    k.rotation.z = rz;
    k.scale.setScalar(s);
    body.add(k);
  };
  place(sword(), 0.3, 0.62, 0, -Math.PI / 2); // right hand
  place(sword(), -0.3, 0.62, 0, Math.PI / 2); // left hand
  place(sword(), -0.2, 0.705, 0.085, -Math.PI / 2, 0.45); // across his teeth

  return {
    object: g,
    update(t) {
      body.rotation.y = Math.sin(t * 0.5) * 0.9;
    },
  };
}

// Web

function coverTexture(i) {
  const S = [192, 272];
  const [c, x] = canvas2d(...S);
  const r = rng(hash(`case${i}`));
  const hue = (i * 67 + 200) % 360;
  const bg = x.createLinearGradient(0, 0, S[0], S[1]);
  bg.addColorStop(0, `hsl(${hue}, 70%, 46%)`);
  bg.addColorStop(1, `hsl(${(hue + 50) % 360}, 75%, 26%)`);
  x.fillStyle = bg;
  x.fillRect(0, 0, ...S);
  x.fillStyle = `hsla(${(hue + 160) % 360}, 90%, 70%, 0.55)`;
  x.beginPath();
  x.arc(S[0] * (0.3 + r() * 0.4), S[1] * (0.4 + r() * 0.2), 40 + r() * 36, 0, TAU);
  x.fill();
  x.fillStyle = 'rgba(255,255,255,0.18)';
  x.beginPath();
  x.moveTo(0, S[1]);
  x.lineTo(S[0], S[1] * (0.55 + r() * 0.2));
  x.lineTo(S[0], S[1]);
  x.fill();
  x.fillStyle = 'rgba(0,0,0,0.55)';
  x.fillRect(0, 0, S[0], 26);
  x.fillStyle = '#fff';
  x.font = `700 15px ${FONT.mono}`;
  x.fillText('PN', 10, 18);
  return canvasTexture(c);
}

// PlayNexus: a rack of game cases
function cases() {
  const g = new THREE.Group();
  const black = std('#14141a', { roughness: 0.4 });
  const rack = new THREE.Group();
  g.add(rack);
  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 5) * TAU;
    rack.add(pivot);
    const front = new THREE.MeshStandardMaterial({ map: coverTexture(i), roughness: 0.45 });
    const m = add(pivot, new THREE.BoxGeometry(0.24, 0.34, 0.035), [black, black, black, black, front, black], 0, 0.4, 0.24);
    m.rotation.x = -0.1;
  }
  add(g, cyl(0.12, 0.2, 0.34, 8), std('#2b2724'), 0, 0.17, 0);
  return {
    object: g,
    update(t) {
      rack.rotation.y = t * 0.35;
      rack.position.y = Math.sin(t * 1.2) * 0.015;
    },
  };
}

function browserTexture() {
  const [c, x] = canvas2d(512, 340);
  x.fillStyle = '#f4f6f7';
  x.fillRect(0, 0, 512, 340);
  x.fillStyle = '#2b2d36';
  x.fillRect(0, 0, 512, 34);
  ['#ff6159', '#ffbd2e', '#28c941'].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(20 + i * 20, 17, 6, 0, TAU); x.fill(); });
  x.fillStyle = '#454856';
  x.fillRect(96, 8, 300, 18);
  x.fillStyle = '#6fd0d8';
  x.fillRect(0, 34, 512, 130);
  x.fillStyle = '#10333a';
  x.fillRect(36, 70, 230, 20);
  x.fillStyle = 'rgba(16,51,58,0.55)';
  x.fillRect(36, 102, 300, 10);
  x.fillRect(36, 120, 250, 10);
  x.fillStyle = '#10333a';
  x.fillRect(36, 140, 90, 12);
  for (let i = 0; i < 3; i++) {
    const cx = 28 + i * 162;
    x.fillStyle = '#ffffff';
    x.fillRect(cx, 184, 148, 130);
    x.fillStyle = ['#a8e3e8', '#f5c6a5', '#c7c1f0'][i];
    x.fillRect(cx + 10, 194, 128, 56);
    x.fillStyle = '#c8ced1';
    x.fillRect(cx + 10, 262, 100, 8);
    x.fillRect(cx + 10, 278, 118, 8);
    x.fillRect(cx + 10, 294, 70, 8);
  }
  return canvasTexture(c);
}

// Estudiants Vic: a web page floating above the plinth
function browser() {
  const g = new THREE.Group();
  const win = new THREE.Group();
  win.position.y = 0.52;
  g.add(win);
  const tex = browserTexture();
  add(win, box(0.76, 0.51, 0.02), std('#1c1c22', { roughness: 0.4 }), 0, 0, 0);
  const faceGeo = new THREE.PlaneGeometry(0.72, 0.72 * 340 / 512);
  const faceMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  add(win, faceGeo, faceMat, 0, 0, 0.0105);
  const back = add(win, faceGeo, faceMat, 0, 0, -0.0105);
  back.rotation.y = Math.PI;
  add(g, cyl(0.04, 0.05, 0.24, 8), std('#2b2724'), 0, 0.12, 0);
  return {
    object: g,
    update(t) {
      win.rotation.y = Math.sin(t * 0.45) * 0.75;
      win.position.y = 0.55 + Math.sin(t * 1.1) * 0.02;
    },
  };
}

// Main Hall: solar system

// A planet's skin as a small canvas: stripes of colour, with a few spots and patches on top
function planetSkin(seed, base, paint) {
  const [c, x] = canvas2d(256, 128);
  const r = rng(hash(seed));
  x.fillStyle = base;
  x.fillRect(0, 0, 256, 128);
  paint?.(x, r);
  return canvasTexture(c);
}

// Horizontal stripes of the given colours, each a random height
function stripes(x, r, colors, alpha = 1) {
  let y = 0;
  let i = 0;
  while (y < 128) {
    const h = 6 + r() * 16;
    x.globalAlpha = alpha;
    x.fillStyle = colors[i++ % colors.length];
    x.fillRect(0, y, 256, h);
    y += h;
  }
  x.globalAlpha = 1;
}

const blot = (x, cx, cy, rx, ry) => {
  x.beginPath();
  x.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  x.fill();
};

const SKINS = {
  mercury: () => planetSkin('mercury', '#8f8a84', (x, r) => {
    x.fillStyle = 'rgba(60,56,52,0.35)';
    for (let i = 0; i < 40; i++) blot(x, r() * 256, 10 + r() * 108, 2 + r() * 6, 2 + r() * 5);
  }),
  venus: () => planetSkin('venus', '#e3c48c', (x, r) => stripes(x, r, ['#ebd2a0', '#d8b57a', '#e9cb93'], 0.7)),
  earth: () => planetSkin('earth', '#2c6fb7', (x, r) => {
    x.fillStyle = '#4f9a49';
    for (let i = 0; i < 12; i++) blot(x, r() * 256, 22 + r() * 84, 8 + r() * 22, 5 + r() * 14);
    x.fillStyle = '#c8b46a';
    for (let i = 0; i < 4; i++) blot(x, r() * 256, 30 + r() * 68, 5 + r() * 9, 3 + r() * 6);
    x.fillStyle = '#f4f7fa';
    x.fillRect(0, 0, 256, 9);
    x.fillRect(0, 119, 256, 9);
    x.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 14; i++) blot(x, r() * 256, 12 + r() * 104, 10 + r() * 20, 2 + r() * 3);
  }),
  mars: () => planetSkin('mars', '#bb5a2e', (x, r) => {
    x.fillStyle = 'rgba(110,40,20,0.5)';
    for (let i = 0; i < 14; i++) blot(x, r() * 256, 18 + r() * 92, 6 + r() * 20, 4 + r() * 10);
    x.fillStyle = '#f1ebe4';
    x.fillRect(0, 0, 256, 7);
  }),
  jupiter: () => planetSkin('jupiter', '#d8b48a', (x, r) => {
    stripes(x, r, ['#e8d3b0', '#b9855a', '#d9b88c', '#9b6a47', '#efe0c4'], 1);
    x.fillStyle = '#b5472f';
    blot(x, 150, 84, 15, 8); // the great red spot
  }),
  saturn: () => planetSkin('saturn', '#e0c98f', (x, r) => stripes(x, r, ['#e9d7a3', '#d4b97a', '#ecdcb0'], 0.8)),
  uranus: () => planetSkin('uranus', '#9fdde3', (x, r) => stripes(x, r, ['#b3e8ec', '#8ed0d8'], 0.45)),
  neptune: () => planetSkin('neptune', '#3556c8', (x, r) => {
    stripes(x, r, ['#4a6fe0', '#2c47a8'], 0.5);
    x.fillStyle = 'rgba(20,30,90,0.6)';
    blot(x, 90, 70, 14, 8);
  }),
};

// name, radius, orbit radius, tilt of its axis, how fast it turns on itself
const PLANETS = [
  ['mercury', 0.036, 0.36, 0.03, 0.8],
  ['venus', 0.06, 0.5, 3.1, -0.3],
  ['earth', 0.065, 0.64, 0.41, 1.6],
  ['mars', 0.048, 0.78, 0.44, 1.5],
  ['jupiter', 0.13, 1.04, 0.05, 2.4],
  ['saturn', 0.105, 1.27, 0.47, 2.1],
  ['uranus', 0.075, 1.46, 1.7, 1.2],
  ['neptune', 0.072, 1.62, 0.5, 1.3],
];
const BELT = 0.91; // the asteroid belt, between Mars and Jupiter

// Solar system for the middle of the Main Hall: sun, eight planets (not to scale, inner ones faster),
// a moon, Saturn's rings and the asteroid belt. No orbit lines. It hangs above eye level.
function solarSystem() {
  const root = new THREE.Group(); // its origin is the top of the pedestal
  const HEIGHT = 1.5;

  const sys = new THREE.Group();
  sys.position.y = HEIGHT;
  root.add(sys);

  const sunMat = bright('#ffbb3a');
  const sun = add(sys, new THREE.SphereGeometry(0.2, 32, 20), sunMat, 0, 0, 0);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color: '#ff9a2e', blending: THREE.AdditiveBlending, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false,
  }));
  glow.scale.setScalar(1.15);
  sys.add(glow);

  const rand = rng(hash('belt'));
  const rocks = [];
  for (let i = 0; i < 90; i++) {
    const a = rand() * TAU;
    const d = BELT - 0.04 + rand() * 0.08;
    rocks.push(new THREE.IcosahedronGeometry(0.006 + rand() * 0.008, 0).translate(Math.cos(a) * d, (rand() - 0.5) * 0.03, Math.sin(a) * d));
  }
  const belt = add(sys, mergeGeometries(rocks), std('#8d857a'), 0, 0, 0);

  const LEAN = [0.1, 0.05, 0.0, 0.04, 0.035, 0.07, 0.03, 0.055]; // how far each orbit leans away from flat, so they do not all lie in one plane
  const orbits = PLANETS.map(([name, radius, orbit, tilt, spin], i) => {
    const lean = new THREE.Group(); // tips the whole orbit a little, a different way for each
    lean.rotation.set(Math.cos(i * 2.1) * LEAN[i], 0, Math.sin(i * 2.1) * LEAN[i]);
    sys.add(lean);
    const pivot = new THREE.Group(); // turns about the sun, taking the planet with it
    lean.add(pivot);
    const axis = new THREE.Group(); // leans over, so the planet turns about a tilted axis
    axis.position.x = orbit;
    axis.rotation.z = tilt;
    pivot.add(axis);
    const body = add(axis, new THREE.SphereGeometry(radius, 24, 16), new THREE.MeshStandardMaterial({ map: SKINS[name](), roughness: 0.8 }), 0, 0, 0);
    let moon = null;
    if (name === 'saturn') {
      const ring = add(axis, new THREE.RingGeometry(radius * 1.35, radius * 2.15, 56), new THREE.MeshStandardMaterial({
        color: '#d9c7a0', roughness: 0.8, side: THREE.DoubleSide,
      }), 0, 0, 0);
      ring.rotation.x = -Math.PI / 2;
    }
    if (name === 'earth') {
      moon = new THREE.Group();
      pivot.add(moon);
      moon.position.x = orbit;
      add(moon, new THREE.SphereGeometry(0.017, 14, 10), std('#b9b6b0', { flatShading: false }), 0.115, 0, 0);
    }
    return { pivot, body, moon, speed: 0.3 * (0.36 / orbit) ** 1.5, phase: i * 1.35 + 0.4, spin };
  });

  return {
    object: root,
    update(t) {
      for (const o of orbits) {
        o.pivot.rotation.y = o.phase + t * o.speed;
        o.body.rotation.y = t * o.spin;
        if (o.moon) o.moon.rotation.y = t * 2.6;
      }
      belt.rotation.y = t * 0.02;
      sun.rotation.y = t * 0.05;
      sys.position.y = HEIGHT + Math.sin(t * 0.6) * 0.03; // it hovers, with nothing holding it up
      sun.scale.setScalar(1 + Math.sin(t * 1.3) * 0.02);
      glow.scale.setScalar(1.15 * (1 + Math.sin(t * 0.9) * 0.04));
    },
  };
}

// glTF models

// A .glb scaled to fit the plinth. The project's procedural emblem, if it has one, stands in until
// the model loads and stays if it fails.
function model(src, fallback) {
  const root = new THREE.Group();
  const stand = fallback?.();
  if (stand) root.add(stand.object);
  const holder = new THREE.Group();
  root.add(holder);
  let loaded = false;
  new GLTFLoader().load(src, (gltf) => {
    const scene = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(scene);
    const size = bounds.getSize(new THREE.Vector3());
    const k = Math.min(0.85 / Math.max(size.y, 1e-3), 0.8 / Math.max(size.x, size.z, 1e-3));
    scene.scale.setScalar(k);
    const fit = new THREE.Box3().setFromObject(scene);
    scene.position.set(-(fit.min.x + fit.max.x) / 2, -fit.min.y, -(fit.min.z + fit.max.z) / 2); // centred, resting on the plinth
    holder.add(scene);
    if (stand) { root.remove(stand.object); stand.object.traverse((o) => { o.geometry?.dispose?.(); }); }
    loaded = true;
  }, undefined, () => console.warn(`[museum] Could not load the model "${src}".`));
  return {
    object: root,
    update(t, dt, camera) {
      if (loaded) holder.rotation.y = t * 0.4;
      else stand?.update?.(t, dt, camera);
    },
  };
}

export { solarSystem };

export const EMBLEMS = {
  tank, dice, runner, mansion, arrows, shader, diorama, zoro, cases, browser, sprite,
};

// `spec` is the project's emblem fields: { emblem } | { emblem: 'sprite', sprite } | { model, emblem? }
export function buildEmblem(spec) {
  const make = EMBLEMS[spec.emblem];
  if (spec.emblem && !make) console.warn(`[museum] Unknown emblem "${spec.emblem}". Choose one of: ${Object.keys(EMBLEMS).join(', ')}`);
  if (spec.model) return model(spec.model, make && spec.emblem !== 'sprite' ? make : null);
  if (spec.emblem === 'sprite') return spec.sprite?.src ? sprite(spec.sprite) : null;
  return make ? make() : null;
}
