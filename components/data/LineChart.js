Dixel.define('LineChart', ['Component', 'Utils', 'Ticker', 'Motion', 'ChartTooltip'], function (Component, Utils, Ticker, Motion, ChartTooltip) {
  'use strict';

  function channelsOf(hex) {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
    const num = parseInt(full, 16);
    return ((num >> 16) & 255) + ',' + ((num >> 8) & 255) + ',' + (num & 255);
  }

  function niceCeil(value) {
    if (value <= 0) return 1;
    const power = Math.pow(10, Math.floor(Math.log10(value)));
    const unit = value / power;
    const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
    return nice * power;
  }

  function traceSmooth(ctx, path) {
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length - 1; i++) {
      const midX = (path[i].x + path[i + 1].x) / 2;
      const midY = (path[i].y + path[i + 1].y) / 2;
      ctx.quadraticCurveTo(path[i].x, path[i].y, midX, midY);
    }
    const last = path[path.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  class LineChart extends Component {
    static defaults = {
      labels: [],
      series: [],
      colors: ['primary', 'cyan', 'magenta', 'warning'],
      curve: 'smooth',
      lineWidth: 2,
      showGrid: true,
      gridColor: 'line',
      labelRotation: 0,
      pointMarkers: false,
      yTicks: 4,
      duration: 1.5,
      stagger: 0.18,
      fill: true,
      glow: true,
      legend: true,
      tooltip: true,
      markExtremes: false,
      format: 'compact',
      currency: 'USD',
      locale: 'es-CO'
    };

    build() {
      return Utils.el('div', 'dx-linechart');
    }

    makeFormatter() {
      const locale = this.options.locale;
      if (this.options.format === 'percent') {
        const base = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
        return (value) => base.format(value) + '%';
      }
      if (this.options.format === 'currency') {
        const base = new Intl.NumberFormat(locale, { style: 'currency', currency: this.options.currency, maximumFractionDigits: 0 });
        return (value) => base.format(value);
      }
      if (this.options.format === 'number') {
        const base = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
        return (value) => base.format(value);
      }
      const base = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, notation: 'compact' });
      return (value) => base.format(value);
    }

    ready() {
      this.el.classList.add('dx-linechart');
      this.addCleanup(() => ChartTooltip.hide());
      this.canvasHost = Utils.el('div', 'dx-linechart-frame');
      this.canvas = Utils.el('canvas', 'dx-linechart-canvas');
      this.canvasHost.appendChild(this.canvas);
      this.el.appendChild(this.canvasHost);
      this.context = this.canvas.getContext('2d');
      this.hidden = this.options.series.map(() => false);
      this.resolveColors();
      this.formatter = this.makeFormatter();
      this.elapsed = 0;
      this.played = false;
      this.stopFrames = null;
      this.hoverIndex = -1;
      this.layout = null;
      this.canvasOrigin = null;
      this.computeScale();
      if (this.options.legend && this.options.series.length > 1) this.renderLegend();
      this.fit();
      this.listen(window, 'resize', () => {
        this.fit();
        this.canvasOrigin = null;
        this.paint();
      });
      if (this.options.tooltip) this.bindPointer();
      this.observeTheme();
      this.addCleanup(() => this.halt());
      this.whenVisible((visible) => {
        if (visible && !this.played) this.play();
        if (!visible) this.clearHover();
      });
    }

    resolveColors() {
      const styles = getComputedStyle(this.el);
      this.palette = this.options.series.map((serie, index) =>
        styles.getPropertyValue('--dx-' + (serie.color || this.options.colors[index % this.options.colors.length])).trim()
      );
      this.inkDim = styles.getPropertyValue('--dx-ink-dim').trim();
      this.inkColor = styles.getPropertyValue('--dx-ink').trim();
      this.gridColor = styles.getPropertyValue('--dx-' + this.options.gridColor).trim() ||
        styles.getPropertyValue('--dx-line').trim();
      this.fontFamily = styles.getPropertyValue('--dx-font-sans').trim() || 'sans-serif';
    }

    observeTheme() {
      const observer = new MutationObserver(() => {
        this.resolveColors();
        if (this.legendEl) {
          this.legendEl.querySelectorAll('.dx-chart-legend-dot').forEach((dot, index) => {
            dot.style.background = this.palette[index];
          });
        }
        this.paint();
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-dx-theme'] });
      this.addCleanup(() => observer.disconnect());
    }

    computeScale() {
      const values = [];
      this.options.series.forEach((serie, index) => {
        if (this.hidden[index]) return;
        serie.data.forEach((value) => values.push(value));
      });
      const rawMax = values.length ? Math.max.apply(null, values) : 1;
      const rawMin = values.length ? Math.min.apply(null, values) : 0;
      this.minValue = Math.min(0, rawMin);
      this.maxValue = niceCeil(rawMax);
      if (this.maxValue === this.minValue) this.maxValue = this.minValue + 1;
    }

    renderLegend() {
      this.legendEl = Utils.el('div', 'dx-chart-legend');
      this.options.series.forEach((serie, index) => {
        const item = Utils.el('button', 'dx-chart-legend-item', { type: 'button' });
        const dot = Utils.el('span', 'dx-chart-legend-dot');
        dot.style.background = this.palette[index];
        item.appendChild(dot);
        item.appendChild(Utils.el('span', null, { text: serie.label || 'Serie ' + (index + 1) }));
        this.listen(item, 'click', () => {
          this.hidden[index] = !this.hidden[index];
          item.classList.toggle('is-off', this.hidden[index]);
          this.computeScale();
          this.paint();
        });
        this.legendEl.appendChild(item);
      });
      this.el.appendChild(this.legendEl);
    }

    fit() {
      this.size = Utils.fitCanvas(this.canvas, this.context);
    }

    bindPointer() {
      this.listen(this.canvas, 'pointerenter', () => {
        this.canvasOrigin = this.canvas.getBoundingClientRect();
      });
      this.listen(this.canvas, 'pointermove', (event) => {
        if (!this.layout || !this.canvasOrigin) return;
        const localX = event.clientX - this.canvasOrigin.left;
        const ratio = (localX - this.layout.padLeft) / Math.max(this.layout.plotWidth, 1);
        const index = Math.round(ratio * (this.layout.pointCount - 1));
        const clamped = Utils.clamp(index, 0, this.layout.pointCount - 1);
        if (clamped === this.hoverIndex) return;
        this.hoverIndex = clamped;
        this.paint();
        this.showTip();
      });
      this.listen(this.canvas, 'pointerleave', () => this.clearHover());
    }

    clearHover() {
      if (this.hoverIndex === -1) return;
      this.hoverIndex = -1;
      ChartTooltip.hide();
      this.paint();
    }

    showTip() {
      const index = this.hoverIndex;
      if (index < 0 || !this.canvasOrigin) return;
      const rows = [];
      this.options.series.forEach((serie, seriesIndex) => {
        if (this.hidden[seriesIndex] || serie.data[index] === undefined) return;
        rows.push({
          color: this.palette[seriesIndex],
          label: serie.label || 'Serie ' + (seriesIndex + 1),
          value: this.formatter(serie.data[index])
        });
      });
      if (!rows.length) return;
      const x = this.canvasOrigin.left + this.layout.padLeft + (index / Math.max(this.layout.pointCount - 1, 1)) * this.layout.plotWidth;
      ChartTooltip.show({
        title: this.options.labels[index] || '',
        rows,
        x,
        y: this.canvasOrigin.top + this.layout.padTop
      });
    }

    totalDuration() {
      return this.options.duration + this.options.stagger * Math.max(this.options.series.length - 1, 0);
    }

    play() {
      this.played = true;
      if (Utils.reducedMotion) {
        this.elapsed = this.totalDuration();
        this.paint();
        return;
      }
      this.halt();
      this.stopFrames = Ticker.add((time, delta) => {
        this.elapsed += delta;
        this.paint();
        if (this.elapsed >= this.totalDuration()) this.halt();
      });
    }

    halt() {
      if (!this.stopFrames) return;
      this.stopFrames();
      this.stopFrames = null;
    }

    seriesProgress(index) {
      const local = (this.elapsed - index * this.options.stagger) / this.options.duration;
      return Motion.eases.inOut(Utils.clamp(local, 0, 1));
    }

    pointsFor(serie, pad, plotWidth, plotHeight, pointCount) {
      const range = this.maxValue - this.minValue;
      return serie.data.map((value, index) => ({
        x: pad.left + (index / Math.max(pointCount - 1, 1)) * plotWidth,
        y: pad.top + plotHeight - ((value - this.minValue) / range) * plotHeight
      }));
    }

    paint() {
      const ctx = this.context;
      const width = this.size.width;
      const height = this.size.height;
      ctx.clearRect(0, 0, width, height);
      if (!this.options.series.length) return;
      ctx.font = '10px ' + this.fontFamily;
      const ticks = [];
      for (let i = 0; i <= this.options.yTicks; i++) {
        ticks.push(this.minValue + ((this.maxValue - this.minValue) * i) / this.options.yTicks);
      }
      let labelWidth = 0;
      ticks.forEach((tick) => {
        labelWidth = Math.max(labelWidth, ctx.measureText(this.formatter(tick)).width);
      });
      const rotation = this.options.labelRotation;
      const pad = { left: labelWidth + 12, right: 8, top: 8, bottom: this.options.labels.length ? (rotation ? 36 : 22) : 8 };
      const plotWidth = width - pad.left - pad.right;
      const plotHeight = height - pad.top - pad.bottom;
      if (plotWidth <= 0 || plotHeight <= 0) return;
      const pointCount = Math.max.apply(null, this.options.series.map((serie) => serie.data.length));
      this.layout = { padLeft: pad.left, padTop: pad.top, plotWidth, plotHeight, pointCount };
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.inkDim;
      ctx.strokeStyle = this.gridColor;
      ctx.lineWidth = 1;
      ticks.forEach((tick, index) => {
        const y = pad.top + plotHeight - (index / this.options.yTicks) * plotHeight;
        if (this.options.showGrid) {
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(width - pad.right, y);
          ctx.stroke();
        }
        ctx.fillText(this.formatter(tick), pad.left - 6, y);
      });
      if (this.options.labels.length) {
        ctx.textBaseline = 'alphabetic';
        const minGap = rotation ? 28 : 46;
        const step = Math.max(1, Math.ceil((this.options.labels.length * minGap) / Math.max(plotWidth, 1)));
        this.options.labels.forEach((label, index) => {
          if (index % step !== 0) return;
          const x = pad.left + (index / Math.max(pointCount - 1, 1)) * plotWidth;
          if (rotation) {
            ctx.save();
            ctx.translate(x, height - 6);
            ctx.rotate((-rotation * Math.PI) / 180);
            ctx.textAlign = 'right';
            ctx.fillText(label, 0, 0);
            ctx.restore();
          } else {
            ctx.textAlign = 'center';
            ctx.fillText(label, x, height - 6);
          }
        });
      }
      if (this.hoverIndex >= 0) {
        const hoverX = pad.left + (this.hoverIndex / Math.max(pointCount - 1, 1)) * plotWidth;
        ctx.strokeStyle = this.inkDim;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(hoverX, pad.top);
        ctx.lineTo(hoverX, pad.top + plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const smooth = this.options.curve !== 'linear';
      this.options.series.forEach((serie, seriesIndex) => {
        if (this.hidden[seriesIndex]) return;
        const progress = this.seriesProgress(seriesIndex);
        if (progress <= 0 || serie.data.length < 2) return;
        const pts = this.pointsFor(serie, pad, plotWidth, plotHeight, pointCount);
        const visibleCount = 1 + (pts.length - 1) * progress;
        const wholeCount = Math.floor(visibleCount);
        const partial = visibleCount - wholeCount;
        const path = pts.slice(0, wholeCount);
        if (wholeCount < pts.length && partial > 0) {
          const prev = pts[wholeCount - 1];
          const next = pts[wholeCount];
          path.push({ x: prev.x + (next.x - prev.x) * partial, y: prev.y + (next.y - prev.y) * partial });
        }
        if (path.length < 2) return;
        const color = this.palette[seriesIndex];
        if (this.options.fill) {
          const baseline = pad.top + plotHeight;
          const gradient = ctx.createLinearGradient(0, pad.top, 0, baseline);
          gradient.addColorStop(0, 'rgba(' + channelsOf(color) + ',' + 0.2 * progress + ')');
          gradient.addColorStop(1, 'rgba(' + channelsOf(color) + ',0)');
          ctx.beginPath();
          ctx.moveTo(path[0].x, baseline);
          if (smooth) traceSmooth(ctx, path);
          else path.forEach((pt) => ctx.lineTo(pt.x, pt.y));
          ctx.lineTo(path[path.length - 1].x, baseline);
          ctx.closePath();
          ctx.fillStyle = gradient;
          ctx.fill();
        }
        const strokeWidth = serie.lineWidth || this.options.lineWidth;
        ctx.beginPath();
        if (smooth) traceSmooth(ctx, path);
        else path.forEach((pt, index) => (index ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
        if (this.options.glow) {
          ctx.save();
          ctx.shadowColor = 'rgba(' + channelsOf(color) + ',0.5)';
          ctx.shadowBlur = 8;
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        if (this.options.pointMarkers) {
          const markerCount = Math.min(wholeCount, pts.length);
          ctx.fillStyle = color;
          for (let p = 0; p < markerCount; p++) {
            ctx.beginPath();
            ctx.arc(pts[p].x, pts[p].y, strokeWidth + 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (this.hoverIndex >= 0 && this.hoverIndex < pts.length && progress >= 1) {
          const pt = pts[this.hoverIndex];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.stroke();
        }
        if (this.options.markExtremes && progress >= 1) this.drawExtremes(ctx, serie, pts, color);
      });
    }

    drawExtremes(ctx, serie, pts, color) {
      let maxIndex = 0;
      let minIndex = 0;
      serie.data.forEach((value, index) => {
        if (value > serie.data[maxIndex]) maxIndex = index;
        if (value < serie.data[minIndex]) minIndex = index;
      });
      ctx.font = '600 10px ' + this.fontFamily;
      [{ idx: maxIndex, mark: '▲ ', dy: -10 }, { idx: minIndex, mark: '▼ ', dy: 16 }].forEach((extreme) => {
        const pt = pts[extreme.idx];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(extreme.mark + this.formatter(serie.data[extreme.idx]), pt.x, pt.y + extreme.dy);
      });
    }
  }

  return LineChart;
});
