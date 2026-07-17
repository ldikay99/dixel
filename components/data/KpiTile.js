Dixel.define('KpiTile', ['Component', 'Utils', 'StatCounter', 'Sparkline'], function (Component, Utils, StatCounter, Sparkline) {
  'use strict';

  class KpiTile extends Component {
    static defaults = {
      label: 'KPI',
      value: 0,
      prefix: '',
      suffix: '',
      decimals: 0,
      locale: 'es-CO',
      delta: null,
      deltaSuffix: '%',
      data: null,
      color: 'primary',
      duration: 1.6
    };

    build() {
      return Utils.el('div', 'dx-kpi');
    }

    ready() {
      this.el.classList.add('dx-kpi');
      const head = Utils.el('div', 'dx-kpi-head');
      head.appendChild(Utils.el('span', 'dx-kpi-label', { text: this.options.label }));
      if (this.options.delta !== null) head.appendChild(this.buildDelta());
      this.el.appendChild(head);
      const valueHost = Utils.el('div', 'dx-kpi-value');
      this.el.appendChild(valueHost);
      this.counter = new StatCounter({
        value: this.options.value,
        prefix: this.options.prefix,
        suffix: this.options.suffix,
        decimals: this.options.decimals,
        locale: this.options.locale,
        duration: this.options.duration
      }).mount(valueHost);
      this.addCleanup(() => this.counter.destroy());
      if (this.options.data && this.options.data.length > 1) {
        const sparkHost = Utils.el('div', 'dx-kpi-spark');
        this.el.appendChild(sparkHost);
        this.spark = new Sparkline({ data: this.options.data, color: this.options.color }).mount(sparkHost);
        this.addCleanup(() => this.spark.destroy());
      }
      this.whenVisible((visible) => {
        if (visible) this.el.classList.add('dx-kpi--in');
      });
    }

    buildDelta() {
      const delta = this.options.delta;
      const positive = delta >= 0;
      const badge = Utils.el('span', 'dx-kpi-delta ' + (positive ? 'dx-kpi-delta--up' : 'dx-kpi-delta--down'));
      badge.innerHTML =
        '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.5 9 8.5H1Z"/></svg>' +
        '<span>' + Math.abs(delta) + Utils.escape(this.options.deltaSuffix) + '</span>';
      return badge;
    }
  }

  return KpiTile;
});
