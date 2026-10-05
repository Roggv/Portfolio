import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { profile, music as musicSpec } from './content.js';
import { loadFonts, setAnisotropy } from './textures.js';
import { buildMuseum } from './museum.js';
import { Player } from './controls.js';
import { Tour } from './tour.js';
import { loadGlyphFont } from './glyphs.js';
import { Mixer, Footsteps, Soundtrack } from './audio.js';
import { setLanguage, onLanguage } from './i18n.js';
import * as ui from './ui.js';

const isTouch = matchMedia('(pointer: coarse)').matches;
document.documentElement.classList.toggle('is-touch', isTouch);
ui.init(profile, isTouch);

// renderer

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping; // keeps wall and artwork colours true
renderer.toneMappingExposure = 1.05;
setAnisotropy(renderer.capabilities.getMaxAnisotropy());

// Two lights for the whole museum. Corner shadows are baked into textures (textures.js) and
// picture lights and skylight pools are additive glow planes, so there are no shadow maps.
// A hall's `mood` dims and tints the lights, pictures ignore tone mapping and stay bright.
const LIGHT = { hemi: 1.15, sun: 1.3, env: 0.45, tint: new THREE.Color('#fff4e6') };
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d0c0b');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = LIGHT.env;
const hemi = new THREE.HemisphereLight(LIGHT.tint, '#5c4a3a', LIGHT.hemi);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe9cf', LIGHT.sun); // daylight through the skylights
sun.position.set(4, 10, 3);
scene.add(sun);

// follows the player's position (museum.moodAt), blends across doorways
const tint = new THREE.Color();
function applyMood({ light, amount, tint: roomTint }) {
  hemi.intensity = LIGHT.hemi * light;
  hemi.color.copy(LIGHT.tint);
  if (roomTint) hemi.color.lerp(tint.set(roomTint), amount);
  sun.intensity = LIGHT.sun * light;
  scene.environmentIntensity = LIGHT.env * light;
}

// Near plane is far out on purpose: the player never gets closer than ~0.3 m to anything, and the
// extra depth precision stops glow planes lying on walls and floors from flickering at a distance.
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.2, 160);

// widen the fov on portrait screens
function fitCamera() {
  const aspect = innerWidth / innerHeight;
  camera.aspect = aspect;
  camera.fov = aspect >= 1 ? 70 : Math.min(95, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(30)) / aspect)));
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
fitCamera();
addEventListener('resize', fitCamera);

// museum

let museum;
try {
  const [, glyphFont] = await Promise.all([loadFonts(), loadGlyphFont()]);
  museum = buildMuseum(scene, { glyphFont, onTexture: (tex) => renderer.initTexture(tex) });
} catch (err) {
  console.error(err);
  ui.fail(err.message);
  throw err;
}

// Warm up every hall now (shaders, texture uploads) so a doorway doesn't stall the first time it shows
// what is behind it. Halls are culled again on the first frame.
for (const room of museum.plan) if (room.group) room.group.visible = true;
scene.traverse((o) => {
  for (const m of [o.material].flat()) {
    for (const key of ['map', 'aoMap']) if (m?.[key] && !m[key].isVideoTexture) renderer.initTexture(m[key]);
  }
});
renderer.compile(scene, camera);

const player = new Player(camera, canvas, museum.colliders);
player.teleport(museum.spawn);

// Footsteps and music share one volume. Browsers only allow sound after a click or key press.
const mixer = new Mixer();
const steps = new Footsteps('assets/audio/step.ogg', mixer);
const soundtrack = new Soundtrack(mixer, musicSpec);
player.onStep = (running) => steps.step(running);
const unlockSound = () => {
  steps.unlock();
  soundtrack.unlock();
};
addEventListener('pointerdown', unlockSound);
addEventListener('keydown', unlockSound);

// state

let state = 'intro'; // intro | playing | paused | inspecting | touring
let inspectFrom = 'walk'; // where to return when the detail view closes: walk | catalogue | tour
let target = null; // what the crosshair is on: { exhibit, view }
let tourWasPaused = false;

const locked = () => document.pointerLockElement === canvas;

// Pointer lock is also released on focus loss (Windows key, Alt+Tab, notifications), and only Esc
// should open the catalogue, so the two are told apart by window focus. Re-locking while Esc is
// still held would release it again, so it waits for the key up.
let escDown = false;
let lastEscAt = -Infinity;
let lastBlurAt = -Infinity;
let lockPending = false; // re-lock once Esc is released

function lock() {
  if (isTouch || locked()) return;
  if (escDown) {
    if (!lockPending) {
      lockPending = true;
      setTimeout(escUp, 350); // keyup may never arrive
    }
    return;
  }
  try {
    canvas.requestPointerLock()?.catch?.(() => {});
  } catch { /* the resume hint covers it */ }
}

function escUp() {
  escDown = false;
  if (!lockPending) return;
  lockPending = false;
  if (state === 'playing') setTimeout(lock, 60);
}

function stop() {
  player.enabled = false;
  player.keys.clear();
  target = null;
  ui.setPrompt(null);
}

