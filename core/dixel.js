(function (global) {
  'use strict';

  const definitions = [];
  const classes = {};
  let started = false;

  function define(name, dependencies, factory) {
    definitions.push({ name, dependencies, factory });
  }

  function resolveAll() {
    let unresolved = definitions.filter((item) => !classes[item.name]);
    let resolvedSomething = true;
    while (unresolved.length && resolvedSomething) {
      resolvedSomething = false;
      unresolved = unresolved.filter((item) => {
        if (!item.dependencies.every((dep) => classes[dep])) return true;
        classes[item.name] = item.factory(...item.dependencies.map((dep) => classes[dep]));
        resolvedSomething = true;
        return false;
      });
    }
    if (unresolved.length) {
      throw new Error('Dixel: unresolved dependencies -> ' + unresolved.map((item) => item.name).join(', '));
    }
  }

  function resolvePending() {
    if (started && definitions.some((item) => !classes[item.name])) resolveAll();
  }

  function create(name, options) {
    resolvePending();
    const Class = classes[name];
    if (!Class) throw new Error('Dixel: unknown component -> ' + name);
    return new Class(options);
  }

  function safeParse(raw) {
    try {
      return JSON.parse(raw, (key, value) => (key === '__proto__' || key === 'constructor' ? undefined : value)) || {};
    } catch (error) {
      return null;
    }
  }

  function scan(root) {
    resolvePending();
    const scope = root || document;
    const instances = [];
    scope.querySelectorAll('[data-dx]').forEach((el) => {
      if (el.__dixel) return;
      const name = el.getAttribute('data-dx');
      const raw = el.getAttribute('data-dx-options');
      const options = raw ? safeParse(raw) : {};
      if (options === null) {
        el.setAttribute('data-dx-error', 'options');
        return;
      }
      el.__dixel = true;
      const instance = create(name, options);
      el.__dixel = instance;
      instance.attach(el);
      instances.push(instance);
    });
    return instances;
  }

  function init(options) {
    const settings = options || {};
    if (started) return api;
    started = true;
    resolveAll();
    if (settings.smoothScroll !== false && classes.SmoothScroll) {
      api.scroll = new classes.SmoothScroll(settings.scroll || {});
    }
    if (settings.scan !== false) scan();
    return api;
  }

  const api = { define, create, scan, init, classes, version: '0.1.0' };
  global.Dixel = api;
})(window);
