// Builds the museum from content.js. Each room becomes a hall off the Main Hall (left, far, right
// wall, numbered clockwise). The Main Hall grows with the number of halls and a hall with its work.
// A project is a "bay" on the left or right wall: a hero picture, up to two more and a label,
// with its emblem on a plinth in the aisle. Language sculptures stand along the aisle.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { profile, rooms as roomDefs } from './content.js';
import { tr, say, count } from './i18n.js';
import {
  textTexture, woodTexture, stoneTexture, skylightTexture, glowTexture,
  wallAOTexture, edgeAOTexture, artworkCanvas, blankCanvas, cardCanvas, medallionTexture,
  canvasTexture, prepareTexture,
} from './textures.js';
import { buildEmblem, solarSystem } from './props.js';
import { glyphGeometry } from './glyphs.js';

// Dimensions in metres
const T = 0.3; // wall thickness
const DOOR_W = 2.4;
const DOOR_H = 3.2;
const HUB_H = 7;
const HALL_H = 4.6;
const PLINTH_SLOT = 3.0; // floor length given to each sculpture
const HANG = 1.6; // height of a hero picture's centre
const LABEL_W = 0.8;
const LABEL_H = 0.5;
const LABEL_GAP = 0.25;

// Bay layout: outer sizes (picture + mat + moulding) of the frames in a cluster
const HERO_OW = 2.95;
const HERO_OH = 1.95;
const COL_OH = 1.95; // height of the supporting column
const STACK_OW = 1.6; // two pictures stacked
const SINGLE_OW = 1.9; // one picture on its own
const BAY_GAP = 0.3;
const BAY_MARGIN = 0.7; // bare wall either side of a bay
const HALL_START = 2.0; // first bay begins this far from the doorway
const TALL = 0.75; // narrower than this reads as a poster
const VIEW_DIST = 3.0; // how far from the wall the "walk to this piece" view stands
const BENCH_R = 2.5; // paths curve around the Main Hall's bench

// three.js sorts transparent objects by distance, so overlapping glows (a plinth shadow on a skylight
// pool) swap order as you walk and pulse. A fixed render order avoids that.
const GLOW_ORDER = { pool: 1, shadow: 2, wash: 3 };

const box = new THREE.BoxGeometry(1, 1, 1);
const plane = new THREE.PlaneGeometry(1, 1);

const SHAPES = {
  torusKnot: () => new THREE.TorusKnotGeometry(0.2, 0.065, 180, 24),
  icosahedron: () => new THREE.IcosahedronGeometry(0.3, 0),
  octahedron: () => new THREE.OctahedronGeometry(0.32, 0),
  dodecahedron: () => new THREE.DodecahedronGeometry(0.3, 0),
  torus: () => new THREE.TorusGeometry(0.24, 0.08, 32, 72),
  cone: () => new THREE.ConeGeometry(0.26, 0.55, 5),
  capsule: () => new THREE.CapsuleGeometry(0.15, 0.3, 12, 24),
  box: () => new THREE.BoxGeometry(0.38, 0.38, 0.38),
  sphere: () => new THREE.SphereGeometry(0.28, 48, 24),
};
const FACETED = new Set(['icosahedron', 'octahedron', 'dodecahedron', 'cone', 'box']);

const FLOORS = {
  oak: { kind: 'wood', hue: 27, sat: 26, light: 33, seed: 11 },
  walnut: { kind: 'wood', hue: 20, sat: 30, light: 21, seed: 31 },
  ash: { kind: 'wood', hue: 32, sat: 8, light: 50, seed: 41 },
  birch: { kind: 'wood', hue: 36, sat: 34, light: 55, seed: 51 },
  slate: { kind: 'stone', hue: 215, sat: 8, light: 30, seed: 61 },
};

export function roman(n) {
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
  return s;
}

export function catalogueNo(ex) {
  return say('no', { n: String(ex.no).padStart(3, '0') });
}

// text colours for a wall colour
function inksFor(hex) {
  const c = new THREE.Color(hex);
  const light = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b > 0.3;
  return light
    ? { ink: '#1c1a17', soft: '#6b645a', rule: 'rgba(28,26,23,0.35)' }
    : { ink: '#f3eee4', soft: 'rgba(243,238,228,0.7)', rule: 'rgba(243,238,228,0.35)' };
}

