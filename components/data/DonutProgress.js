Dixel.define('DonutProgress', ['Component', 'Utils', 'Ticker', 'Motion', 'ChartTooltip'], function (Component, Utils, Ticker, Motion, ChartTooltip) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  class DonutProgress extends Component {
    static defaults = {
      segments: [],
      colors: ['primary', 'cyan', 'magenta', 'success', 'warning'],
      size: 180,
      stroke: 16,
      gap: 2.5,
      duration: 1.3,
      centerLabel: 'Total',
      legend: true,
      locale: 'es-CO'
    };

    build() {
      return Utils.el('div', 'dx-donut');
    }

    ready() {
      this.el.classList.add('dx-donut');
      this.addCleanup(() => ChartTooltip.hide());
      const styles = getComputedStyle(this.el);
      this.palette = this.options.segments.map((segment, index) =>
        styles.getPropertyValue('--dx-' + (segment.color || this.options.colors[index % this.options.colors.length])).trim()
      );
      this.formatter = new Intl.NumberFormat(this.options.locale, { maximumFractionDigits: 1 });
      this.total = this.options.segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
      this.renderRing();
      if (this.options.legend) this.renderLegend();
      this.whenVisible((visible) => {
        if (visible && !this.played) this.play();
      });
    }

    renderRing() {
      const size = this.options.size;
      const radius = (size - this.options.stroke) / 2;
      this.circumference = 2 * Math.PI * radius;
      const holder = Utils.el('div', 'dx-donut-ring');
      holder.style.width = holder.style.height = size + 'px';
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
      const track = document.createElementNS(SVG_NS, 'circle');
      track.setAttribute('cx', size / 2);
      track.setAttribute('cy', size / 2);
      track.setAttribute('r', radius);
      track.setAttribute('class', 'dx-donut-track');
      track.setAttribute('stroke-width', this.options.stroke);
      svg.appendChild(track);
      this.arcs = [];
      let offsetRatio = 0;
      this.options.segments.forEach((segment, index) => {
        const ratio = segment.value / this.total;
        const arc = document.createElementNS(SVG_NS, 'circle');
        arc.setAttribute('cx', size / 2);
        arc.setAttribute('cy', size / 2);
        arc.setAttribute('r', radius);
        arc.setAttribute('class', 'dx-donut-arc');
        arc.setAttribute('stroke', this.palette[index]);
        arc.setAttribute('stroke-width', this.options.stroke);
        arc.setAttribute('stroke-dasharray', '0 ' + this.circumference);
        arc.setAttribute('stroke-dashoffset', -offsetRatio * this.circumference);
        arc.dataset.index = index;
        this.arcs.push({ el: arc, ratio, offsetRatio });
        svg.appendChild(arc);
        offsetRatio += ratio;
      });
      holder.appendChild(svg);
      this.center = Utils.el('div', 'dx-donut-center');
      this.centerValue = Utils.el('b', 'dx-donut-value', { text: '0' });
      this.center.appendChild(this.centerValue);
      this.center.appendChild(Utils.el('span', 'dx-donut-label', { text: this.options.centerLabel }));
      holder.appendChild(this.center);
      this.el.appendChild(holder);
      this.bindHover(svg);
    }

    renderLegend() {
      const legend = Utils.el('div', 'dx-donut-legend');
      this.options.segments.forEach((segment, index) => {
        const item = Utils.el('div', 'dx-donut-legend-item');
        const dot = Utils.el('span', 'dx-chart-legend-dot');
        dot.style.background = this.palette[index];
        item.appendChild(dot);
        item.appendChild(Utils.el('span', 'dx-donut-legend-name', { text: segment.label }));
        item.appendChild(Utils.el('b', null, { text: Math.round((segment.value / this.total) * 100) + '%' }));
        legend.appendChild(item);
      });
      this.el.appendChild(legend);
    }

    bindHover(svg) {
      this.listen(svg, 'pointerover', (event) => {
        const arc = event.target.closest('.dx-donut-arc');
        if (!arc) return;
        const index = +arc.dataset.index;
        arc.classList.add('is-hot');
        const segment = this.options.segments[index];
        ChartTooltip.show({
          rows: [{
            color: this.palette[index],
            label: segment.label,
            value: this.formatter.format(segment.value) + ' · ' + Math.round((segment.value / this.total) * 100) + '%'
          }],
          x: event.clientX,
          y: event.clientY - 8
        });
      });
      this.listen(svg, 'pointerout', (event) => {
        const arc = event.target.closest('.dx-donut-arc');
        if (arc) arc.classList.remove('is-hot');
        ChartTooltip.hide();
      });
    }

    play() {
      this.played = true;
      if (Utils.reducedMotion) {
        this.applyProgress(1);
        return;
      }
      let elapsed = 0;
      const stop = Ticker.add((time, delta) => {
        elapsed += delta;
        const progress = Motion.eases.inOut(Utils.clamp(elapsed / this.options.duration, 0, 1));
        this.applyProgress(progress);
        if (progress >= 1) stop();
      });
      this.addCleanup(stop);
    }

    applyProgress(progress) {
      const gapLength = this.options.gap;
      this.arcs.forEach((arc) => {
        const visible = Math.max(arc.ratio * this.circumference * progress - gapLength, 0);
        arc.el.setAttribute('stroke-dasharray', visible + ' ' + (this.circumference - visible));
      });
      this.centerValue.textContent = this.formatter.format(Math.round(this.total * progress));
    }
  }

  return DonutProgress;
});
