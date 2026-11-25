/* Tarikh Liquid Glass switch. Shared across workspaces on this device. */
(() => {
  if (window.__tarikhGlassToggleInstalled) return;
  window.__tarikhGlassToggleInstalled = true;
  const KEY = 'tarikh-liquid-glass-enabled-v1';
  const sheetNames = new Set(['glass-material.css', 'native-window-glass.css']);
  const stylesheetNodes = () => [...document.querySelectorAll('link[rel="stylesheet"]')]
    .filter(el => sheetNames.has((el.getAttribute('href') || '').split('?')[0].split('/').pop()));
  let on = localStorage.getItem(KEY) !== '0';
  const apply = () => {
    document.documentElement.classList.toggle('tarikh-glass-off', !on);
    stylesheetNodes().forEach(el => { el.disabled = !on; });
    document.documentElement.classList.toggle(
      'tarikh-native-material',
      on && navigator.platform.startsWith('Mac')
    );
    const toggle = document.querySelector('#tarikh-liquid-glass-setting');
    if (toggle) {
      toggle.checked = on;
      toggle.setAttribute('aria-checked', String(on));
    }
  };
  const savedValue = () => on;
  // Apply before the Settings page is opened; localStorage gives instant re-entry.
  apply();
  // Reconcile the persisted setting in Tarikh's core database when available.
  api.call('set:get', 'tarikh_liquid_glass_enabled').then(value => {
    if (value === '0' || value === '1') {
      on = value === '1';
      localStorage.setItem(KEY, on ? '1' : '0');
      apply();
    }
  }).catch(error => console.warn('Glass preference unavailable:', error));
  // tarikh-glass-smooth-transition
  // A native Chromium View Transition captures the old and new appearances;
  // the two appearances crossfade smoothly without navigation.
  // No page navigation, no dashboard reset and no fake cursor lighting.
  let transitionBusy = false;
  const animateAppearance = async next => {
    const swap = () => { on = next; apply(); };
    if (document.startViewTransition &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      try {
        const transition = document.startViewTransition(swap);
        await transition.finished;
        return;
      } catch (error) {
        console.warn('Glass animation unavailable; applying directly:', error);
      }
    }
    swap();
  };
  const change = async checked => {
    if (transitionBusy) return;
    const prior = savedValue();
    if (checked === prior) return;
    transitionBusy = true;
    const input = document.querySelector('#tarikh-liquid-glass-setting');
    if (input) input.disabled = true;
    try {
      await animateAppearance(checked);
      // Set the real macOS window material without reloading the renderer.
      // Windows and Linux continue to use the CSS-only material.
      await api.call('glass:native:set', checked);
      await api.call('set:set', 'tarikh_liquid_glass_enabled', checked ? '1' : '0');
      localStorage.setItem(KEY, checked ? '1' : '0');
    } catch (error) {
      console.error('Unable to set glass mode:', error);
      await animateAppearance(prior);
      try { await api.call('glass:native:set', prior); } catch (_) {}
      localStorage.setItem(KEY, prior ? '1' : '0');
      window.alert('Liquid Glass setting could not be saved. ' + error.message);
    } finally {
      transitionBusy = false;
      if (input) input.disabled = false;
      apply();
    }
  };
  const section = () => {
    if (document.querySelector('#tarikh-glass-settings-panel')) return;
    const view = document.querySelector('#view');
    if (!view || !document.querySelector('#view .appearance-settings-panel')) return;
    const host = document.createElement('section');
    host.id = 'tarikh-glass-settings-panel';
    host.className = 'glass panel appearance-settings-panel';
    host.innerHTML = `<div class="tarikh-glass-toggle-line">
      <div class="tarikh-glass-toggle-copy">
        <h2>Liquid Glass</h2>

      </div>
      <label class="tarikh-glass-switch">
        <input id="tarikh-liquid-glass-setting" type="checkbox" aria-label="Enable Liquid Glass" ${on ? 'checked' : ''}>
        <span class="tarikh-glass-switch-track" aria-hidden="true"></span>
      </label>
    </div>`;
    const appearances = view.querySelector('.appearance-settings-panel');
    appearances.after(host);
    host.querySelector('input').addEventListener('change', event => change(event.currentTarget.checked));
    apply();
  };
  // V.settings is the existing Settings renderer; attach after it finishes its render.
  if (typeof V !== 'undefined' && V && typeof V.settings === 'function') {
    const originalSettings = V.settings;
    V.settings = async function(...args) {
      const result = await originalSettings.apply(this, args);
      section();
      return result;
    };
  } else {
    console.warn('Tarikh settings renderer unavailable: glass switch not attached.');
  }
  window.addEventListener('pageshow', apply);
})();
