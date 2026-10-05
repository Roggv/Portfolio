// Guided tour. Autopilot walks the camera along a route through doorways and round the bench and turns
// it to face a piece. Tour chains those walks: go to a stop, pause there with a caption, move on.
import { profile } from './content.js';
import { say } from './i18n.js';
import { catalogueNo } from './museum.js';

const SPEED = 4.4; // metres per second
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (x) => x * x * (3 - 2 * x);
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Autopilot {
  constructor(player) {
    this.player = player;
    this.active = false;
  }

  // `route`: [{x, z}] waypoints, `view`: how to face on arrival
  start(route, view) {
    const p = this.player;
    this.pts = [{ x: p.pos.x, z: p.pos.z }];
    for (const q of route) {
      const last = this.pts[this.pts.length - 1];
      if (Math.hypot(q.x - last.x, q.z - last.z) > 0.05) this.pts.push({ x: q.x, z: q.z });
    }
    this.lens = this.pts.slice(1).map((q, i) => Math.hypot(q.x - this.pts[i].x, q.z - this.pts[i].z));
    this.total = this.lens.reduce((a, b) => a + b, 0);
    this.s = 0;
    this.view = view;
    this.yaw = p.yaw;
    this.pitch = p.pitch;
    this.active = true;
  }

  // position and heading after `s` metres
  at(s) {
    let rest = s;
    for (let i = 0; i < this.lens.length; i++) {
      if (rest <= this.lens[i] || i === this.lens.length - 1) {
        const t = this.lens[i] ? clamp(rest / this.lens[i], 0, 1) : 1;
        const a = this.pts[i];
        const b = this.pts[i + 1];
        const len = this.lens[i] || 1;
        return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / len, dz: (b.z - a.z) / len };
      }
      rest -= this.lens[i];
    }
    return { x: this.pts[0].x, z: this.pts[0].z, dx: 0, dz: -1 };
  }

  // true on the frame the walk and the turn are done
  update(dt) {
    if (!this.active) return false;
    const remaining = this.total - this.s;
    const speed = SPEED * clamp(Math.min((this.s + 0.8) / 2.2, (remaining + 0.3) / 2.2), 0.15, 1); // ease in and out
    this.s = Math.min(this.total, this.s + speed * dt);
    const here = this.at(this.s);

    // face the walking direction, then ease round to the piece over the last few metres
    const blend = Math.min(3.5, Math.max(this.total, 0.01));
    const k = this.total < 0.05 ? 1 : smooth(clamp(1 - (this.total - this.s) / blend, 0, 1));
    const travelYaw = Math.atan2(-here.dx, -here.dz);
    const viewYaw = this.view.yaw ?? travelYaw;
    const targetYaw = travelYaw + wrapPi(viewYaw - travelYaw) * k;
    const targetPitch = (this.view.pitch ?? 0) * k;
    const a = 1 - Math.exp(-dt * 6);
    this.yaw += wrapPi(targetYaw - this.yaw) * a;
    this.pitch += (targetPitch - this.pitch) * a;

    this.player.drive(here.x, here.z, this.yaw, this.pitch, dt);

    const arrived = this.s >= this.total && Math.abs(wrapPi(viewYaw - this.yaw)) < 0.02 && Math.abs(targetPitch - this.pitch) < 0.01;
    if (arrived) this.active = false;
    return arrived;
  }
}

// Tour stops. The text is read through getters so it follows the language.
export function buildStops(museum) {
  const stops = [{
    type: 'welcome',
    get eyebrow() { return say('welcome'); },
    get title() { return profile.name; },
    get text() { return say('tour.welcomeText'); },
    view: museum.spawn, dwell: 4,
  }];
  for (const room of museum.plan) {
    if (room.kind === 'hub') continue;
    stops.push({
      type: 'room', room,
      get eyebrow() { return say('room', { n: room.numeral }); },
      get title() { return room.title; },
      get text() { return room.subtitle; },
      view: room.entry, dwell: 3.4,
    });
    if (room.kind === 'languages') continue;
    for (const ex of room.exhibits) {
      stops.push({
        type: 'work', room, ex,
        get eyebrow() { return `${say('room', { n: room.numeral })} · ${catalogueNo(ex)}`; },
        get title() { return ex.title; },
        get text() { return ex.tagline || ex.medium; },
        view: ex.viewpoint, dwell: 5.8,
      });
    }
  }
  if (museum.contact) {
    stops.push({
      type: 'end', ex: museum.contact,
      get eyebrow() { return say('hub.beforeLeave'); },
      get title() { return say('hub.thanksTour'); },
      get text() { return say('together'); },
      view: museum.contact.viewpoint, dwell: 6,
    });
  }
  return stops;
}

export class Tour {
  constructor(museum, player, { onStop, onArrive, onEnd, narrow = () => false, jump = false }) {
    this.museum = museum;
    this.player = player;
    this.auto = new Autopilot(player);
    this.stops = buildStops(museum);
    this.narrow = narrow; // portrait screen: look at one picture instead of the whole wall
    this.jump = jump; // cut to each stop instead of gliding (reduced motion)
    this.onStop = onStop; // heading to a stop
    this.onArrive = onArrive;
    this.onEnd = onEnd; // true when finished, false when stopped early
    this.running = false;
    this.paused = false;
    this.index = 0;
    this.phase = 'travel';
    this.timer = 0;
  }

  get stop() {
    return this.stops[this.index];
  }

  get progress() {
    return this.phase === 'dwell' ? clamp(this.timer / this.stop.dwell, 0, 1) : 0;
  }

  start() {
    this.running = true;
    this.paused = false;
    this.goto(0);
  }

  goto(i) {
    if (i >= this.stops.length) {
      this.finish(true);
      return;
    }
    this.index = clamp(i, 0, this.stops.length - 1);
    const view = (this.narrow() && this.stop.ex?.viewpointHero) || this.stop.view;
    this.timer = 0;
    this.onStop(this.stop, this.index, this.stops.length);
    if (this.jump) {
      this.player.teleport(view);
      this.phase = 'dwell';
      this.onArrive(this.stop);
      return;
    }
    this.auto.start(this.museum.route(this.player.pos, view), view);
    this.phase = 'travel';
  }

  next() { this.goto(this.index + 1); }

  prev() { this.goto(this.index - 1); }

  nextRoom() {
    const i = this.stops.findIndex((s, k) => k > this.index && (s.type === 'room' || s.type === 'end'));
    this.goto(i === -1 ? this.stops.length : i);
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  // stops without calling onEnd
  cancel() {
    this.running = false;
    this.auto.active = false;
  }

  finish(done) {
    this.cancel();
    this.onEnd(done);
  }

  update(dt) {
    if (!this.running || this.paused) return;
    if (this.phase === 'travel') {
      if (this.auto.update(dt)) {
        this.phase = 'dwell';
        this.timer = 0;
        this.onArrive(this.stop);
      }
    } else {
      this.timer += dt;
      if (this.timer >= this.stop.dwell) this.next();
    }
  }
}
