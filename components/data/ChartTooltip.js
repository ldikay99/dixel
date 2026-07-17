Dixel.define('ChartTooltip', ['Utils'], function (Utils) {
  'use strict';

  class ChartTooltip {
    constructor() {
      this.el = null;
      this.visible = false;
    }

    ensure() {
      if (this.el) return;
      this.el = Utils.el('div', 'dx-chart-tip');
      this.titleEl = Utils.el('div', 'dx-chart-tip-title');
      this.rowsEl = Utils.el('div', 'dx-chart-tip-rows');
      this.el.appendChild(this.titleEl);
      this.el.appendChild(this.rowsEl);
      document.body.appendChild(this.el);
    }

    show(config) {
      this.ensure();
      this.titleEl.textContent = config.title || '';
      this.titleEl.style.display = config.title ? '' : 'none';
      this.rowsEl.innerHTML = '';
      (config.rows || []).forEach((row) => {
        const line = Utils.el('div', 'dx-chart-tip-row');
        if (row.color) {
          const dot = Utils.el('span', 'dx-chart-tip-dot');
          dot.style.background = row.color;
          line.appendChild(dot);
        }
        if (row.label) line.appendChild(Utils.el('span', 'dx-chart-tip-label', { text: row.label }));
        line.appendChild(Utils.el('b', 'dx-chart-tip-value', { text: row.value }));
        this.rowsEl.appendChild(line);
      });
      this.el.classList.add('is-visible');
      this.visible = true;
      this.place(config.x, config.y);
    }

    place(x, y) {
      if (!this.el) return;
      const width = this.el.offsetWidth;
      const height = this.el.offsetHeight;
      let left = x - width / 2;
      let top = y - height - 14;
      let below = false;
      if (top < 8) {
        top = y + 16;
        below = true;
      }
      left = Utils.clamp(left, 8, innerWidth - width - 8);
      top = Utils.clamp(top, 8, innerHeight - height - 8);
      this.el.style.transform = 'translate3d(' + Math.round(left) + 'px,' + Math.round(top) + 'px,0)';
      this.el.classList.toggle('is-below', below);
    }

    hide() {
      if (!this.el || !this.visible) return;
      this.visible = false;
      this.el.classList.remove('is-visible');
    }
  }

  return new ChartTooltip();
});
