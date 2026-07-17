Dixel.define('AreaChart', ['LineChart', 'Utils'], function (LineChart, Utils) {
  'use strict';

  class AreaChart extends LineChart {
    static defaults = Object.assign({}, LineChart.defaults, {
      stacked: true,
      fill: true,
      glow: false,
      lineWidth: 1.6
    });

    ready() {
      this.sourceSeries = this.options.series.map((serie) => Object.assign({}, serie, { data: serie.data.slice() }));
      this.sourceHidden = this.sourceSeries.map(() => false);
      if (this.options.stacked) this.applyStacking();
      super.ready();
      this.el.classList.add('dx-areachart');
    }

    applyStacking() {
      const totals = [];
      this.options.series = this.sourceSeries.map((serie, seriesIndex) => {
        const off = this.sourceHidden[seriesIndex];
        const stackedData = serie.data.map((value, index) => {
          if (!off) totals[index] = (totals[index] || 0) + value;
          return totals[index] || 0;
        });
        return Object.assign({}, serie, { data: stackedData });
      }).reverse();
      this.stackReversed = true;
    }

    renderLegend() {
      if (!this.options.stacked) {
        super.renderLegend();
        return;
      }
      this.legendEl = Utils.el('div', 'dx-chart-legend');
      const count = this.sourceSeries.length;
      this.sourceSeries.forEach((serie, sourceIndex) => {
        const item = Utils.el('button', 'dx-chart-legend-item', { type: 'button' });
        const dot = Utils.el('span', 'dx-chart-legend-dot');
        dot.style.background = this.palette[count - 1 - sourceIndex];
        item.appendChild(dot);
        item.appendChild(Utils.el('span', null, { text: serie.label || 'Serie ' + (sourceIndex + 1) }));
        this.listen(item, 'click', () => {
          this.sourceHidden[sourceIndex] = !this.sourceHidden[sourceIndex];
          item.classList.toggle('is-off', this.sourceHidden[sourceIndex]);
          this.applyStacking();
          this.hidden = this.options.series.map((stacked, stackedIndex) => this.sourceHidden[count - 1 - stackedIndex]);
          this.computeScale();
          this.paint();
        });
        this.legendEl.appendChild(item);
      });
      this.el.appendChild(this.legendEl);
    }

    showTip() {
      if (!this.options.stacked) {
        super.showTip();
        return;
      }
      const index = this.hoverIndex;
      if (index < 0 || !this.canvasOrigin) return;
      const rows = [];
      let total = 0;
      this.sourceSeries.forEach((serie, seriesIndex) => {
        if (this.sourceHidden[seriesIndex]) return;
        rows.push({
          color: this.palette[this.palette.length - 1 - seriesIndex],
          label: serie.label || 'Serie ' + (seriesIndex + 1),
          value: this.formatter(serie.data[index])
        });
        total += serie.data[index] || 0;
      });
      rows.push({ label: 'Total', value: this.formatter(total) });
      const x = this.canvasOrigin.left + this.layout.padLeft + (index / Math.max(this.layout.pointCount - 1, 1)) * this.layout.plotWidth;
      Dixel.classes.ChartTooltip.show({
        title: this.options.labels[index] || '',
        rows,
        x,
        y: this.canvasOrigin.top + this.layout.padTop
      });
    }
  }

  return AreaChart;
});