function createMaterials() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o });
  const edgeAO = edgeAOTexture();
  return {
    edgeAO,
    skyTex: skylightTexture(),
    ceiling: std('#f2efe9', { aoMap: edgeAO }),
    baseboard: std('#26211d', { roughness: 0.6 }),
    trim: std('#e6dfd2', { roughness: 0.7 }),
    reveal: std('#d6cfc2'),
    threshold: std('#b9b1a4', { roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    plinth: std('#f1ede6', { roughness: 0.75 }),
    mat: std('#f7f4ee', { roughness: 1 }),
    brass: std('#b08d57', { metalness: 1, roughness: 0.35 }),
    gold: std('#c9a24a', { metalness: 1, roughness: 0.25 }),
    bench: std('#3b2a1e', { roughness: 0.55 }),
    cushion: std('#4a2f2c', { roughness: 0.95 }),
    steel: std('#161616', { roughness: 0.4, metalness: 0.6 }),
    door: std('#2e2219', { roughness: 0.5 }),
    board: std('#2a2622', { roughness: 0.7 }),
    frames: {
      gold: std('#b8913f', { metalness: 1, roughness: 0.32 }),
      black: std('#141312', { roughness: 0.45 }),
      oak: std('#8a6440', { roughness: 0.6 }),
      white: std('#eeeae2', { roughness: 0.6 }),
      silver: std('#c9ccd1', { metalness: 1, roughness: 0.3 }),
    },
  };
}

// bay layout

// largest picture of this aspect that fits the outer box, mat and moulding included
function fitFrame(aspect, maxOW, maxOH, big) {
  const border = big ? 0.175 : 0.105;
  const aw = Math.max(0.2, Math.min(maxOW - 2 * border, (maxOH - 2 * border) * aspect));
  const ah = aw / aspect;
  return {
    aw, ah, ow: aw + 2 * border, oh: ah + 2 * border, m: big ? 0.1 : 0.06, f: big ? 0.075 : 0.045, big, max: [maxOW, maxOH],
  };
}

// A bay is the hero plus a column beside it: two stacked pictures, or one (a tall poster goes alone).
// The rest only show in the detail view. Centres are measured from the cluster's left edge, y = 0 at the hero.
function bayLayout(shots) {
  const hero = fitFrame(shots[0].aspect, HERO_OW, HERO_OH, true);
  const frames = [{ ...hero, shot: 0, cx: hero.ow / 2, cy: 0 }];
  let width = hero.ow;
  const rest = shots.slice(1);
  const col = rest.length >= 2 && rest[0].aspect >= TALL && rest[1].aspect >= TALL ? [1, 2] : rest.length ? [1] : [];
  if (col.length) {
    const cell = col.length === 2 ? (COL_OH - BAY_GAP * 0.4) / 2 : COL_OH;
    const placed = col.map((i) => fitFrame(shots[i].aspect, col.length === 2 ? STACK_OW : SINGLE_OW, cell, false));
    const colW = Math.max(...placed.map((p) => p.ow));
    placed.forEach((p, k) => {
      // only the upper of two stacked pictures gets a lamp, the lower one would clip into the frame above
      frames.push({
        ...p, shot: col[k], cx: width + BAY_GAP + colW / 2, cy: col.length === 2 ? (k === 0 ? 1 : -1) * (cell / 2 + BAY_GAP * 0.2) : 0,
        lamp: !(col.length === 2 && k === 1),
      });
    });
    width += BAY_GAP + colW;
  }
  return { frames, width, full: width + LABEL_GAP + LABEL_W };
}

const isVideoFile = (src) => /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(src);

// video first if there is one, then the pictures
function projectMedia(item) {
  const toShot = (m) => (typeof m === 'string' ? { src: m } : m);
  const images = (item.images ?? (item.image ? [item.image] : [])).map(toShot);
  const lead = images[0];
  const media = [];
  // captions are getters so they follow the language
  if (item.video) {
    const isVideo = isVideoFile(item.video);
    media.push({
      type: isVideo ? 'video' : 'embed', src: item.video, poster: lead?.src,
      aspect: item.videoAspect ?? lead?.aspect,
      get caption() { return tr(item.videoCaption) ?? say(isVideo ? 'media.loop' : 'media.video'); },
    });
  }
  for (const m of images) media.push({ type: 'image', src: m.src, aspect: m.aspect, get caption() { return tr(m.caption) ?? ''; } });
  return media;
}

// `onTexture(tex)` fires for each picture as it loads so the caller can upload it early
export function buildMuseum(scene, { glyphFont = null, onTexture = null } = {}) {
  const root = new THREE.Group();
  root.name = 'museum';
  scene.add(root);

  const M = createMaterials();
  const stone = stoneTexture();
  const glow = glowTexture();
  const additive = (color, opacity) => new THREE.MeshBasicMaterial({
    map: glow, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const washMat = additive('#ffdcae', 0.22); // picture lights on the wall
  const lampGlow = new THREE.MeshBasicMaterial({ color: '#fff0cf', toneMapped: false }); // the lit tube under each lamp
  const poolMat = additive('#fff0d8', 0.13); // skylight falling on the floor
  const shadowMat = new THREE.MeshBasicMaterial({ map: glow, color: '#000', transparent: true, opacity: 0.45, depthWrite: false });
  const loader = new THREE.TextureLoader();

  const colliders = []; // boxes (each at its own angle) and circles on the floor plane (see Player.collide)
  const occluders = []; // wall meshes that block the "look at" ray
  const pickables = []; // objects carrying userData.exhibit
  const spinners = [];
  const swayers = []; // lettering that turns slowly to and fro instead of spinning, so it stays readable
  const animated = []; // emblems: { run(t, dt, camera), hall }
  const hubAnimated = []; // things in the Main Hall that move: { update(t, dt, camera) }
  const screens = []; // exhibits whose hero picture is a video
  let contact = null;
  let tour = null;

  const wallMats = new Map();
  const wallMaterial = (hex, height) => {
    const key = `${hex}/${height}`;
    if (!wallMats.has(key)) {
      const ao = wallAOTexture(height);
      ao.repeat.set(1, 1 / height); // wall UVs are in metres
      wallMats.set(key, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.95, aoMap: ao }));
    }
    return wallMats.get(key);
  };

  const floors = new Map();
  const floorFor = (name) => {
    const key = FLOORS[name] ? name : 'oak';
    if (!floors.has(key)) {
      const p = FLOORS[key];
      floors.set(key, p.kind === 'stone' ? { tex: stoneTexture(p), tile: 4.8 } : { tex: woodTexture(p), tile: 1.6 });
    }
    return floors.get(key);
  };

  // plan

  let counter = 0;
  const halls = roomDefs.map((def, i) => {
    const isLang = Array.isArray(def.languages);
    const items = (isLang ? def.languages : def.projects) ?? [];
    const hall = {
      kind: isLang ? 'languages' : 'gallery',
      def,
      get title() { return tr(def.title); },
      get subtitle() { return tr(def.subtitle) ?? ''; },
      get description() { return tr(def.description) ?? ''; },
      numeral: roman(i + 1),
      width: def.width ?? (isLang ? 10 : 9),
      height: HALL_H,
      length: 10,
      wall: def.wall ?? '#e9e4da',
      floor: def.floor ?? 'oak',
      mood: { light: 1, tint: null, ...def.mood },
    };
    hall.ink = inksFor(hall.wall);
    hall.exhibits = items.map((item) => (isLang
      ? {
        kind: 'language', room: hall, no: item.no ?? ++counter,
        title: item.name ?? 'Untitled', // the same in every language: projects find it through their tags
        get medium() { return tr(item.field) ?? ''; },
        get description() { return tr(item.note) ?? ''; },
        get tagline() { return tr(item.note) ?? ''; },
        glyph: item.glyph ?? null, shape: item.shape ?? 'icosahedron', color: item.color ?? '#b8913f', related: [],
      }
      : projectExhibit(item, hall, def)));
    return hall;
  });

  function projectExhibit(item, hall, def) {
    const media = projectMedia(item);
    const ex = {
      kind: 'project', room: hall, no: item.no ?? ++counter,
      get title() { return tr(item.title) ?? 'Untitled'; },
      get medium() { return tr(item.medium) ?? ''; },
      get tagline() { return tr(item.tagline) ?? ''; },
      get description() { return tr(item.description) ?? ''; },
      get role() { return tr(item.role) ?? ''; },
      get context() { return tr(item.context) ?? ''; },
      get highlights() { return (item.highlights ?? []).map(tr); },
      with: item.with ?? [],
      tags: item.tags ?? [],
      get links() { return (item.links ?? []).map((l) => ({ ...l, label: tr(l.label) })); },
      emblem: item.emblem ?? null, sprite: item.sprite ?? null, model: item.model ?? null, // the sculpture beside it
      get hasEmblem() { return !!(this.emblem || this.model); },
      frame: item.frame ?? def.frame ?? 'black', related: [],
    };

    // Pictures that can hang on the wall (an embedded video can't), each remembering its place in `media`
    ex.shots = media.map((m, index) => ({ ...m, index })).filter((m) => m.type !== 'embed')
      .map((m) => ({ ...m, guessed: m.aspect == null, aspect: m.aspect ?? 16 / 9 }));
    ex.hasImages = media.some((m) => m.type === 'image');
    if (!ex.shots.length) {
      ex.shots = [{ type: 'card', index: media.length, aspect: 16 / 9 }];
      media.push({ type: 'card', caption: '' });
    }
    ex.media = media;

    // Painted art for projects without pictures (a title card) or whose picture fails to load
    ex.fallbackCanvas = () => {
      ex._fallback ??= ex.hasImages
        ? artworkCanvas(`${ex.no}·${ex.title}`, 16 / 9)
        : cardCanvas({ title: ex.title, medium: ex.medium, tagline: ex.tagline, ground: hall.wall, ...item.card });
      return ex._fallback;
    };
    ex.fallbackURL = () => {
      ex._fallbackURL ??= ex.fallbackCanvas().toDataURL('image/jpeg', 0.9);
      return ex._fallbackURL;
    };
    return ex;
  }

  const exhibits = halls.flatMap((h) => h.exhibits);

  // Cross-reference projects and languages through project tags
  const languages = exhibits.filter((e) => e.kind === 'language');
  for (const p of exhibits.filter((e) => e.kind === 'project')) {
    for (const tag of p.tags) {
      const lang = languages.find((l) => l.title.toLowerCase() === String(tag).toLowerCase());
      if (lang) {
        p.related.push(lang);
        lang.related.push(p);
      }
    }
  }

  // Lay out each gallery: bays go to whichever wall has less on it; a hall is as long as its fuller wall
  for (const hall of halls) {
    if (hall.kind === 'languages') {
      hall.length = Math.max(10, Math.ceil(hall.exhibits.length / 2) * PLINTH_SLOT + 4);
      continue;
    }
    const used = { left: HALL_START, right: HALL_START };
    hall.exhibits.forEach((ex, i) => {
      const layout = bayLayout(ex.shots);
      const width = layout.full + 2 * BAY_MARGIN;
      if (i === 0) used.right += width / 2; // the right wall starts half a bay later, so the bays zig-zag down the hall
      const side = used.left <= used.right ? 'left' : 'right';
      ex.bay = { side, layout, d: used[side] + width / 2, width };
      used[side] += width;
    });
    hall.length = Math.max(10, Math.max(used.left, used.right) + 1.5);

    // Stretches of bare wall long enough for a bench
    hall.spare = [];
    for (const side of ['left', 'right']) {
      const bays = hall.exhibits.filter((e) => e.bay.side === side);
      const from = bays.length ? Math.max(...bays.map((e) => e.bay.d + e.bay.width / 2)) : HALL_START;
      const lead = bays.length ? Math.min(...bays.map((e) => e.bay.d - e.bay.width / 2)) : null;
      if (hall.length - 1 - from >= 5) hall.spare.push({ side, from, to: hall.length - 1 });
      if (lead !== null && lead - HALL_START >= 3.2) hall.spare.push({ side, from: HALL_START, to: lead });
    }

    // Emblems stand in the aisle across from their bay; two that would crowd each other step aside
    const spots = hall.exhibits.filter((e) => e.hasEmblem).map((e) => ({ ex: e, d: e.bay.d, x: 0 })).sort((a, b) => a.d - b.d);
    spots.forEach((s, i) => {
      const prev = spots[i - 1];
      if (prev && s.d - prev.d < 1.5) {
        if (prev.x === 0) prev.x = -0.55;
        s.x = prev.x < 0 ? 0.55 : -0.55;
      }
      s.ex.emblemSpot = s;
    });
  }

  // Share the halls out between the left, far and right walls of the Main Hall
  const n = halls.length;
  const perSide = Math.round(n / 3);
  const perFar = n - perSide * 2;
  const spacing = Math.max(9, ...halls.map((h) => h.width)) + 1.6;
  const hub = {
    kind: 'hub', get title() { return say('mainHall'); }, numeral: '', subtitle: '', exhibits: [],
    width: Math.max(22, perFar * spacing + 6),
    depth: Math.max(22, perSide * spacing + 3),
    height: HUB_H,
    wall: '#e8e2d7',
    mood: { light: 1, tint: null },
  };
  hub.ink = inksFor(hub.wall);
  const HW = hub.width;
  const HD = hub.depth;
  const along = (count, k) => (k - (count - 1) / 2) * spacing;

  // Numbered clockwise: left wall front to back, far wall left to right, right wall back to front
  halls.forEach((hall, i) => {
    if (i < perSide) {
      const u = along(perSide, i);
      Object.assign(hall, { side: 'left', u, pos: [-HW / 2, -HD / 2 - u], rot: Math.PI / 2 });
    } else if (i < perSide + perFar) {
      const u = along(perFar, i - perSide);
      Object.assign(hall, { side: 'far', u, pos: [u, -HD], rot: 0 });
    } else {
      const u = along(perSide, i - perSide - perFar);
      Object.assign(hall, { side: 'right', u, pos: [HW / 2, -HD / 2 + u], rot: -Math.PI / 2 });
    }
  });

  // helpers

  function mesh(geo, mat, parent = root) {
    const m = new THREE.Mesh(geo, mat);
    parent.add(m);
    return m;
  }

  function group(parent, x, zPos, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, zPos);
    g.rotation.y = rotY;
    parent.add(g);
    g.updateMatrixWorld(true);
    return g;
  }

  // Box collider from a group's local frame. It keeps the group's rotation (format in Player.collide).
  function addLocalCollider(g, x0, x1, z0, z1) {
    const e = g.matrixWorld.elements;
    const c = new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2).applyMatrix4(g.matrixWorld);
    colliders.push({ x: c.x, z: c.z, ux: e[0], uz: e[2], vx: e[8], vz: e[10], hx: (x1 - x0) / 2, hz: (z1 - z0) / 2 });
  }

  // A viewpoint given in a group's local frame, converted to world space
  function worldView(g, x, zPos, yaw, pitch = 0) {
    const v = new THREE.Vector3(x, 0, zPos).applyMatrix4(g.matrixWorld);
    return { x: v.x, z: v.z, yaw: yaw + g.rotation.y, pitch };
  }

  const cornersOf = (g, x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
    .map(([x, zz]) => { const v = new THREE.Vector3(x, 0, zz).applyMatrix4(g.matrixWorld); return [v.x, v.z]; });

  // A wall is a group with x along the wall, y up and z into the room. `doors` are door centres
  // along it, `reveal` builds the passage through the wall behind each one.
  function makeWall(parent, { len, height: H, mat, x, z: zPos, rot, doors = [], reveal = true }) {
    const g = group(parent, x, zPos, rot);
    const a = len / 2;
    const d = DOOR_W / 2;
    const ds = [...doors].sort((p, q) => p - q);

    const s = new THREE.Shape();
    s.moveTo(-a, 0);
    for (const u of ds) {
      s.lineTo(u - d, 0);
      s.lineTo(u - d, DOOR_H);
      s.lineTo(u + d, DOOR_H);
      s.lineTo(u + d, 0);
    }
    s.lineTo(a, 0);
    s.lineTo(a, H);
    s.lineTo(-a, H);
    occluders.push(mesh(new THREE.ShapeGeometry(s), mat, g));

    let start = -a;
    const segments = [];
    for (const u of ds) {
      segments.push([start, u - d]);
      start = u + d;
    }
    segments.push([start, a]);
    segments.forEach(([u0, u1], i) => {
      // Next to a doorway the baseboard stops short of the door post, so the two never overlap (overlap flickers)
      const b0 = u0 + (i > 0 ? 0.1 : 0);
      const b1 = u1 - (i < segments.length - 1 ? 0.1 : 0);
      const bb = mesh(box, M.baseboard, g);
      bb.scale.set(b1 - b0, 0.14, 0.025);
      bb.position.set((b0 + b1) / 2, 0.07, 0.0125);
      addLocalCollider(g, u0, u1, -T, 0.02); // the wall itself still blocks right up to the door opening
    });

    const cornice = mesh(box, M.trim, g);
    cornice.scale.set(len, 0.12, 0.08);
    cornice.position.set(0, H - 0.06, 0.04);

    for (const u of ds) {
      for (const sx of [-1, 1]) {
        const post = mesh(box, M.trim, g);
        post.scale.set(0.1, DOOR_H + 0.1, 0.03);
        post.position.set(u + sx * (d + 0.05), (DOOR_H + 0.1) / 2, 0.015);
      }
      const head = mesh(box, M.trim, g);
      head.scale.set(DOOR_W + 0.2, 0.1, 0.03);
      head.position.set(u, DOOR_H + 0.05, 0.015);

      if (!reveal) continue;
      for (const sx of [-1, 1]) {
        const jamb = mesh(plane, M.reveal, g);
        jamb.scale.set(T, DOOR_H, 1);
        jamb.rotation.y = -sx * Math.PI / 2;
        jamb.position.set(u + sx * d, DOOR_H / 2, -T / 2);
      }
      const lintel = mesh(plane, M.reveal, g);
      lintel.scale.set(DOOR_W, T, 1);
      lintel.rotation.x = Math.PI / 2;
      lintel.position.set(u, DOOR_H, -T / 2);
      const sill = mesh(plane, M.threshold, g);
      sill.scale.set(DOOR_W, T, 1);
      sill.rotation.x = -Math.PI / 2;
      sill.position.set(u, 0.005, -T / 2); // a few millimetres above the floor, or the two flicker
    }
    return g;
  }

  // Floor, ceiling, skylight and the pool of light it casts on the floor
  function makeShell(parent, { width: W, length: L, height: H, cz, floorTex, tile, skyW, skyL }) {
    const ft = floorTex.clone();
    ft.repeat.set(W / tile, L / tile);
    ft.needsUpdate = true;
    const floor = mesh(plane, new THREE.MeshStandardMaterial({ map: ft, aoMap: M.edgeAO, roughness: 0.5 }), parent);
    floor.rotation.x = -Math.PI / 2;
    floor.scale.set(W, L, 1);
    floor.position.set(0, 0, cz);

    const ceiling = mesh(plane, M.ceiling, parent);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.scale.set(W, L, 1);
    ceiling.position.set(0, H, cz);

    const st = M.skyTex.clone();
    st.repeat.set(Math.max(1, Math.round(skyW / 3)), Math.max(1, Math.round(skyL / 3)));
    st.needsUpdate = true;
    // Colour above 1 so the glass reads as a light source after tone mapping
    const sky = mesh(plane, new THREE.MeshBasicMaterial({ map: st, color: new THREE.Color(1.6, 1.54, 1.42) }), parent);
    sky.rotation.x = Math.PI / 2;
    sky.scale.set(skyW, skyL, 1);
    sky.position.set(0, H - 0.075, cz); // just below the rim
    const rim = mesh(box, M.trim, parent);
    rim.scale.set(skyW + 0.3, 0.06, skyL + 0.3);
    rim.position.set(0, H - 0.035, cz);

    const pool = mesh(plane, poolMat, parent);
    pool.rotation.x = -Math.PI / 2;
    pool.scale.set(skyW * 1.8, skyL * 1.4, 1);
    pool.position.set(0, 0.004, cz);
    pool.raycast = () => {};
    pool.renderOrder = GLOW_ORDER.pool;
  }

  function addPanel(parent, tex, w, h, x, y, zOff = 0.006, basic = false) {
    const mat = basic
      ? new THREE.MeshBasicMaterial({ map: tex, color: '#ebe7df', toneMapped: false })
      : new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 });
    const m = mesh(plane, mat, parent);
    m.scale.set(w, h, 1);
    m.position.set(x, y, zOff);
    return m;
  }

  // Wall text is canvas-drawn, so each piece registers a redraw function and refreshText() runs them all
  // on a language change. Self-sizing panels get resized too.
  const relabel = [];
  const live = (draw) => {
    relabel.push(draw);
    draw();
  };

  // Put a freshly drawn texture on a panel and free the old one
  const retexture = (panel, tex) => {
    panel.material.map?.dispose();
    panel.material.map = tex;
    panel.material.needsUpdate = true;
    onTexture?.(tex);
  };

  // A wall panel w metres wide whose height follows its text: `makeTex()` draws it, `yOf(h)` says where its centre goes
  function livePanel(parent, w, x, makeTex, yOf) {
    let panel = null;
    live(() => {
      const tex = makeTex();
      const h = tex.userData.height;
      if (!panel) {
        panel = addPanel(parent, tex, w, h, x, yOf(h));
      } else {
        retexture(panel, tex);
        panel.scale.set(w, h, 1);
        panel.position.y = yOf(h);
      }
    });
    return panel;
  }

  // Wall text that sizes itself to its content. `top` is the height of its top edge; `make()` gives the text's options.
  function addWallText(parent, x, top, w, make) {
    return livePanel(parent, w, x, () => textTexture({ width: w, ...make() }), (h) => Math.max(top - h / 2, 0.5 + h / 2));
  }

  function addShadow(parent, x, zPos, w, d) {
    const s = mesh(plane, shadowMat, parent);
    s.rotation.x = -Math.PI / 2;
    s.scale.set(w, d, 1);
    s.position.set(x, 0.003, zPos);
    s.raycast = () => {};
    s.renderOrder = GLOW_ORDER.shadow;
  }

  // signage

  const worksLabel = (r) => {
    const c = r.exhibits.length;
    return `${String(c).padStart(2, '0')} ${say(`${r.kind === 'languages' ? 'piece' : 'work'}.${c === 1 ? 'one' : 'other'}`)}`;
  };

  // Wall text introducing a hall, painted beside its doorway
  function addHallIntro(wall, u, r, ink) {
    const w = 1.8;
    addWallText(wall, u - (DOOR_W / 2 + 0.35 + w / 2), 2.55, w, () => ({
      ppm: 500, padding: 0.04,
      blocks: [
        { text: say('room', { n: r.numeral }), font: 'mono', size: 26, spacing: 6, upper: true, color: ink.soft },
        { text: r.title, font: 'serif', size: 92, weight: 500, lineHeight: 1.05, gap: 8, color: ink.ink },
        r.subtitle && { text: r.subtitle, font: 'serif', style: 'italic', size: 42, lineHeight: 1.2, gap: 6, color: ink.ink },
        { rule: true, width: 120, color: ink.rule, gap: 26 },
        r.description && { text: r.description, font: 'sans', weight: 300, size: 29, lineHeight: 1.5, gap: 22, color: ink.ink },
        { text: worksLabel(r), font: 'mono', size: 24, spacing: 3, upper: true, gap: 20, color: ink.soft },
      ],
    }));
  }

  // `words()` gives [small line above, big line]
  function addDoorSign(wall, u, ink, words) {
    livePanel(wall, 3.6, u, () => {
      const [eyebrow, label] = words();
      return textTexture({
        width: 3.6, ppm: 300, align: 'center', padding: 0.03,
        blocks: [
          { text: eyebrow, font: 'mono', size: 26, spacing: 8, upper: true, color: ink.soft },
          { text: label, font: 'serif', size: 76, weight: 500, lineHeight: 1.05, gap: 4, color: ink.ink },
        ],
      });
    }, (h) => DOOR_H + 0.22 + h / 2);
  }

  function labelTexture(ex, w, h, [titleSize, noSize, mediumSize]) {
    return textTexture({
      width: w, height: h, ppm: 1400, background: '#f7f4ee', padding: 0.03,
      blocks: [
        { text: ex.title, font: 'serif', size: titleSize, weight: 500, lineHeight: 1.1 },
        { text: catalogueNo(ex), font: 'mono', size: noSize, spacing: 1, gap: 12, color: '#6b645a' },
        ex.medium && { text: ex.medium, font: 'sans', size: mediumSize, lineHeight: 1.35, gap: 10, color: '#3d3833' },
      ],
    });
  }

  // A label of a fixed size, drawn again in the visitor's language when it changes
  function addLabel(parent, ex, w, h, sizes, x, y, zOff, basic) {
    const panel = addPanel(parent, labelTexture(ex, w, h, sizes), w, h, x, y, zOff, basic);
    relabel.push(() => retexture(panel, labelTexture(ex, w, h, sizes)));
    return panel;
  }

  // exhibits

  // A box of this size at this place, as geometry that can be merged with others
  const slab = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

  // One framed picture: mat, moulding, picture light and wall glow. It is pickable and remembers
  // which media it shows (`view`). Moulding and light are merged into one mesh each to save draw calls.
  function makeFrame(parent, ex, view, spec) {
    const g = new THREE.Group();
    g.userData = { exhibit: ex, view };
    parent.add(g);
    pickables.push(g);

    const artMat = new THREE.MeshBasicMaterial({ map: canvasTexture(blankCanvas(spec.aw / spec.ah)), color: '#f2f2f2', toneMapped: false });
    const art = mesh(plane, artMat, g);
    const matBoard = mesh(plane, M.mat, g);
    const moulding = mesh(new THREE.BufferGeometry(), M.frames[ex.frame] ?? M.frames.black, g);
    const wash = mesh(plane, washMat, g);
    wash.raycast = () => {};
    wash.renderOrder = GLOW_ORDER.wash;
    const fixture = mesh(new THREE.BufferGeometry(), M.brass, g);
    const bulb = mesh(box, lampGlow, g); // the glowing tube under the lamp's hood

    const frame = {
      group: g, artMat, spec,
      place(s) {
        frame.spec = s;
        const { aw, ah, m, f, big } = s; // picture, mat margin, moulding width
        const d = big ? 0.06 : 0.05; // frame depth
        const ow = aw + 2 * (m + f);
        const oh = ah + 2 * (m + f);
        art.scale.set(aw, ah, 1);
        art.position.z = d * 0.5 + 0.002;
        matBoard.scale.set(aw + 2 * m, ah + 2 * m, 1);
        matBoard.position.z = d * 0.5;
        moulding.geometry.dispose();
        moulding.geometry = mergeGeometries([
          slab(ow, f, d, 0, oh / 2 - f / 2, d / 2),
          slab(ow, f, d, 0, -oh / 2 + f / 2, d / 2),
          slab(f, oh - 2 * f, d, -ow / 2 + f / 2, 0, d / 2),
          slab(f, oh - 2 * f, d, ow / 2 - f / 2, 0, d / 2),
        ]);
        wash.scale.set(ow * 1.6, oh * 1.5, 1);
        wash.position.set(0, oh * 0.18, 0.003);
        fixture.visible = bulb.visible = s.lamp !== false;
        if (fixture.visible) {
          const lw = Math.max(0.4, ow * 0.4);
          const ly = oh / 2 + 0.12;
          fixture.geometry.dispose();
          fixture.geometry = mergeGeometries([
            slab(lw, 0.03, 0.07, 0, ly, 0.175), // the lamp's hood
            slab(0.018, 0.018, 0.14, 0, ly, 0.09), // the arm that holds it
            slab(0.08, 0.06, 0.014, 0, ly, 0.007), // and the plate on the wall that the arm is fixed to
          ]);
          bulb.scale.set(lw * 0.9, 0.01, 0.05);
          bulb.position.set(0, ly - 0.0185, 0.175);
        }
      },
      setMap(tex) {
        artMat.map?.dispose();
        artMat.map = tex;
        artMat.needsUpdate = true;
      },
    };
    frame.place(spec);
    return frame;
  }

  // Put the right picture on a frame: a title card, an image, or a video that plays when you are in the hall
  function fillFrame(frame, ex, shot) {
    const refit = (w, h) => {
      if (shot.guessed) frame.place({ ...fitFrame(w / h, ...frame.spec.max, frame.spec.big), lamp: frame.spec.lamp });
    };
    const fail = (src) => {
      console.warn(`[museum] Could not load "${src}", showing a generated picture instead.`);
      frame.setMap(canvasTexture(ex.fallbackCanvas()));
    };
    const loadImage = (src, onLoad) => loader.load(src, (tex) => {
      prepareTexture(tex);
      frame.setMap(tex);
      onTexture?.(tex);
      onLoad?.(tex);
    }, undefined, () => fail(src));

    if (shot.type === 'card') {
      frame.setMap(canvasTexture(ex.fallbackCanvas()));
      relabel.push(() => {
        ex._fallback = null;
        ex._fallbackURL = null;
        frame.setMap(canvasTexture(ex.fallbackCanvas()));
      });
    } else if (shot.type === 'image') {
      loadImage(shot.src, (tex) => refit(tex.image.width, tex.image.height));
    } else if (shot.type === 'video') {
      if (shot.poster) loadImage(shot.poster); // the first frame of the story while the video loads
      const video = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'none' });
      video.src = shot.src;
      const vtex = prepareTexture(new THREE.VideoTexture(video));
      video.addEventListener('playing', () => { if (frame.artMat.map !== vtex) frame.setMap(vtex); }, { once: true });
      video.addEventListener('error', () => console.warn(`[museum] Could not play "${shot.src}".`));
      const screen = { ex, video, active: false };
      screen.set = (on) => {
        if (on === screen.active) return;
        screen.active = on;
        if (on) video.play()?.catch(() => {}); // autoplay can be refused; the detail view still has controls
        else video.pause();
      };
      screens.push(screen);
    }
  }

  function addBay(ex, hall, walls) {
    const { side, layout, d } = ex.bay;
    const u = side === 'left' ? d - hall.length / 2 : hall.length / 2 - d; // along the wall: left runs deeper, right toward the door
    const wallGroup = walls[side];
    const left = u - layout.full / 2;

    for (const spec of layout.frames) {
      const shot = ex.shots[spec.shot];
      const frame = makeFrame(wallGroup, ex, shot.index, spec);
      frame.group.position.set(left + spec.cx, HANG + spec.cy, 0);
      fillFrame(frame, ex, shot);
    }
    addLabel(wallGroup, ex, LABEL_W, LABEL_H, [84, 38, 40],
      left + layout.width + LABEL_GAP + LABEL_W / 2, HANG - 0.25, 0.004, true);

    const inward = side === 'left' ? 1 : -1;
    ex.viewpoint = worldView(hall.group, inward * (-hall.width / 2 + VIEW_DIST), hall.zNear - d, inward * Math.PI / 2);

    // For tall, narrow screens: face the main picture alone, from a little further back
    const heroU = left + layout.frames[0].cx;
    const heroD = side === 'left' ? heroU + hall.length / 2 : hall.length / 2 - heroU;
    ex.viewpointHero = worldView(hall.group, inward * (-hall.width / 2 + VIEW_DIST + 0.4), hall.zNear - heroD, inward * Math.PI / 2);
  }

  const PLINTH = 0.7;
  const PLINTH_H = 1.05;

  function addPlinth(g) {
    const plinth = mesh(box, M.plinth, g);
    plinth.scale.set(PLINTH, PLINTH_H, PLINTH);
    plinth.position.y = PLINTH_H / 2;
    const kick = mesh(box, M.baseboard, g);
    kick.scale.set(PLINTH + 0.02, 0.06, PLINTH + 0.02);
    kick.position.y = 0.03;
    addShadow(g, 0, 0, 1.3, 1.3);
    addLocalCollider(g, -PLINTH / 2 - 0.02, PLINTH / 2 + 0.02, -PLINTH / 2 - 0.02, PLINTH / 2 + 0.02);
  }

  // A project's emblem: a small animated sculpture on a plinth in the aisle
  function addEmblem(ex, hall) {
    const built = buildEmblem(ex);
    if (!built) return;
    const { x, d } = ex.emblemSpot;
    const g = group(hall.group, x, hall.zNear - d);
    g.userData = { exhibit: ex, view: 0 };
    pickables.push(g);
    addPlinth(g);
    built.object.position.y = PLINTH_H;
    g.add(built.object);
    if (built.update) animated.push({ run: built.update, hall });
  }

  function addSculpture(ex, hall, index) {
    const sx = index % 2 === 0 ? -1 : 1;
    const slot = Math.floor(index / 2);
    const x = sx * 2.6;
    const zp = hall.zNear - 2 - (slot + 0.5) * PLINTH_SLOT;

    const g = group(hall.group, x, zp);
    g.userData.exhibit = ex;
    pickables.push(g);
    ex.viewpoint = worldView(hall.group, x - sx * 1.9, zp, sx === -1 ? Math.PI / 2 : -Math.PI / 2, -0.22);

    addPlinth(g);
    if (ex.glyph && glyphFont) {
      // The language as its own name in big 3D letters, turned toward the aisle and swaying gently
      const letters = mesh(glyphGeometry(glyphFont, ex.glyph), new THREE.MeshStandardMaterial({
        color: ex.color, metalness: 0.15, roughness: 0.38,
      }), g);
      letters.position.y = PLINTH_H + 0.4;
      swayers.push({ mesh: letters, yaw: -sx * Math.PI / 2, phase: index * 1.7, y: PLINTH_H + 0.4 });
    } else {
      const shape = SHAPES[ex.shape] ? ex.shape : 'icosahedron';
      const sculpture = mesh(SHAPES[shape](), new THREE.MeshStandardMaterial({
        color: ex.color, metalness: 0.65, roughness: 0.28, flatShading: FACETED.has(shape),
      }), g);
      sculpture.position.y = PLINTH_H + 0.42;
      spinners.push({ mesh: sculpture, phase: index * 1.7, y: PLINTH_H + 0.42 });
    }

    const label = addLabel(g, ex, 0.5, 0.3, [64, 28, 30], -sx * (PLINTH / 2 + 0.002), 0.78, 0, true);
    label.rotation.y = -sx * Math.PI / 2;
  }

  // A long bench against a wall, where the wall is otherwise bare
  function addBench(hall, side, d, len) {
    const sx = side === 'left' ? -1 : 1;
    const g = group(hall.group, sx * (hall.width / 2 - 0.55), hall.zNear - d);
    const seat = mesh(box, M.bench, g);
    seat.scale.set(0.5, 0.07, len);
    seat.position.y = 0.44;
    const pad = mesh(box, M.cushion, g);
    pad.scale.set(0.42, 0.06, len - 0.12);
    pad.position.y = 0.5;
    for (const sz of [-1, 1]) {
      const leg = mesh(box, M.steel, g);
      leg.scale.set(0.42, 0.42, 0.05);
      leg.position.set(0, 0.21, sz * (len / 2 - 0.15));
    }
    addShadow(g, 0, 0, 1.1, len + 0.6);
    addLocalCollider(g, -0.27, 0.27, -len / 2, len / 2);
  }

  // main hall

  // A freestanding dark board with text on its front
  function addBoard(x, zPos, rot, make) {
    const w = 2.5;
    const g = group(root, x, zPos, rot);
    const slab = mesh(box, M.board, g);
    const foot = mesh(box, M.steel, g);
    foot.scale.set(w * 0.8, 0.15, 0.5);
    foot.position.y = 0.075;
    const face = mesh(plane, new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.8 }), g);
    live(() => { // the words fill the board a different way in each language, so the board is sized to them
      const tex = textTexture({ width: w - 0.1, ...make() });
      const th = tex.userData.height;
      const bh = Math.max(2.6, th + 0.5);
      slab.scale.set(w, bh, 0.1);
      slab.position.y = 0.15 + bh / 2;
      retexture(face, tex);
      face.scale.set(w - 0.1, th, 1);
      face.position.set(0, 0.15 + bh - 0.25 - th / 2, 0.052);
    });
    addShadow(g, 0, 0, w * 1.1, 1.4);
    addLocalCollider(g, -w / 2, w / 2, -0.25, 0.25);
  }

  // Coloured lines on the floor lead from the middle of the hall to each doorway, ending in a numbered disc
  function addWayfinding(cz) {
    const ring = mesh(new THREE.RingGeometry(2.0, 2.1, 96), M.gold);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.006, cz);
    ring.raycast = () => {};

    for (const hall of halls) {
      const inx = hall.side === 'left' ? 1 : hall.side === 'right' ? -1 : 0;
      const inz = hall.side === 'far' ? 1 : 0;
      const tx = hall.pos[0] + inx * 1.9;
      const tz = hall.pos[1] + inz * 1.9;
      const dx = tx - 0;
      const dz = tz - cz;
      const len = Math.hypot(dx, dz);
      const start = 2.1;
      // A hall with pale walls would give a pale line on a pale floor, so those get a darker line
      const color = new THREE.Color(hall.wall);
      const light = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b > 0.35;
      color.lerp(new THREE.Color(light ? '#2b2620' : '#ffffff'), light ? 0.62 : 0.12);

      const g = group(root, (dx / len) * (start + (len - start) / 2), cz + (dz / len) * (start + (len - start) / 2), Math.atan2(-dz, dx));
      const line = mesh(plane, new THREE.MeshStandardMaterial({ color, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 }), g);
      line.rotation.x = -Math.PI / 2;
      line.scale.set(len - start, 0.3, 1);
      line.position.y = 0.007;
      line.raycast = () => {};

      const disc = mesh(plane, new THREE.MeshStandardMaterial({
        map: medallionTexture(hall.numeral, `#${color.getHexString()}`), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2,
      }));
      disc.rotation.order = 'YXZ';
      disc.rotation.set(-Math.PI / 2, Math.atan2(inx, inz), 0); // the numeral reads upright as you walk toward the door
      disc.scale.set(1.35, 1.35, 1);
      disc.position.set(tx, 0.009, tz);
      disc.raycast = () => {};
    }
  }

  // A lectern near the entrance: look at it and press E to start the guided tour
  function addLectern(x, zPos, rot) {
    const g = group(root, x, zPos, rot);
    const W = 0.9; // width
    const D = 0.5; // depth
    const FRONT = 0.98; // height of the front edge; the top slopes up to BACK
    const BACK = 1.2;

    // One solid wedge, side-on profile extruded across its width. The reader stands on the +z side.
    const side = new THREE.Shape();
    side.moveTo(-D / 2, 0);
    side.lineTo(D / 2, 0);
    side.lineTo(D / 2, FRONT);
    side.lineTo(-D / 2, BACK);
    side.closePath();
    const wedge = new THREE.ExtrudeGeometry(side, { depth: W, bevelEnabled: false });
    wedge.translate(0, 0, -W / 2);
    wedge.rotateY(-Math.PI / 2); // profile x becomes the stand's depth (z), the extrusion becomes its width (x)
    mesh(wedge, M.board, g);

    // The text lies flat on the slope, a hair above it
    const slope = Math.atan2(BACK - FRONT, D);
    const face = mesh(plane, new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), g);
    live(() => {
      const tex = textTexture({
        width: 0.78, ppm: 700, padding: 0.03, align: 'center',
        blocks: [
          { text: say('hub.newHere'), font: 'mono', size: 30, spacing: 8, upper: true, color: '#d8cdb4' },
          { text: say('hub.takeTour'), font: 'serif', size: 88, weight: 500, lineHeight: 1.05, gap: 8, color: '#f3eee4' },
          { rule: true, width: 160, color: 'rgba(243,238,228,0.4)', gap: 16 },
          { text: say('hub.lookHere'), font: 'sans', weight: 300, size: 34, gap: 14, color: '#f3eee4' },
        ],
      });
      retexture(face, tex);
      face.scale.set(0.78, tex.userData.height, 1);
    });
    face.rotation.x = slope - Math.PI / 2; // lying along the slope, facing up and toward the reader
    const lift = 0.006;
    face.position.set(0, (FRONT + BACK) / 2 + Math.cos(slope) * lift, Math.sin(slope) * lift);
    tour = { kind: 'tour', get title() { return say('hub.tourPrompt'); }, room: hub };
    face.userData.exhibit = tour;
    pickables.push(face);

    const lip = mesh(box, M.brass, g); // a brass rail along the front edge, to hold the page
    lip.scale.set(W, 0.035, 0.03);
    lip.position.set(0, FRONT + 0.012, D / 2 - 0.005);
    addShadow(g, 0, 0, 1.4, 1.1);
    addLocalCollider(g, -W / 2, W / 2, -D / 2, D / 2);
  }

  function buildHub() {
    const { ink } = hub;
    const wm = wallMaterial(hub.wall, HUB_H);
    const cz = -HD / 2;
    makeShell(root, {
      width: HW, length: HD, height: HUB_H, cz, floorTex: stone, tile: 4.8,
      skyW: HW * 0.5, skyL: HD * 0.6,
    });

    const doorsOn = (side) => halls.filter((h) => h.side === side).map((h) => h.u);
    const walls = {
      left: makeWall(root, { len: HD, height: HUB_H, mat: wm, x: -HW / 2, z: cz, rot: Math.PI / 2, doors: doorsOn('left') }),
      far: makeWall(root, { len: HW, height: HUB_H, mat: wm, x: 0, z: -HD, rot: 0, doors: doorsOn('far') }),
      right: makeWall(root, { len: HD, height: HUB_H, mat: wm, x: HW / 2, z: cz, rot: -Math.PI / 2, doors: doorsOn('right') }),
      near: makeWall(root, { len: HW, height: HUB_H, mat: wm, x: 0, z: 0, rot: Math.PI }),
    };

    // A sign and an intro text beside every hall's doorway
    for (const h of halls) {
      addDoorSign(walls[h.side], h.u, ink, () => [say('room', { n: h.numeral }), h.title]);
      addHallIntro(walls[h.side], h.u, h, ink);
    }

    // Pilasters give the long walls a rhythm; they skip doors, wall text and corners
    const pilasterMat = new THREE.MeshStandardMaterial({ color: '#f0ebe2', roughness: 0.85 });
    const keepClear = {
      left: [], right: [], far: [[-6.4, 6.4]], near: [[-3.4, 3.4]],
    };
    for (const h of halls) keepClear[h.side].push([h.u - 3.6, h.u + 1.8]);
    for (const [side, wall] of Object.entries(walls)) {
      const len = side === 'left' || side === 'right' ? HD : HW;
      const count = Math.floor(len / 3.6);
      for (let k = 1; k < count; k++) {
        const u = -len / 2 + (k * len) / count;
        if (keepClear[side].some(([a, b]) => u > a - 0.3 && u < b + 0.3)) continue;
        const p = mesh(box, pilasterMat, wall);
        p.scale.set(0.5, HUB_H - 0.12, 0.12);
        p.position.set(u, (HUB_H - 0.12) / 2, 0.06);
        addLocalCollider(wall, u - 0.25, u + 0.25, -T, 0.14);
      }
    }

    // Name high on the far wall
    livePanel(walls.far, 12, 0, () => textTexture({
      width: 12, ppm: 200, align: 'center', padding: 0.1,
      blocks: [
        { text: `${say('permanent')}${profile.since ? ` · ${say('est', { n: profile.since })}` : ''}`, font: 'mono', size: 30, spacing: 8, upper: true, color: ink.soft },
        { text: profile.name, font: 'serif', size: 300, weight: 500, lineHeight: 1.0, gap: 14, color: ink.ink },
        { text: tr(profile.role), font: 'sans', size: 46, spacing: 14, upper: true, gap: 18, color: ink.ink },
      ],
    }), (h) => HUB_H - 0.3 - h / 2);

    // Welcome boards either side of the entrance: About (left) and Floor Guide (right)
    const where = () => ({ left: say('hub.left'), far: say('hub.ahead'), right: say('hub.right') });
    const bi = inksFor('#2a2622');
    addBoard(-5.2, -11, 0.4, () => ({
      ppm: 400, padding: 0.12,
      blocks: [
        { text: say('hub.about'), font: 'mono', size: 30, spacing: 6, upper: true, color: bi.soft },
        { text: say('hub.developer'), font: 'serif', size: 110, weight: 500, lineHeight: 1.1, gap: 6, color: bi.ink },
        { rule: true, width: 140, color: bi.rule, gap: 24 },
        { text: tr(profile.bio), font: 'sans', weight: 300, size: 40, lineHeight: 1.45, gap: 28, color: bi.ink },
        { text: profile.tools.map(tr).join('  ·  '), font: 'mono', size: 26, spacing: 2, upper: true, gap: 28, color: bi.soft },
        profile.spoken?.length && { text: say('hub.spoken'), font: 'mono', size: 26, spacing: 2, upper: true, gap: 62, color: bi.soft },
        profile.spoken?.length && { text: profile.spoken.map(tr).join('  ·  '), font: 'sans', weight: 300, size: 40, lineHeight: 1.4, gap: 10, color: bi.ink },
      ],
    }));
    addBoard(5.2, -11, -0.4, () => ({
      ppm: 400, padding: 0.12,
      blocks: [
        { text: say('hub.directory'), font: 'mono', size: 30, spacing: 6, upper: true, color: bi.soft },
        { text: say('hub.floorGuide'), font: 'serif', size: 110, weight: 500, lineHeight: 1.1, gap: 6, color: bi.ink },
        { rule: true, color: bi.rule, gap: 20 },
        ...halls.map((r, i) => ({
          size: 52, lineHeight: 1.5, gap: i === 0 ? 12 : 0,
          cols: [
            { text: r.numeral, font: 'mono', size: 28, color: bi.soft, x: 0 },
            { text: r.title, font: 'serif', weight: 500, color: bi.ink, x: 90 },
            { text: where()[r.side], font: 'mono', size: 26, upper: true, spacing: 2, color: bi.soft, x: 610 },
          ],
        })),
        { rule: true, color: bi.rule, gap: 20 },
        { text: say('hub.follow'), font: 'sans', weight: 300, size: 34, gap: 24, color: bi.ink },
      ],
    }));

    addWayfinding(cz);
    addLectern(2.9, -6.8, -0.55);

    // Round bench with a pedestal in the middle of the hall, and the Solar System hanging over it
    const bench = mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.45, 48), M.bench);
    bench.position.set(0, 0.225, cz);
    const core = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.95, 48), M.plinth);
    core.position.set(0, 0.475, cz);
    const orrery = solarSystem(); // the sun floating above it, with the planets going round
    orrery.object.position.set(0, 0.95, cz);
    root.add(orrery.object);
    hubAnimated.push(orrery);
    addShadow(root, 0, cz, 5, 5);
    colliders.push({ x: 0, z: cz, r: 1.72 }); // as round as the bench itself

    // Closed entrance doors behind the visitor, contact text above them
    const door = mesh(box, M.door, walls.near);
    door.scale.set(2.2, 3.0, 0.05);
    door.position.set(0, 1.5, 0.025);
    const split = mesh(box, M.steel, walls.near);
    split.scale.set(0.015, 3.0, 0.06);
    split.position.set(0, 1.5, 0.03);
    for (const sx of [-1, 1]) {
      const handle = mesh(box, M.brass, walls.near);
      handle.scale.set(0.03, 0.4, 0.04);
      handle.position.set(sx * 0.1, 1.1, 0.075);
    }

    contact = { kind: 'contact', get title() { return say('getInTouch'); }, room: hub, viewpoint: { x: 0, z: -7.5, yaw: Math.PI, pitch: 0.28 } };
    const panel = addWallText(walls.near, 0, HUB_H - 0.4, 6, () => ({
      ppm: 220, align: 'center', padding: 0.1,
      blocks: [
        { text: say('hub.beforeLeave'), font: 'mono', size: 30, spacing: 6, upper: true, color: ink.soft },
        { text: say('hub.thanks'), font: 'serif', size: 150, weight: 500, lineHeight: 1.05, gap: 16, color: ink.ink },
        { text: say('together'), font: 'serif', style: 'italic', size: 64, gap: 8, color: ink.ink },
        { rule: true, width: 180, color: ink.rule, gap: 36 },
        profile.email && { text: profile.email, font: 'mono', size: 46, gap: 36, color: ink.ink },
        profile.links?.length && { text: profile.links.map((l) => tr(l.label)).join('  ·  '), font: 'sans', size: 34, spacing: 3, upper: true, gap: profile.email ? 14 : 36, color: ink.soft },
      ],
    }));
    panel.userData.exhibit = contact;
    pickables.push(panel);

    hub.entry = { x: 0, z: -4, yaw: 0 };
    hub.bounds = [[-HW / 2, 0], [HW / 2, 0], [HW / 2, -HD], [-HW / 2, -HD]];
    hub.center = { x: 0, z: cz };
  }

  // halls

  function buildHall(hall) {
    const { width: W, height: H, length: L, ink } = hall;
    hall.group = group(root, hall.pos[0], hall.pos[1], hall.rot);
    const g = hall.group;
    hall.zNear = -T;
    hall.zFar = -T - L;
    hall.cz = (hall.zNear + hall.zFar) / 2;
    hall.entry = worldView(g, 0, hall.zNear - 1.2, 0);
    hall.inside = worldView(g, 0, hall.zNear - 1.6, 0); // route points just either side of the doorway
    hall.outside = worldView(g, 0, 2.2, 0);
    hall.bounds = cornersOf(g, -W / 2, W / 2, 0, hall.zFar);
    hall.center = worldView(g, 0, hall.cz, 0);
    // The doorway, with a little room in front of it: if you can't see this, you can't see into the hall
    hall.doorBox = new THREE.Box3();
    for (const x of [-DOOR_W / 2, DOOR_W / 2]) {
      for (const y of [0, DOOR_H]) for (const z of [-T, 1.2]) hall.doorBox.expandByPoint(g.localToWorld(new THREE.Vector3(x, y, z)));
    }
    // The opening itself, through the thickness of the wall: from inside the hall this is the only way to see out
    hall.holeBox = new THREE.Box3();
    for (const x of [-DOOR_W / 2, DOOR_W / 2]) {
      for (const y of [0, DOOR_H]) for (const z of [-T, 0]) hall.holeBox.expandByPoint(g.localToWorld(new THREE.Vector3(x, y, z)));
    }
    hall.shownUntil = -Infinity;

    const wm = wallMaterial(hall.wall, H);
    const { tex, tile } = floorFor(hall.floor);
    makeShell(g, {
      width: W, length: L, height: H, cz: hall.cz, floorTex: tex, tile,
      skyW: W * 0.4, skyL: L - 3,
    });

    const walls = {
      left: makeWall(g, { len: L, height: H, mat: wm, x: -W / 2, z: hall.cz, rot: Math.PI / 2 }),
      right: makeWall(g, { len: L, height: H, mat: wm, x: W / 2, z: hall.cz, rot: -Math.PI / 2 }),
      near: makeWall(g, { len: W, height: H, mat: wm, x: 0, z: hall.zNear, rot: Math.PI, doors: [0], reveal: false }),
      far: makeWall(g, { len: W, height: H, mat: wm, x: 0, z: hall.zFar, rot: 0 }),
    };

    addDoorSign(walls.near, 0, ink, () => [say('backTo'), say('mainHall')]);

    // The hall's name closes the view at the far end
    addWallText(walls.far, 0, 3.4, Math.min(W - 2, 6), () => ({
      ppm: 250, align: 'center', padding: 0.05,
      blocks: [
        { text: say('room', { n: hall.numeral }), font: 'mono', size: 30, spacing: 8, upper: true, color: ink.soft },
        { text: hall.title, font: 'serif', size: 170, weight: 500, lineHeight: 1.05, gap: 10, color: ink.ink },
        hall.subtitle && { text: hall.subtitle, font: 'serif', style: 'italic', size: 60, gap: 8, color: ink.ink },
      ],
    }));

    if (hall.kind === 'gallery') {
      for (const ex of hall.exhibits) {
        addBay(ex, hall, walls);
        if (ex.hasEmblem) addEmblem(ex, hall);
      }
      // Bare wall long enough for a bench gets one
      for (const { side, from, to } of hall.spare) addBench(hall, side, (from + to) / 2, Math.min(2.6, to - from - 1.2));
    } else {
      hall.exhibits.forEach((ex, i) => addSculpture(ex, hall, i));
    }
  }

  buildHub();
  halls.forEach(buildHall);

  const plan = [hub, ...halls];
  const local = new THREE.Vector3();
  const roomAt = (x, zPos) => {
    for (const h of halls) {
      h.group.worldToLocal(local.set(x, 0, zPos));
      if (local.z <= 0.01 && local.z >= h.zFar && Math.abs(local.x) <= h.width / 2) return h;
    }
    return hub;
  };

  // Only draw the current hall and any whose doorway is in view. From inside a hall the others are only
  // visible through its doorway, so a frustum test on the opening decides. A hall that stops qualifying
  // stays drawn for SHOW_FOR seconds so nothing blinks out while you cross a threshold.
  const SHOW_FOR = 0.35; // seconds
  const frustum = new THREE.Frustum();
  const viewProj = new THREE.Matrix4();
  function cullHalls(camera, time) {
    camera.updateMatrixWorld();
    viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProj);
    const here = roomAt(camera.position.x, camera.position.z);
    const lookingOut = here === hub || frustum.intersectsBox(here.holeBox);
    for (const h of halls) {
      if (h === here || (lookingOut && frustum.intersectsBox(h.doorBox))) h.shownUntil = time + SHOW_FOR;
      h.group.visible = h === here || time < h.shownUntil;
    }
  }

  // A wide berth round the bench in the middle of the Main Hall
  function aroundBench(p, q, out) {
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-6) return;
    const cz = hub.center.z;
    const t = THREE.MathUtils.clamp(((0 - p.x) * dx + (cz - p.z) * dz) / len2, 0, 1);
    let ox = p.x + dx * t;
    let oz = p.z + dz * t - cz;
    const dist = Math.hypot(ox, oz);
    if (dist >= BENCH_R) return;
    if (dist < 0.05) { ox = -dz; oz = dx; }
    const k = BENCH_R / Math.hypot(ox, oz);
    out.push({ x: ox * k, z: cz + oz * k });
  }

  return {
    plan,
    exhibits,
    contact,
    tour,
    colliders,
    pickables,
    occluders,
    screens,
    spawn: hub.entry,
    roomAt,

    // Lighting at a spot: normal in the Main Hall, a hall's mood fades in over its first few metres.
    moodAt(x, zPos) {
      const hall = roomAt(x, zPos);
      if (hall === hub) return { light: 1, amount: 0, tint: null };
      hall.group.worldToLocal(local.set(x, 0, zPos));
      const k = THREE.MathUtils.clamp(-local.z / 4, 0, 1);
      const amount = k * k * (3 - 2 * k);
      return { light: 1 + (hall.mood.light - 1) * amount, amount, tint: hall.mood.tint };
    },

    // Waypoints from one spot to another that go through doorways instead of walls
    route(from, to) {
      const a = roomAt(from.x, from.z);
      const b = roomAt(to.x, to.z);
      if (a === b) return [{ x: to.x, z: to.z }];
      const stops = [{ x: from.x, z: from.z }];
      if (a !== hub) stops.push(a.inside, a.outside);
      if (b !== hub) stops.push(b.outside, b.inside);
      stops.push({ x: to.x, z: to.z });
      const path = [];
      for (let i = 1; i < stops.length; i++) {
        const inHub = roomAt(stops[i - 1].x, stops[i - 1].z) === hub && roomAt(stops[i].x, stops[i].z) === hub;
        if (inHub) aroundBench(stops[i - 1], stops[i], path); // crossings of the Main Hall must not clip the bench
        path.push({ x: stops[i].x, z: stops[i].z });
      }
      return path;
    },

    // Draw every piece of wall text again, in whatever language is current
    refreshText() {
      relabel.forEach((draw) => draw());
    },

    // Videos on the walls play only in the hall you are in
    setActiveRoom(room) {
      for (const s of screens) s.set(s.ex.room === room);
    },

    update(time, dt, camera) {
      cullHalls(camera, time);
      for (const s of spinners) {
        s.mesh.rotation.y = time * 0.35 + s.phase;
        s.mesh.rotation.x = s.tilt ?? Math.sin(time * 0.4 + s.phase) * 0.25;
        s.mesh.position.y = s.y + Math.sin(time * 0.8 + s.phase) * 0.03;
      }
      for (const s of swayers) {
        s.mesh.rotation.y = s.yaw + Math.sin(time * 0.6 + s.phase) * 0.55;
        s.mesh.position.y = s.y + Math.sin(time * 0.8 + s.phase) * 0.025;
      }
      for (const a of animated) if (a.hall.group.visible) a.run(time, dt, camera);
      for (const a of hubAnimated) a.update(time, dt, camera);
    },
  };
}
