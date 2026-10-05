// Floor plan in the corner of the HUD. The entrance is at the bottom.
const PAD = 10;

export class Minimap {
  constructor(canvas, museum) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rooms = museum.plan;
    this.current = null;

    const pts = this.rooms.flatMap((r) => r.bounds);
    this.min = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))];
    this.max = [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
    canvas.style.aspectRatio = `${this.max[0] - this.min[0] + 4} / ${this.max[1] - this.min[1] + 4}`; // lets CSS size it by width
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return false;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    const sx = (w - 2 * PAD) / (this.max[0] - this.min[0]);
    const sy = (h - 2 * PAD) / (this.max[1] - this.min[1]);
    this.scale = Math.min(sx, sy);
    this.ox = (w - (this.max[0] - this.min[0]) * this.scale) / 2;
    this.oy = (h - (this.max[1] - this.min[1]) * this.scale) / 2;
    return true;
  }

  toCanvas(x, z) {
    return [this.ox + (x - this.min[0]) * this.scale, this.oy + (z - this.min[1]) * this.scale];
  }

  draw(player, room) {
    if (room !== undefined) this.current = room;
    if (!this.resize()) return;
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';

    for (const r of this.rooms) {
      const poly = r.bounds.map(([x, z]) => this.toCanvas(x, z));
      ctx.beginPath();
      poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = r.kind === 'hub' ? 'rgba(236, 230, 218, 0.94)' : r.wall;
      ctx.fill();
      ctx.lineWidth = r === this.current ? 2.2 : 1;
      ctx.strokeStyle = r === this.current ? '#e6c46a' : 'rgba(20, 17, 14, 0.7)';
      ctx.stroke();

      if (r.kind !== 'hub') {
        const [cx, cy] = this.toCanvas(r.center.x, r.center.z);
        ctx.fillStyle = r.ink.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '500 11px "EB Garamond", Georgia, serif';
        ctx.fillText(r.numeral, cx, cy);
      }
    }

    // entrance
    const [ex, ey] = this.toCanvas(0, 0);
    ctx.fillStyle = 'rgba(20, 17, 14, 0.75)';
    ctx.fillRect(ex - 9, ey - 2, 18, 3);

    if (player) {
      const [px, py] = this.toCanvas(player.pos.x, player.pos.z);
      const a = Math.atan2(-Math.cos(player.yaw), -Math.sin(player.yaw)); // heading on the plan
      const s = 6;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(s * 1.3, 0);
      ctx.lineTo(-s * 0.8, s * 0.8);
      ctx.lineTo(-s * 0.4, 0);
      ctx.lineTo(-s * 0.8, -s * 0.8);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(20, 17, 14, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
  }
}
