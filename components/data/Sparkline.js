Dixel.define('Sparkline', ['Component', 'Utils', 'Ticker', 'Motion'], function (Component, Utils, Ticker, Motion) {
  'use strict';

  function channelsOf(hex) {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
    const num = parseInt(full, 16);
    return ((num >> 16) & 255) + ',' + ((num >> 8) & 255) + ',' + (num & 255);
  }

  class Sparkline extends Component {
    static defaults = {
      data: [],
      color: 'primary',
      lineWidth: 2,
      fill: true,
      pointMarkers: false,
      duration: 1.4,
      padding: 3
    };

    build() {
      return Utils.el('div', 'dx-spark');
    }

    ready() {
      this.el.classList.add('dx-spark');
      this.canvas = this.el.querySelector('canvas') || this.el.appendChild(Utils.el('canvas', 'dx-spark-canvas'));
      this.context = this.canvas.getContext('2d');
      this.color = getComputedStyle(this.el).getPropertyValue('--dx-' + this.options.color).trim();
      this.channels = channelsOf(this.color);
      this.progress = 0;
      this.played = false;
      this.stopFrames = null;
      this.fit();
      this.listen(window, 'resize', () => {
        this.fit();
        this.paint();
      });
      this.addCleanup(() => this.halt());
      this.whenVisible((visible) => {
        if (visible && !this.played) this.play();
      });
    }

    fit() {
      this.size = Utils.fitCanvas(this.canvas, this.context);
    }

    play() {
      this.played = true;
      if (Utils.reducedMotion) {
        this.progress = 1;
        this.paint();
        return;
      }
      const duration = Math.max(this.options.duration, 0.001);
      let elapsed = 0;
      this.halt();
      this.stopFrames = Ticker.add((time, delta) => {
        elapsed += delta;
        this.progress = Motion.eases.inOut(Utils.clamp(elapsed / duration, 0, 1));
        this.paint();
        if (elapsed >= duration) this.halt();
      });
    }

    halt() {
      if (!this.stopFrames) return;
      this.stopFrames();
      this.stopFrames = null;
    }

    points() {
      const data = this.options.data;
      const pad = this.options.padding;
      const width = this.size.width - pad * 2;
      const height = this.size.height - pad * 2;
      const min = Math.min(...data);
      const max = Math.max(...data);
      const span = max - min || 1;
      return data.map((value, index) => ({
        x: pad + (index / (data.length - 1)) * width,
        y: pad + height - ((value - min) / span) * height
      }));
    }

    paint() {
      const ctx = this.context;
      const width = this.size.width;
      const height = this.size.height;
      ctx.clearRect(0, 0, width, height);
      if (this.options.data.length < 2 || this.progress <= 0) return;
      const pts = this.points();
      const visibleCount = 1 + (pts.length - 1) * this.progress;
      const wholeCount = Math.floor(visibleCount);
      const partial = visibleCount - wholeCount;
      const path = pts.slice(0, wholeCount);
      if (wholeCount < pts.length && partial > 0) {
        const prev = pts[wholeCount - 1];
        const next = pts[wholeCount];
        path.push({ x: prev.x + (next.x - prev.x) * partial, y: prev.y + (next.y - prev.y) * partial });
      }
      if (path.length < 2) return;
      if (this.options.fill) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(' + this.channels + ',' + 0.3 * this.progress + ')');
        gradient.addColorStop(1, 'rgba(' + this.channels + ',0)');
        ctx.beginPath();
        ctx.moveTo(path[0].x, height);
        path.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.lineTo(path[path.length - 1].x, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      ctx.beginPath();
      path.forEach((pt, index) => (index ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.options.lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      if (this.options.pointMarkers) {
        ctx.fillStyle = this.color;
        for (let p = 0; p < wholeCount && p < pts.length; p++) {
          ctx.beginPath();
          ctx.arc(pts[p].x, pts[p].y, this.options.lineWidth, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const tip = path[path.length - 1];
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, this.options.lineWidth + 1, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  return Sparkline;
});
