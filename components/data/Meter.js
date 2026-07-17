Dixel.define('Meter', ['Component', 'Utils', 'Ticker', 'Motion'], function (Component, Utils, Ticker, Motion) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attributes) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attributes).forEach((key) => node.setAttribute(key, attributes[key]));
    return node;
  }

  class Meter extends Component {
    static defaults = {
      value: 0,
      min: 0,
      max: 100,
      label: null,
      suffix: '',
      decimals: 0,
      locale: 'es-CO',
      color: 'primary',
      colorEnd: 'cyan',
      gradient: true,
      thickness: 9,
      duration: 1.4
    };

    build() {
      return Utils.el('div', 'dx-meter');
    }

    ready() {
      this.el.classList.add('dx-meter');
      this.formatter = new Intl.NumberFormat(this.options.locale, {
        minimumFractionDigits: this.options.decimals,
        maximumFractionDigits: this.options.decimals
      });
      this.render();
      this.played = false;
      this.stopFrames = null;
      this.addCleanup(() => this.halt());
      this.whenVisible((visible) => {
        if (visible && !this.played) this.play();
      });
    }

    fraction() {
      return Utils.clamp((this.options.value - this.options.min) / (this.options.max - this.options.min || 1), 0, 1);
    }

    render() {
      const arc = 'M 9 51 A 41 41 0 0 1 91 51';
      const svg = svgEl('svg', { viewBox: '0 0 100 58', class: 'dx-meter-svg', role: 'img' });
      let stroke = 'var(--dx-' + this.options.color + ')';
      if (this.options.gradient) {
        const gradientId = Utils.uid();
        const defs = svgEl('defs', {});
        const gradient = svgEl('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '1', y2: '0' });
        const startStop = svgEl('stop', { offset: '0%' });
        startStop.style.stopColor = 'var(--dx-' + this.options.color + ')';
        const endStop = svgEl('stop', { offset: '100%' });
        endStop.style.stopColor = 'var(--dx-' + this.options.colorEnd + ')';
        gradient.appendChild(startStop);
        gradient.appendChild(endStop);
        defs.appendChild(gradient);
        svg.appendChild(defs);
        stroke = 'url(#' + gradientId + ')';
      }
      svg.appendChild(svgEl('path', {
        d: arc, fill: 'none', stroke: 'var(--dx-line)',
        'stroke-width': this.options.thickness, 'stroke-linecap': 'round'
      }));
      this.valuePath = svgEl('path', {
        d: arc, fill: 'none', stroke: stroke,
        'stroke-width': this.options.thickness, 'stroke-linecap': 'round'
      });
      svg.appendChild(this.valuePath);
      this.el.appendChild(svg);
      this.arcLength = this.valuePath.getTotalLength();
      this.valuePath.setAttribute('stroke-dasharray', this.arcLength);
      this.valuePath.setAttribute('stroke-dashoffset', this.arcLength);
      this.valuePath.style.transition = 'stroke-dashoffset ' + this.options.duration + 's var(--dx-ease)';
      const readout = Utils.el('div', 'dx-meter-readout');
      this.numberEl = Utils.el('span', 'dx-meter-value', { text: this.formatter.format(this.options.min) + this.options.suffix });
      readout.appendChild(this.numberEl);
      if (this.options.label) readout.appendChild(Utils.el('span', 'dx-meter-label', { text: this.options.label }));
      this.el.appendChild(readout);
      const bounds = Utils.el('div', 'dx-meter-bounds');
      bounds.appendChild(Utils.el('span', null, { text: this.formatter.format(this.options.min) }));
      bounds.appendChild(Utils.el('span', null, { text: this.formatter.format(this.options.max) }));
      this.el.appendChild(bounds);
    }

    play() {
      this.played = true;
      const target = this.arcLength * (1 - this.fraction());
      if (Utils.reducedMotion) {
        this.valuePath.style.transition = 'none';
        this.valuePath.style.strokeDashoffset = target;
        this.numberEl.textContent = this.formatter.format(this.options.value) + this.options.suffix;
        return;
      }
      this.valuePath.style.strokeDashoffset = target;
      const duration = Math.max(this.options.duration, 0.001);
      const from = this.options.min;
      const to = this.options.value;
      let elapsed = 0;
      this.halt();
      this.stopFrames = Ticker.add((time, delta) => {
        elapsed += delta;
        const progress = Motion.eases.inOut(Utils.clamp(elapsed / duration, 0, 1));
        this.numberEl.textContent = this.formatter.format(from + (to - from) * progress) + this.options.suffix;
        if (elapsed >= duration) this.halt();
      });
    }

    halt() {
      if (!this.stopFrames) return;
      this.stopFrames();
      this.stopFrames = null;
    }
  }

  return Meter;
});
