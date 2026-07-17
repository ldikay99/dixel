Dixel.define('BarChart', ['Component', 'Utils'], function (Component, Utils) {
  'use strict';

  class BarChart extends Component {
    static defaults = {
      data: [],
      color: 'primary',
      duration: 0.9,
      stagger: 0.09,
      showValues: true,
      format: 'number',
      currency: 'USD',
      locale: 'es-CO',
      maxValue: null
    };

    build() {
      return Utils.el('div', 'dx-bars');
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
      if (this.options.format === 'compact') {
        const base = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, notation: 'compact' });
        return (value) => base.format(value);
      }
      const base = new Intl.NumberFormat(locale);
      return (value) => base.format(value);
    }

    ready() {
      this.el.classList.add('dx-bars');
      if (!this.el.querySelector('.dx-bar')) this.render();
      this.applyTimings();
      this.whenVisible((visible) => {
        if (visible) this.el.classList.add('dx-bars--in');
      });
    }

    render() {
      const data = this.options.data;
      const max = this.options.maxValue || Math.max.apply(null, data.map((item) => item.value).concat(1));
      const formatter = this.makeFormatter();
      const plot = Utils.el('div', 'dx-bars-plot');
      const labels = Utils.el('div', 'dx-bars-labels');
      const columns = 'repeat(' + data.length + ', minmax(0, 1fr))';
      plot.style.gridTemplateColumns = columns;
      labels.style.gridTemplateColumns = columns;
      data.forEach((item) => {
        const col = Utils.el('div', 'dx-bar-col');
        if (this.options.showValues) {
          col.appendChild(Utils.el('span', 'dx-bar-value', { text: formatter(item.value) }));
        }
        const bar = Utils.el('div', 'dx-bar dx-bar--' + (item.color || this.options.color));
        bar.style.height = ((item.value / max) * 100).toFixed(2) + '%';
        col.appendChild(bar);
        plot.appendChild(col);
        labels.appendChild(Utils.el('span', 'dx-bar-label', { text: item.label || '' }));
      });
      this.el.appendChild(plot);
      this.el.appendChild(labels);
    }

    applyTimings() {
      const duration = this.options.duration;
      const stagger = this.options.stagger;
      this.el.querySelectorAll('.dx-bar').forEach((bar, index) => {
        bar.style.transitionDuration = duration + 's';
        bar.style.transitionDelay = (index * stagger).toFixed(3) + 's';
      });
      this.el.querySelectorAll('.dx-bar-value').forEach((value, index) => {
        value.style.transitionDelay = (index * stagger + duration * 0.55).toFixed(3) + 's';
      });
    }
  }

  return BarChart;
});
