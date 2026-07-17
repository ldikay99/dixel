Dixel.define('RadarChart', ['Component', 'Utils', 'Ticker', 'Motion', 'ChartTooltip'], function (Component, Utils, Ticker, Motion, ChartTooltip) {
  'use strict';

  class RadarChart extends Component {
    static defaults = {
      axes: [],
      series: [],
      colors: ['primary', 'cyan', 'magenta'],
      max: 100,
      rings: 4,
      duration: 1.2,
      legend: true,
      locale: 'es-CO'
    };

    build() {
      return Utils.el('div', 'dx-radar');
    }

    ready() {
      this.el.classList.add('dx-radar');
      this.addCleanup(() => ChartTooltip.hide());
      this.frame = Utils.el('div', 'dx-radar-frame');
      this.canvas = Utils.el('canvas', 'dx-radar-canvas');
      this.frame.appendChild(this.canvas);
      this.el.appendChild(this.frame);
      this.context = this.canvas.getContext('2d');
      const styles = getComputedStyle(this.el);
      this.palette = this.options.series.map((serie, index) =>
        styles.getPropertyValue('--dx-' + (serie.color || this.options.colors[index % this.options.colors.length])).trim()
      );
      this.inkDim = styles.getPropertyValue('--dx-ink-dim').trim();
      this.gridColor = styles.getPropertyValue('--dx-line').trim();
      this.fontFamily = styles.getPropertyValue('--dx-font-sans').trim() || 'sans-serif';
      this.formatter = new Intl.NumberFormat(this.options.locale, { maximumFractionDigits: 1 });
      this.elapsed = 0;
      this.played = false;
      this.stopFrames = null;
      this.hoverAxis = -1;
      this.origin = null;
      if (this.options.legend && this.options.series.length > 1) this.renderLegend();
      this.fit();
      this.listen(window, 'resize', () => {
        this.fit();
        this.origin = null;
        this.paint();
      });
      this.bindPointer();
      this.addCleanup(() => this.halt());
      this.whenVisible((visible) => {
        if (visible && !this.played) this.play();
        if (!visible) this.clearHover();
      });
    }

    renderLegend() {
      const legend = Utils.el('div', 'dx-chart-legend');
      this.options.series.forEach((serie, index) => {
        const item = Utils.el('span', 'dx-chart-legend-item');
        const dot = Utils.el('span', 'dx-chart-legend-dot');
        dot.style.background = this.palette[index];
        item.appendChild(dot);
        item.appendChild(Utils.el('span', null, { text: serie.label || 'Serie ' + (index + 1) }));
        legend.appendChild(item);
      });
      this.el.appendChild(legend);
    }

    fit() {
      this.size = Utils.fitCanvas(this.canvas, this.context);
    }

    play() {
      this.played = true;
      if (Utils.reducedMotion) {
        this.elapsed = this.options.duration;
        this.paint();
        return;
      }
      this.halt();
      this.stopFrames = Ticker.add((time, delta) => {
        this.elapsed += delta;
        this.paint();
        if (this.elapsed >= this.options.duration) this.halt();
      });
    }

    halt() {
      if (!this.stopFrames) return;
      this.stopFrames();
      this.stopFrames = null;
    }

    angleOf(index) {
      return -Math.PI / 2 + (index / this.options.axes.length) * Math.PI * 2;
    }

    bindPointer() {
      this.listen(this.canvas, 'pointerenter', () => {
        this.origin = this.canvas.getBoundingClientRect();
      });
      this.listen(this.canvas, 'pointermove', (event) => {
        if (!this.origin || !this.options.axes.length) return;
        const centerX = this.origin.left + this.origin.width / 2;
        const centerY = this.origin.top + this.origin.height / 2;
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) + Math.PI / 2;
        const slice = (Math.PI * 2) / this.options.axes.length;
        const index = ((Math.round(angle / slice) % this.options.axes.length) + this.options.axes.length) % this.options.axes.length;
        if (index === this.hoverAxis) return;
        this.hoverAxis = index;
        this.paint();
        this.showTip(event.clientX, event.clientY);
      });
      this.listen(this.canvas, 'pointerleave', () => this.clearHover());
    }

    clearHover() {
      if (this.hoverAxis === -1) return;
      this.hoverAxis = -1;
      ChartTooltip.hide();
      this.paint();
    }

    showTip(x, y) {
      const index = this.hoverAxis;
      if (index < 0) return;
      ChartTooltip.show({
        title: this.options.axes[index],
        rows: this.options.series.map((serie, seriesIndex) => ({
          color: this.palette[seriesIndex],
          label: serie.label || 'Serie ' + (seriesIndex + 1),
          value: this.formatter.format(serie.data[index] || 0)
        })),
        x,
        y: y - 10
      });
    }

    paint() {
      const ctx = this.context;
      const width = this.size.width;
      const height = this.size.height;
      const axes = this.options.axes;
      ctx.clearRect(0, 0, width, height);
      if (axes.length < 3) return;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 28;
      const progress = Motion.eases.outBack(Utils.clamp(this.elapsed / this.options.duration, 0, 1));
      ctx.strokeStyle = this.gridColor;
      ctx.lineWidth = 1;
      for (let ring = 1; ring <= this.options.rings; ring++) {
        const ringRadius = (radius * ring) / this.options.rings;
        ctx.beginPath();
        axes.forEach((axis, index) => {
          const angle = this.angleOf(index);
          const x = centerX + Math.cos(angle) * ringRadius;
          const y = centerY + Math.sin(angle) * ringRadius;
          index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
      }
      ctx.font = '10px ' + this.fontFamily;
      axes.forEach((axis, index) => {
        const angle = this.angleOf(index);
        const endX = centerX + Math.cos(angle) * radius;
        const endY = centerY + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = index === this.hoverAxis ? this.inkDim : this.gridColor;
        ctx.stroke();
        ctx.fillStyle = this.inkDim;
        ctx.textAlign = Math.abs(Math.cos(angle)) < 0.3 ? 'center' : Math.cos(angle) > 0 ? 'left' : 'right';
        ctx.textBaseline = Math.sin(angle) > 0.3 ? 'top' : Math.sin(angle) < -0.3 ? 'bottom' : 'middle';
        ctx.fillText(axis, centerX + Math.cos(angle) * (radius + 10), centerY + Math.sin(angle) * (radius + 10));
      });
      this.options.series.forEach((serie, seriesIndex) => {
        const color = this.palette[seriesIndex];
        ctx.beginPath();
        axes.forEach((axis, index) => {
          const angle = this.angleOf(index);
          const value = Utils.clamp((serie.data[index] || 0) / this.options.max, 0, 1) * progress;
          const x = centerX + Math.cos(angle) * radius * value;
          const y = centerY + Math.sin(angle) * radius * value;
          index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = Utils.withAlpha(color, 0.18);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();
        axes.forEach((axis, index) => {
          const angle = this.angleOf(index);
          const value = Utils.clamp((serie.data[index] || 0) / this.options.max, 0, 1) * progress;
          ctx.beginPath();
          ctx.arc(centerX + Math.cos(angle) * radius * value, centerY + Math.sin(angle) * radius * value, index === this.hoverAxis ? 4 : 2.6, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        });
      });
    }
  }

  return RadarChart;
});
