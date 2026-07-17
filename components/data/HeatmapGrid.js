Dixel.define('HeatmapGrid', ['Component', 'Utils', 'ChartTooltip'], function (Component, Utils, ChartTooltip) {
  'use strict';

  const DAY_MS = 86400000;

  class HeatmapGrid extends Component {
    static defaults = {
      weeks: 26,
      data: null,
      color: 'primary',
      levels: 5,
      unit: 'actividades',
      dayLabels: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      locale: 'es-CO'
    };

    build() {
      return Utils.el('div', 'dx-heatmap');
    }

    ready() {
      this.el.classList.add('dx-heatmap');
      if (this.options.color && this.options.color !== 'primary') {
        this.el.style.setProperty('--dx-heat-color', 'var(--dx-' + this.options.color + ', ' + this.options.color + ')');
      }
      this.dateFormatter = new Intl.DateTimeFormat(this.options.locale, { day: 'numeric', month: 'short', year: 'numeric' });
      this.values = this.options.data || this.generateDemoData();
      this.maxValue = Math.max.apply(null, this.values.map((entry) => entry.value).concat([1]));
      this.renderGrid();
      this.bindHover();
      this.settled = false;
      this.whenVisible((visible) => {
        this.el.classList.toggle('is-on', visible);
        if (visible && !this.settled) {
          this.settled = true;
          const settle = setTimeout(() => {
            Array.from(this.grid.children).forEach((cell) => { cell.style.transitionDelay = ''; });
          }, 1400);
          this.addCleanup(() => clearTimeout(settle));
        }
      });
      this.addCleanup(() => ChartTooltip.hide());
    }

    generateDemoData() {
      const total = this.options.weeks * 7;
      const today = Date.now();
      const entries = [];
      let seed = 7;
      for (let i = 0; i < total; i++) {
        seed = (seed * 16807) % 2147483647;
        const noise = (seed / 2147483647);
        const weekly = Math.sin((i % 7) * 0.9) * 0.3 + 0.5;
        entries.push({
          date: new Date(today - (total - 1 - i) * DAY_MS),
          value: Math.max(0, Math.round(noise * weekly * 12 - 2))
        });
      }
      return entries;
    }

    levelOf(value) {
      if (value <= 0) return 0;
      return Math.min(this.options.levels - 1, 1 + Math.floor((value / this.maxValue) * (this.options.levels - 2)));
    }

    renderGrid() {
      const wrap = Utils.el('div', 'dx-heatmap-wrap dx-scroll-x dx-scroll-thin');
      const days = Utils.el('div', 'dx-heatmap-days');
      this.options.dayLabels.forEach((label, index) => {
        if (index % 2 === 0) days.appendChild(Utils.el('span', null, { text: label }));
        else days.appendChild(Utils.el('span'));
      });
      wrap.appendChild(days);
      this.grid = Utils.el('div', 'dx-heatmap-grid');
      this.grid.style.gridTemplateColumns = 'repeat(' + this.options.weeks + ', 1fr)';
      this.values.forEach((entry, index) => {
        const cell = Utils.el('span', 'dx-heatmap-cell dx-heatmap-cell--' + this.levelOf(entry.value));
        cell.dataset.index = index;
        cell.style.transitionDelay = Math.min(index * 2, 600) + 'ms';
        this.grid.appendChild(cell);
      });
      wrap.appendChild(this.grid);
      this.el.appendChild(wrap);
      const scale = Utils.el('div', 'dx-heatmap-scale');
      scale.appendChild(Utils.el('span', null, { text: 'Menos' }));
      for (let level = 0; level < this.options.levels; level++) {
        scale.appendChild(Utils.el('i', 'dx-heatmap-cell dx-heatmap-cell--' + level));
      }
      scale.appendChild(Utils.el('span', null, { text: 'Más' }));
      this.el.appendChild(scale);
    }

    bindHover() {
      this.listen(this.grid, 'pointerover', (event) => {
        const cell = event.target.closest('.dx-heatmap-cell');
        if (!cell || cell.dataset.index === undefined) return;
        const entry = this.values[+cell.dataset.index];
        const rect = cell.getBoundingClientRect();
        ChartTooltip.show({
          title: this.dateFormatter.format(entry.date),
          rows: [{ value: entry.value + ' ' + this.options.unit }],
          x: rect.left + rect.width / 2,
          y: rect.top
        });
      });
      this.listen(this.grid, 'pointerleave', () => ChartTooltip.hide());
    }
  }

  return HeatmapGrid;
});
