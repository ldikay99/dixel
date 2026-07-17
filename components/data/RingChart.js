Dixel.define('RingChart', ['Component', 'Utils'], function (Component, Utils) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attributes) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attributes).forEach((key) => node.setAttribute(key, attributes[key]));
    return node;
  }

  class RingChart extends Component {
    static defaults = {
      data: [],
      colors: ['primary', 'cyan', 'magenta', 'warning', 'success'],
      thickness: 12,
      duration: 1,
      stagger: 0.14,
      centerLabel: null,
      centerValue: null,
      legend: true,
      locale: 'es-CO'
    };

    build() {
      return Utils.el('div', 'dx-ring');
    }

    ready() {
      this.el.classList.add('dx-ring');
      this.render();
      this.played = false;
      this.whenVisible((visible) => {
        if (visible && !this.played) this.play();
      });
    }

    colorVar(item, index) {
      return 'var(--dx-' + (item.color || this.options.colors[index % this.options.colors.length]) + ')';
    }

    render() {
      const data = this.options.data;
      const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
      const radius = 50 - this.options.thickness / 2;
      const circumference = 2 * Math.PI * radius;
      const figure = Utils.el('div', 'dx-ring-figure');
      const svg = svgEl('svg', { viewBox: '0 0 100 100', class: 'dx-ring-svg', role: 'img' });
      svg.appendChild(svgEl('circle', {
        cx: 50, cy: 50, r: radius, fill: 'none',
        stroke: 'var(--dx-line)', 'stroke-width': this.options.thickness
      }));
      let cumulative = 0;
      this.segments = data.map((item, index) => {
        const fraction = item.value / total;
        const dash = fraction * circumference;
        const segment = svgEl('circle', {
          cx: 50, cy: 50, r: radius, fill: 'none',
          stroke: this.colorVar(item, index),
          'stroke-width': this.options.thickness,
          'stroke-dasharray': dash + ' ' + (circumference - dash),
          'stroke-dashoffset': dash,
          transform: 'rotate(' + (cumulative * 360 - 90) + ' 50 50)'
        });
        segment.style.transition = 'stroke-dashoffset ' + this.options.duration + 's var(--dx-ease) ' + (index * this.options.stagger).toFixed(3) + 's';
        cumulative += fraction;
        svg.appendChild(segment);
        return segment;
      });
      figure.appendChild(svg);
      if (this.options.centerValue !== null || this.options.centerLabel) {
        const center = Utils.el('div', 'dx-ring-center');
        if (this.options.centerValue !== null) {
          center.appendChild(Utils.el('span', 'dx-ring-center-value', { text: String(this.options.centerValue) }));
        }
        if (this.options.centerLabel) {
          center.appendChild(Utils.el('span', 'dx-ring-center-label', { text: this.options.centerLabel }));
        }
        figure.appendChild(center);
      }
      this.el.appendChild(figure);
      if (this.options.legend) this.renderLegend(total);
    }

    renderLegend(total) {
      const formatter = new Intl.NumberFormat(this.options.locale, { maximumFractionDigits: 1 });
      const legend = Utils.el('ul', 'dx-ring-legend');
      this.options.data.forEach((item, index) => {
        const row = Utils.el('li', 'dx-ring-legend-item');
        const dot = Utils.el('span', 'dx-ring-legend-dot');
        dot.style.background = this.colorVar(item, index);
        row.appendChild(dot);
        row.appendChild(Utils.el('span', 'dx-ring-legend-label', { text: item.label }));
        row.appendChild(Utils.el('span', 'dx-ring-legend-value', { text: formatter.format((item.value / total) * 100) + '%' }));
        legend.appendChild(row);
      });
      this.el.appendChild(legend);
    }

    play() {
      this.played = true;
      this.segments.forEach((segment) => {
        if (Utils.reducedMotion) segment.style.transition = 'none';
        segment.style.strokeDashoffset = '0';
      });
    }
  }

  return RingChart;
});
