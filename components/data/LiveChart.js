Dixel.define('LiveChart', ['Component', 'Utils', 'Ticker'], function (Component, Utils, Ticker) {
  'use strict';

  class LiveChart extends Component {
    static defaults = {
      capacity: 60,
      min: 0,
      max: 100,
      color: 'cyan',
      fill: true,
      demo: false,
      demoInterval: 0.35,
      label: null
    };

    build() {
      return Utils.el('div', 'dx-livechart');
    }

    ready() {
      this.el.classList.add('dx-livechart');
      if (this.options.label) {
        const head = Utils.el('div', 'dx-livechart-head');
        head.appendChild(Utils.el('span', 'dx-livechart-label', { text: this.options.label }));
        this.valueEl = Utils.el('b', 'dx-livechart-value', { text: '—' });
        head.appendChild(this.valueEl);
        this.el.appendChild(head);
      }
      this.frame = Utils.el('div', 'dx-livechart-frame');
      this.canvas = Utils.el('canvas', 'dx-livechart-canvas');
      this.frame.appendChild(this.canvas);
      this.dot = Utils.el('span', 'dx-livechart-dot');
      this.frame.appendChild(this.dot);
      this.el.appendChild(this.frame);
      this.context = this.canvas.getContext('2d');
      this.buffer = [];
      this.demoClock = 0;
      this.demoPhase = Math.random() * 10;
      this.dirty = true;
      const styles = getComputedStyle(this.el);
      this.color = styles.getPropertyValue('--dx-' + this.options.color).trim();
      this.gridColor = styles.getPropertyValue('--dx-line').trim();
      this.dot.style.background = this.color;
      this.fit();
      this.listen(window, 'resize', () => {
        this.fit();
        this.dirty = true;
      });
      this.stopFrame = null;
      this.whenVisible((visible) => {
        if (visible && !this.stopFrame) {
          this.stopFrame = Ticker.add((time, delta) => this.tick(delta));
        } else if (!visible && this.stopFrame) {
          this.stopFrame();
          this.stopFrame = null;
        }
      });
      this.addCleanup(() => {
        if (this.stopFrame) this.stopFrame();
      });
    }

    fit() {
      this.size = Utils.fitCanvas(this.canvas, this.context);
    }

    push(value) {
      this.buffer.push(Utils.clamp(value, this.options.min, this.options.max));
      if (this.buffer.length > this.options.capacity) this.buffer.shift();
      if (this.valueEl) this.valueEl.textContent = Math.round(value);
      this.dirty = true;
    }

    tick(delta) {
      if (!this.visible) return;
      if (this.options.demo && !Utils.reducedMotion) {
        this.demoClock += delta;
        if (this.demoClock >= this.options.demoInterval) {
          this.demoClock = 0;
          this.demoPhase += 0.4;
          const span = this.options.max - this.options.min;
          const wave = Math.sin(this.demoPhase) * 0.25 + Math.sin(this.demoPhase * 2.7) * 0.12;
          this.push(this.options.min + span * (0.5 + wave + (Math.random() - 0.5) * 0.12));
        }
      }
      if (!this.dirty) return;
      this.dirty = false;
      this.paint();
    }

    paint() {
      const ctx = this.context;
      const width = this.size.width;
      const height = this.size.height;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = this.gridColor;
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      if (this.buffer.length < 2) return;
      const span = this.options.max - this.options.min;
      const stepX = width / (this.options.capacity - 1);
      const offset = (this.options.capacity - this.buffer.length) * stepX;
      const points = this.buffer.map((value, index) => ({
        x: offset + index * stepX,
        y: height - 6 - ((value - this.options.min) / span) * (height - 12)
      }));
      if (this.options.fill) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, Utils.withAlpha(this.color, 0.2));
        gradient.addColorStop(1, Utils.withAlpha(this.color, 0));
        ctx.beginPath();
        ctx.moveTo(points[0].x, height);
        points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.lineTo(points[points.length - 1].x, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      ctx.beginPath();
      points.forEach((pt, index) => (index ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.save();
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 7;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
      const tip = points[points.length - 1];
      this.dot.style.transform = 'translate3d(' + (tip.x - 4) + 'px,' + (tip.y - 4) + 'px,0)';
    }
  }

  return LiveChart;
});
