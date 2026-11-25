/* Tarikh Liquid Glass: one delegated pointer-reflection handler for all cards. */
(() => {
  'use strict';
  if (window.__tarikhGlassMaterialReady) return;
  window.__tarikhGlassMaterialReady = true;
  const targets = [
    '.glass.side', '#view .page-header-card', '#view .welcome-card', '#view .card', '#view .panel',
    '#view .meeting-card', '#view .library-case-card',
    '#view .library-reference-bar', '#view .task-row',
    '#view .library-unassigned-section', '#view .meetings-empty',
    '#view .calendar-day:not(.calendar-day-empty)',
    '#view .line:not(.case-tinted-row)', '#view .note-card',
    '#view .calendar-detail-item', '#view .calendar-agenda',
    '#view .calendar-provider-card', '#view .appearance-card',
    '#view .doc-tab-panel.active'
  ].join(', ');
  let frame = 0;
  let target = null;
  let x = 0;
  let y = 0;
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !(event.target instanceof Element)) return;
    const candidate = event.target.closest(targets);
    if (!candidate) return;
    target = candidate;
    x = event.clientX;
    y = event.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const node = target;
      if (!node || !node.isConnected) return;
      const bounds = node.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const xp = Math.max(0, Math.min(100, (x - bounds.left) / bounds.width * 100));
      const yp = Math.max(0, Math.min(100, (y - bounds.top) / bounds.height * 100));
      node.style.setProperty('--lg-x', `${xp.toFixed(2)}%`);
      node.style.setProperty('--lg-y', `${yp.toFixed(2)}%`);
    });
  }, { passive: true });
})();
