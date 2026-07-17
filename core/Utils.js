Dixel.define('Utils', [], function () {
  'use strict';

  const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const touchQuery = matchMedia('(pointer: coarse)');

  return {
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },
    lerp(start, end, amount) {
      return start + (end - start) * amount;
    },
    damp(current, target, smoothing, delta) {
      return this.lerp(current, target, 1 - Math.exp(-smoothing * delta));
    },
    map(value, inMin, inMax, outMin, outMax) {
      const span = inMax - inMin;
      if (!span) return outMin;
      return outMin + ((value - inMin) / span) * (outMax - outMin);
    },
    withAlpha(color, alpha) {
      const text = String(color).trim();
      if (text[0] === '#') {
        const hex = text.slice(1);
        const full = hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex.slice(0, 6);
        const int = parseInt(full, 16);
        if (!isNaN(int)) {
          return 'rgba(' + ((int >> 16) & 255) + ',' + ((int >> 8) & 255) + ',' + (int & 255) + ',' + alpha + ')';
        }
      }
      const match = text.match(/rgba?\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split(',').map((part) => parseFloat(part));
        return 'rgba(' + (parts[0] || 0) + ',' + (parts[1] || 0) + ',' + (parts[2] || 0) + ',' + alpha + ')';
      }
      return text;
    },
    escape(value) {
      return String(value).replace(/[&<>"']/g, (ch) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
      ));
    },
    get reducedMotion() {
      return reducedMotionQuery.matches;
    },
    get isTouch() {
      return touchQuery.matches;
    },
    get dpr() {
      return Math.min(window.devicePixelRatio || 1, 2);
    },
    el(tag, className, attributes) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (attributes) {
        Object.keys(attributes).forEach((key) => {
          if (key === 'text') node.textContent = attributes[key];
          else if (key === 'html') node.innerHTML = attributes[key];
          else node.setAttribute(key, attributes[key]);
        });
      }
      return node;
    },
    on(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      return () => target.removeEventListener(type, handler, options);
    },
    fitCanvas(canvas, context) {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = this.dpr;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      if (context) context.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, height, dpr };
    },
    uid() {
      return 'dx' + Math.random().toString(36).slice(2, 9);
    }
  };
});
