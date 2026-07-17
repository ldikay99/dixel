Dixel.define('BulletChart', ['Component', 'Utils'], function (Component, Utils) {
  'use strict';

  class BulletChart extends Component {
    static defaults = {
      label: 'Rendimiento',
      value: 0,
      target: 0,
      max: 100,
      ranges: [0.6, 0.85, 1],
      color: 'cyan',
      format: 'number',
      locale: 'es-CO'
    };

    build() {
      return Utils.el('div', 'dx-bullet');
    }

    ready() {
      this.el.classList.add('dx-bullet');
      const formatter = new Intl.NumberFormat(this.options.locale, { maximumFractionDigits: 1 });
      const format = (value) => this.options.format === 'percent' ? formatter.format(value) + '%' : formatter.format(value);
      const head = Utils.el('div', 'dx-bullet-head');
      head.appendChild(Utils.el('span', 'dx-bullet-label', { text: this.options.label }));
      head.appendChild(Utils.el('b', 'dx-bullet-value', { text: format(this.options.value) }));
      this.el.appendChild(head);
      const track = Utils.el('div', 'dx-bullet-track');
      this.options.ranges.forEach((range, index) => {
        const band = Utils.el('span', 'dx-bullet-band dx-bullet-band--' + index);
        band.style.width = Utils.clamp(range, 0, 1) * 100 + '%';
        track.appendChild(band);
      });
      this.bar = Utils.el('span', 'dx-bullet-bar');
      this.bar.style.background = 'var(--dx-' + this.options.color + ')';
      this.bar.style.width = Utils.clamp(this.options.value / this.options.max, 0, 1) * 100 + '%';
      track.appendChild(this.bar);
      if (this.options.target > 0) {
        const marker = Utils.el('span', 'dx-bullet-target');
        marker.style.left = Utils.clamp(this.options.target / this.options.max, 0, 1) * 100 + '%';
        marker.title = 'Objetivo: ' + format(this.options.target);
        track.appendChild(marker);
      }
      this.el.appendChild(track);
      this.whenVisible((visible) => {
        this.el.classList.toggle('is-on', visible);
      });
      if (Utils.reducedMotion) this.el.classList.add('is-on');
    }
  }

  return BulletChart;
});
