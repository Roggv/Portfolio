// First-person controls: pointer lock look, WASD / arrows, Shift to run, touch joystick and drag to look.
import * as THREE from 'three';

const WALK = 3.0;
const RUN = 5.5;
const RADIUS = 0.35;
const EYE = 1.65;
const MOUSE_SENS = 0.0022;
const TOUCH_SENS = 0.005;
const BOB_RATE = 1.4; // head-bob units per metre, a step takes 2

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Player {
  constructor(camera, dom, colliders) {
    this.camera = camera;
    this.dom = dom;
    this.colliders = colliders;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector2();
    this.yaw = 0;
    this.pitch = 0;
    this.bob = 0;
    this.bobAmp = 0.022; // how much the camera sways as you walk (metres)
    this.onStep = null; // called with `true` when running, each time a foot lands
    this.enabled = false;
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    camera.rotation.order = 'YXZ';

    addEventListener('keydown', (e) => this.keys.add(e.code));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === dom) this.look(-e.movementX * MOUSE_SENS, -e.movementY * MOUSE_SENS);
    });
  }

  look(dYaw, dPitch) {
    this.yaw += dYaw;
    this.pitch = clamp(this.pitch + dPitch, -1.35, 1.35);
  }

  teleport({ x, z, yaw = 0, pitch = 0 }) {
    this.pos.set(x, 0, z);
    this.vel.set(0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this.apply(0);
  }

  update(dt) {
    let f = 0;
    let s = 0;
    const k = this.keys;
    if (this.enabled) {
      if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
      f -= this.stick.y;
      s += this.stick.x;
    }
    const len = Math.hypot(f, s);
    if (len > 1) { f /= len; s /= len; }
    const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN : WALK;

    // forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw)
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const tx = (-sin * f + cos * s) * speed;
    const tz = (-cos * f - sin * s) * speed;
    const a = 1 - Math.exp(-dt * 12);
    this.vel.x += (tx - this.vel.x) * a;
    this.vel.y += (tz - this.vel.y) * a;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.y * dt;
    this.collide();

    const v = this.vel.length();
    this.stride(v, dt);
    this.apply(v);
  }

  // a foot lands when the head bob reaches its lowest point
  stride(speed, dt) {
    const before = Math.floor((this.bob + 0.5) / 2);
    this.bob += speed * dt * BOB_RATE;
    if (Math.floor((this.bob + 0.5) / 2) > before) this.onStep?.(speed > (WALK + RUN) / 2);
  }

  // used by the tour to move the camera, still collides with plinths and walls
  drive(x, z, yaw, pitch, dt) {
    const px = this.pos.x;
    const pz = this.pos.z;
    this.pos.set(x, 0, z);
    this.collide();
    this.yaw = yaw;
    this.pitch = pitch;
    this.vel.set(0, 0);
    const speed = dt > 0 ? Math.hypot(this.pos.x - px, this.pos.z - pz) / dt : 0;
    this.stride(speed, dt);
    this.apply(speed);
  }

  // Pushes the player circle out of every collider. A box is { x, z } centre, { ux, uz } and { vx, vz }
  // side directions, { hx, hz } half sizes. A circle is { x, z, r }.
  collide() {
    const p = this.pos;
    for (let iter = 0; iter < 2; iter++) {
      for (const b of this.colliders) {
        const dx = p.x - b.x;
        const dz = p.z - b.z;
        if (b.r !== undefined) {
          const reach = b.r + RADIUS;
          const dist = Math.hypot(dx, dz);
          if (dist >= reach) continue;
          if (dist > 1e-6) { // push straight out from the centre
            p.x += (dx / dist) * (reach - dist);
            p.z += (dz / dist) * (reach - dist);
          } else p.x += reach;
          continue;
        }
        const lx = dx * b.ux + dz * b.uz; // where the player is, in the box's own frame
        const lz = dx * b.vx + dz * b.vz;
        const ex = lx - clamp(lx, -b.hx, b.hx);
        const ez = lz - clamp(lz, -b.hz, b.hz);
        const d2 = ex * ex + ez * ez;
        if (d2 >= RADIUS * RADIUS) continue;
        let px;
        let pz; // how far to push, in the box's frame
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          px = (ex / d) * (RADIUS - d);
          pz = (ez / d) * (RADIUS - d);
        } else {
          // The centre is inside the box: leave through the nearest side
          const left = lx + b.hx;
          const right = b.hx - lx;
          const near = lz + b.hz;
          const far = b.hz - lz;
          const m = Math.min(left, right, near, far);
          px = m === left ? -(left + RADIUS) : m === right ? right + RADIUS : 0;
          pz = m === near ? -(near + RADIUS) : m === far ? far + RADIUS : 0;
        }
        p.x += px * b.ux + pz * b.vx;
        p.z += px * b.uz + pz * b.vz;
      }
    }
  }

  apply(speed) {
    const bob = Math.sin(this.bob * Math.PI) * this.bobAmp * Math.min(speed / WALK, 1);
    this.camera.position.set(this.pos.x, EYE + bob, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  // left joystick walks, dragging elsewhere looks, a tap calls onTap
  attachTouch(joystick, knob, onTap) {
    const R = 48;
    let stickId = null;
    const moveStick = (e) => {
      const r = joystick.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      this.stick.x = dx / R;
      this.stick.y = dy / R;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const endStick = (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null;
      this.stick.x = this.stick.y = 0;
      knob.style.transform = '';
    };
    joystick.addEventListener('pointerdown', (e) => {
      stickId = e.pointerId;
      joystick.setPointerCapture(e.pointerId);
      moveStick(e);
    });
    joystick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
    joystick.addEventListener('pointerup', endStick);
    joystick.addEventListener('pointercancel', endStick);

    const drags = new Map();
    this.dom.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      drags.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() });
    });
    this.dom.addEventListener('pointermove', (e) => {
      const d = drags.get(e.pointerId);
      if (!d) return;
      if (this.enabled) this.look(-(e.clientX - d.x) * TOUCH_SENS, -(e.clientY - d.y) * TOUCH_SENS);
      d.x = e.clientX;
      d.y = e.clientY;
    });
    const endDrag = (e) => {
      const d = drags.get(e.pointerId);
      if (!d) return;
      drags.delete(e.pointerId);
      const moved = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (e.type === 'pointerup' && moved < 10 && performance.now() - d.t < 350) onTap(e.clientX, e.clientY);
    };
    this.dom.addEventListener('pointerup', endDrag);
    this.dom.addEventListener('pointercancel', endDrag);
  }
}