function play() {
  state = 'playing';
  tour.cancel();
  player.enabled = true;
  ui.setTouring(false);
  ui.showScreen(null);
  ui.setResumeHint(!isTouch && !locked());
  lock();
}

let pausedAt = 0;

function pause() {
  state = 'paused';
  pausedAt = performance.now();
  tour.cancel();
  stop();
  ui.setTouring(false);
  ui.showCatalogue();
  if (locked()) document.exitPointerLock();
}

const order = museum.exhibits; // in catalogue order

function inspect(ex, from, view = 0) {
  if (state === 'touring') tourWasPaused = tour.paused;
  state = 'inspecting';
  inspectFrom = from;
  stop();
  tour.paused = true;
  if (locked()) document.exitPointerLock();

  const i = order.indexOf(ex);
  const neighbour = (other) => (other ? { title: other.title, go: () => inspect(other, from) } : null);
  ui.openInspect(ex, {
    profile,
    view,
    onOpen: (other) => inspect(other, from),
    onWalk: from === 'catalogue' && ex.viewpoint ? () => walkTo((narrow() && ex.viewpointHero) || ex.viewpoint) : null,
    onPrev: i > 0 ? neighbour(order[i - 1]) : null,
    onNext: i >= 0 && i < order.length - 1 ? neighbour(order[i + 1]) : null,
  });
}

function closeInspect() {
  ui.closeInspect();
  if (inspectFrom === 'catalogue') pause();
  else if (inspectFrom === 'tour') {
    state = 'touring';
    tour.paused = tourWasPaused;
    ui.showScreen(null);
    ui.setTouring(true);
    ui.setTourPaused(tour.paused);
  } else play();
}

function walkTo(viewpoint) {
  ui.closeInspect();
  ui.fade(() => {
    player.teleport(viewpoint);
    play();
  });
}

function activate(hit, from) {
  if (hit.exhibit.kind === 'tour') startTour();
  else inspect(hit.exhibit, from, hit.view ?? 0);
}

// tour

const narrow = () => innerWidth < innerHeight; // a phone held upright
const lessMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (lessMotion) player.bobAmp = 0;

const tour = new Tour(museum, player, {
  onStop: (stop, i, n) => ui.showTour(stop, i, n),
  onArrive: () => {},
  onEnd: () => play(),
  narrow,
  jump: lessMotion,
});

function startTour() {
  if (state === 'touring') return;
  document.activeElement?.blur?.();
  state = 'touring';
  stop();
  if (locked()) document.exitPointerLock();
  ui.showScreen(null);
  ui.setTouring(true);
  ui.setTourPaused(false);
  ui.setResumeHint(false);
  tour.start();
}

function openTourStop() {
  const { ex } = tour.stop;
  if (ex) inspect(ex, 'tour');
}

// ui

ui.bind({
  enter: play,
  tour: startTour,
  browse: pause,
  resume: play,
  closeInspect,
  tourPrev: () => tour.prev(),
  tourNext: () => tour.next(),
  tourRoom: () => tour.nextRoom(),
  tourPause: () => ui.setTourPaused(tour.togglePause()),
  tourMore: openTourStop,
  tourStop: play,
  sound: toggleSound,
  fullscreen: toggleFullscreen,
  volume: (v) => mixer.setVolume(v),
});
ui.buildMap(museum);
const catalogueHandlers = {
  onGoto: (room) => walkTo(room.entry),
  onOpen: (ex) => inspect(ex, 'catalogue'),
};
ui.buildCatalogue(museum, catalogueHandlers);

// Wall text is drawn on canvases, so it has to be redrawn along with the page text on a language change
ui.buildLanguageSwitches(setLanguage);
onLanguage(() => {
  ui.applyLanguage();
  museum.refreshText();
  ui.buildCatalogue(museum, catalogueHandlers);
  if (state === 'touring') ui.showTour(tour.stop, tour.index, tour.stops.length);
});
ui.setMusic(soundtrack.tracks);
soundtrack.onTrack = ui.setNowPlaying;
const showSound = () => {
  ui.setSound(mixer.on);
  ui.setVolume(mixer.volume);
};
mixer.onChange(showSound);
showSound();
ui.ready();

function toggleSound() {
  mixer.toggle();
}

// iPhone Safari can't fullscreen a page, so the button (touch only) is only shown where it works
const fullscreenActive = () => !!(document.fullscreenElement ?? document.webkitFullscreenElement);
if (document.fullscreenEnabled || document.webkitFullscreenEnabled) document.documentElement.classList.add('can-fullscreen');

function toggleFullscreen() {
  const root = document.documentElement;
  try {
    const result = fullscreenActive()
      ? (document.exitFullscreen ?? document.webkitExitFullscreen).call(document)
      : (root.requestFullscreen ?? root.webkitRequestFullscreen).call(root);
    result?.catch?.(() => {});
  } catch { /* refused by the browser */ }
}

for (const type of ['fullscreenchange', 'webkitfullscreenchange']) {
  document.addEventListener(type, () => ui.setFullscreen(fullscreenActive()));
}

