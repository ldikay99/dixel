Dixel.define('DataTable', ['Component', 'Utils'], function (Component, Utils) {
  'use strict';

  class DataTable extends Component {
    static defaults = {
      columns: [],
      rows: [],
      sortable: true,
      sortKey: null,
      sortDir: 'asc',
      columnLines: false,
      height: null,
      emptyText: 'Sin datos',
      onSort: null,
      stagger: 0.045,
      maxStagger: 0.5
    };

    build() {
      return Utils.el('div', 'dx-table-wrap');
    }

    ready() {
      this.el.classList.add('dx-table-wrap');
      if (this.options.columnLines) this.el.classList.add('dx-table-wrap--collines');
      if (this.options.height) this.el.style.maxHeight = this.options.height;
      this.sortKey = this.options.sortKey;
      this.sortDir = this.options.sortDir;
      if (this.options.columns.length && !this.el.querySelector('table')) this.render();
      if (this.sortKey) this.applySort();
      this.whenVisible((visible) => {
        if (!visible || this.el.classList.contains('dx-table-wrap--in')) return;
        this.el.classList.add('dx-table-wrap--in');
        const settle = setTimeout(() => {
          if (this.rowItems) this.rowItems.forEach((item) => { item.tr.style.transitionDelay = ''; });
        }, (this.options.maxStagger + 0.7) * 1000);
        this.addCleanup(() => clearTimeout(settle));
      });
    }

    render() {
      const table = Utils.el('table', 'dx-table');
      const thead = Utils.el('thead', 'dx-table-head');
      const headRow = Utils.el('tr');
      this.headCells = {};
      this.options.columns.forEach((column) => {
        const th = Utils.el('th', 'dx-table-th' + (column.align === 'right' ? ' dx-table-cell--right' : ''), { scope: 'col' });
        const trigger = Utils.el('button', 'dx-table-sort', { type: 'button' });
        trigger.appendChild(Utils.el('span', null, { text: column.label }));
        const sortable = this.options.sortable && column.sortable !== false;
        if (sortable) {
          const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          arrow.setAttribute('viewBox', '0 0 10 12');
          arrow.setAttribute('class', 'dx-table-arrow');
          arrow.setAttribute('aria-hidden', 'true');
          arrow.innerHTML = '<path d="M5 1v10M1.5 7.5 5 11l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
          trigger.appendChild(arrow);
          this.listen(trigger, 'click', () => this.sortBy(column.key));
        } else {
          trigger.disabled = true;
        }
        th.appendChild(trigger);
        this.headCells[column.key] = th;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      this.tbody = Utils.el('tbody');
      this.rowItems = this.options.rows.map((row, index) => {
        const tr = Utils.el('tr', 'dx-table-row');
        tr.style.transitionDelay = Math.min(index * this.options.stagger, this.options.maxStagger).toFixed(3) + 's';
        this.options.columns.forEach((column) => {
          const td = Utils.el('td', 'dx-table-td' + (column.align === 'right' ? ' dx-table-cell--right' : ''));
          if (column.render) {
            Component.applyContent(column.render(row, td, this), td, this);
          } else {
            td.textContent = row[column.key] === undefined ? '' : String(row[column.key]);
          }
          tr.appendChild(td);
        });
        this.tbody.appendChild(tr);
        return { row, tr };
      });
      if (!this.rowItems.length) {
        const tr = Utils.el('tr', 'dx-table-row dx-table-row--empty');
        const td = Utils.el('td', 'dx-table-td dx-table-td--empty', { text: this.options.emptyText });
        td.colSpan = Math.max(this.options.columns.length, 1);
        tr.appendChild(td);
        this.tbody.appendChild(tr);
      }
      table.appendChild(this.tbody);
      this.el.appendChild(table);
    }

    sortBy(key) {
      this.sortDir = this.sortKey === key && this.sortDir === 'asc' ? 'desc' : 'asc';
      this.sortKey = key;
      this.applySort();
      if (this.options.onSort) this.options.onSort(this.sortKey, this.sortDir, this);
    }

    applySort() {
      if (!this.rowItems) return;
      const key = this.sortKey;
      const direction = this.sortDir === 'asc' ? 1 : -1;
      const sorted = this.rowItems.slice().sort((a, b) => direction * this.compare(a.row[key], b.row[key]));
      const fragment = document.createDocumentFragment();
      sorted.forEach((item) => fragment.appendChild(item.tr));
      this.tbody.appendChild(fragment);
      Object.keys(this.headCells).forEach((columnKey) => {
        const th = this.headCells[columnKey];
        th.classList.toggle('dx-table-th--asc', columnKey === key && this.sortDir === 'asc');
        th.classList.toggle('dx-table-th--desc', columnKey === key && this.sortDir === 'desc');
      });
    }

    compare(a, b) {
      const numA = typeof a === 'number' ? a : parseFloat(a);
      const numB = typeof b === 'number' ? b : parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
    }
  }

  return DataTable;
});
