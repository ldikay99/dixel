Dixel.define('StatCounter', ['Component', 'Utils', 'Ticker', 'Motion'], function (Component, Utils, Ticker, Motion) {
  'use strict';

  class StatCounter extends Component {
    static defaults = {
      value: 0,
      from: 0,
      duration: 1.6,
      decimals: 0,
      locale: 'es-CO',
      prefix: '',
      suffix: '',
      label: null,
      ease: 'outExpo'
    };

    build() {
      const el = Utils.el('div', 'dx-stat');
      return el;
    }

    ready() {
      this.el.classList.add('dx-stat');
      this.formatter = new Intl.NumberFormat(this.options.locale, {
        minimumFractionDigits: this.options.decimals,
        maximumFractionDigits: this.options.decimals
      });
      if (!this.el.querySelector('.dx-stat-number')) this.el.innerHTML = this.markup();
      this.numberEl = this.el.querySelector('.dx-stat-number');
      this.played = false;
      this.stopFrames = null;
      this.addCleanup(() => this.halt());
      this.whenVisible((visible) => {
        if (visible && !this.played) this.play();
      });
    }

    markup() {
      const label = this.options.label ? '<span class="dx-stat-label">' + Utils.escape(this.options.label) + '</span>' : '';
      const prefix = this.options.prefix ? '<span class="dx-stat-affix">' + Utils.escape(this.options.prefix) + '</span>' : '';
      const suffix = this.options.suffix ? '<span class="dx-stat-affix">' + Utils.escape(this.options.suffix) + '</span>' : '';
      return label + '<span class="dx-stat-value">' + prefix + '<span class="dx-stat-number">' + this.format(this.options.from) + '</span>' + suffix + '</span>';
    }

    format(value) {
      return this.formatter.format(value);
    }

    play() {
      this.played = true;
      if (Utils.reducedMotion) {
        this.numberEl.textContent = this.format(this.options.value);
        return;
      }
      const ease = Motion.eases[this.options.ease] || Motion.eases.outExpo;
      const from = this.options.from;
      const to = this.options.value;
      const duration = Math.max(this.options.duration, 0.001);
      let elapsed = 0;
      this.halt();
      this.stopFrames = Ticker.add((time, delta) => {
        elapsed += delta;
        const progress = Utils.clamp(elapsed / duration, 0, 1);
        this.numberEl.textContent = this.format(from + (to - from) * ease(progress));
        if (progress >= 1) this.halt();
      });
    }

    halt() {
      if (!this.stopFrames) return;
      this.stopFrames();
      this.stopFrames = null;
    }
  }

  return StatCounter;
});