let lockLostTimer = 0;
document.addEventListener('pointerlockchange', () => {
  clearTimeout(lockLostTimer);
  if (locked()) {
    ui.setResumeHint(false);
    return;
  }
  if (state !== 'playing') return; // released by us, for a menu or the tour
  ui.setResumeHint(false);
  // blur can arrive just after the lock is lost, so wait a moment before deciding it was Esc
  lockLostTimer = setTimeout(() => {
    if (state !== 'playing' || locked()) return;
    const now = performance.now();
    const windowLeft = !document.hasFocus() || now - lastBlurAt < 500;
    const strayEsc = now - lastEscAt < 800; // that Esc just closed something, it isn't a request for the menu
    if (windowLeft || strayEsc) ui.setResumeHint(!isTouch);
    else pause();
  }, 90);
});

addEventListener('blur', () => {
  lastBlurAt = performance.now();
  escDown = false;
});

addEventListener('keyup', (e) => {
  if (e.code === 'Escape') escUp();
});

canvas.addEventListener('click', () => {
  if (isTouch) return;
  if (state === 'touring') play(); // a click takes over from the tour
  else if (state === 'playing') {
    if (!locked()) lock();
    else if (target) activate(target, 'walk');
  }
});

const TAKE_OVER = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown']);

addEventListener('keydown', (e) => {
  // Tab opens the catalogue while walking, and moves focus as usual inside a menu
  if (e.code === 'Tab' && (state === 'playing' || state === 'touring')) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Escape') {
    escDown = true;
    lastEscAt = performance.now();
  }
  const menuKey = e.code === 'KeyM' || e.code === 'Tab';
  if (e.code === 'KeyN' && state !== 'intro' && state !== 'inspecting') toggleSound();
  if (state === 'playing') {
    if (e.code === 'KeyE' && target) activate(target, 'walk');
    else if (e.code === 'KeyT') startTour();
    else if (menuKey || e.code === 'Escape') pause(); // Escape only arrives here when the pointer isn't locked
  } else if (state === 'touring') {
    if (e.code === 'ArrowRight') tour.next();
    else if (e.code === 'ArrowLeft') tour.prev();
    else if (e.code === 'Space') { e.preventDefault(); ui.setTourPaused(tour.togglePause()); }
    else if (e.code === 'KeyE') openTourStop();
    else if (menuKey) pause();
    else if (e.code === 'Escape' || TAKE_OVER.has(e.code)) play();
  } else if (state === 'inspecting') {
    if (e.code === 'Escape' || e.code === 'KeyE') closeInspect();
    else if (e.code === 'ArrowLeft') ui.stepMedia(-1);
    else if (e.code === 'ArrowRight') ui.stepMedia(1);
  } else if (state === 'paused') {
    // the Esc that released the pointer and opened this menu must not close it again
    if (e.code === 'KeyM' || (e.code === 'Escape' && performance.now() - pausedAt > 400)) play();
  }
});

// looking at things

const raycaster = new THREE.Raycaster();
raycaster.far = 5;
const pickList = [...museum.pickables, ...museum.occluders];
const centre = new THREE.Vector2(0, 0);

// { exhibit, view } under a screen point, or null
function pick(ndc) {
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(pickList, true)[0];
  let o = hit?.object;
  while (o && !o.userData.exhibit) o = o.parent;
  return o?.userData ?? null;
}

if (isTouch) {
  player.attachTouch(document.getElementById('joystick'), document.querySelector('#joystick .knob'), (x, y) => {
    if (state !== 'playing') return;
    const hit = pick(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1));
    if (hit) activate(hit, 'walk');
  });
}

// loop

const clock = new THREE.Clock();
let time = 0;
let activeRoom;
let reported = false;

function frame(dt) {
  time += dt;
  player.update(dt);
  if (state === 'touring') tour.update(dt);
  museum.update(time, dt, camera);

  const moving = state === 'playing' || state === 'touring';
  const room = moving ? museum.roomAt(player.pos.x, player.pos.z) : null;
  if (moving) {
    applyMood(museum.moodAt(player.pos.x, player.pos.z));
    ui.setRoom(room);
    ui.drawMiniMap(player, room);
    if (state === 'playing') {
      target = pick(centre);
      ui.setPrompt(target?.exhibit ?? null);
    } else ui.setTourProgress(tour.progress);
  }
  if (room !== activeRoom) { // videos only play in their own hall
    activeRoom = room;
    museum.setActiveRoom(room);
  }
}

renderer.setAnimationLoop(() => {
  try {
    frame(Math.min(clock.getDelta(), 0.05));
  } catch (err) { // log once and keep rendering
    if (!reported) console.error(err);
    reported = true;
  }
  renderer.render(scene, camera);
});

// debugging helpers: step(10) fast-forwards ten seconds
window.step = (seconds = 1) => {
  for (let i = 0; i < Math.round(seconds * 30); i++) frame(1 / 30);
  renderer.render(scene, camera);
};

window.museum = museum;
window.player = player;
window.tour = tour;
window.renderer = renderer;
window.steps = steps;
window.scene = scene;
window.mixer = mixer;
window.soundtrack = soundtrack;
