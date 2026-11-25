'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const loc = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const today = () => loc(new Date()).slice(0, 10);

// All user-facing dates: DD-MM-YYYY.
// Database dates remain ISO: YYYY-MM-DD.

function formatDate(value) {
  if (!value) return '';

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!m) return String(value);

  return `${m[3]}-${m[2]}-${m[1]}`;
}

function formatDateTime(value) {
  if (!value) return '';

  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(value));

  if (!m) return String(value);

  return `${m[3]}-${m[2]}-${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
}
function parseDateInput(value, withTime = false) {
  const raw = String(value || '').trim();

  const m = /^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?$/.exec(raw);

  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = Number(m[4] || 0);
  const minute = Number(m[5] || 0);

  if (year < 1900 || month < 1 || month > 12 ||
      day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  const check = new Date(Date.UTC(year, month - 1, day));

  if (check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day) {
    return null;
  }

  const iso = `${String(year).padStart(4, '0')}-${m[2]}-${m[1]}`;

  return withTime
    ? `${iso}T${m[4] || '00'}:${m[5] || '00'}`
    : iso;
}


const call = async (c, ...a) => { const r = await api.call(c, ...a); if (!r.ok) { alert(r.e); const error = new Error(r.e); error.__lccReported = true; throw error; } return r.d; };
const S = {
  view: 'dashboard',
  caseId: null,
  tab: 'overview',
  filter: 'all',
  ws: null,
  docItems: [],
  docVisibleItems: [],
  docTabs: [],
  docActiveId: null,
  docCollapsed: false,
  docSearch: '',
  docContextKey: null,
  libraryCaseId: null,
  libraryScope: null,
  appearance: {},
  profileName: '',
  calendarMonth: null,
  calendarSelectedDate: null,
  calendarData: null
};
const NAV = [
  ['dashboard', 'Dashboard', '◧'],
  ['cases', 'Cases', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>'],
  ['calendar', 'Calendar', '▦'],
  ['hearings', 'Hearings', '▣'],
  ['meetings', 'Meetings', '◷'],
  ['library', 'Library', '▤'],
  ['notes', 'Notes', '✎'],
  ['tasks', 'Tasks', '☑'],
  ['settings', 'Settings', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="var(--panel)"/><circle cx="16" cy="12" r="2" fill="var(--panel)"/><circle cx="10" cy="18" r="2" fill="var(--panel)"/></svg>']
];

// ---------- shell ----------
function drawNav() {
  $('#nav').innerHTML = `<div class="brand">
  <span class="brand-name">Tarikh</span>
  <span class="brand-subtitle">तारीख़</span>
</div>` +
    NAV.map(([k, l, i]) => `<div class="item ${S.view === k || (k === 'cases' && S.view === 'case') ? 'on' : ''}" tabindex="0" data-a="go" data-i="${k}"><i>${i}</i><span>${l}</span></div>`).join('') +
    `<div class="item" tabindex="0" data-a="mini"><i>↔</i><span>Collapse</span></div>` +
    `<div class="wsname">${S.ws ? esc(S.ws.name) : 'No active workspace'}</div>`;
}


function applyAppearanceBackground() {
  const dark = document.body.classList.contains('dark');
  const key = dark ? 'background_dark' : 'background_light';
  const url = (S.appearance || {})[key] || '';

  // The background belongs to body::before, not the scrollable main pane.
  // Keep the built-in light/dark courtroom backgrounds when no custom image
  // is selected. Existing uploaded wallpaper values remain unchanged.
  if (!url) {
    document.body.style.removeProperty('--tarikh-wallpaper');
    return;
  }
  document.body.style.setProperty('--tarikh-wallpaper',
    `url(${JSON.stringify(url)})`);
}

async function loadTarikhAppearance() {
  try {
    const [appearance, name] = await Promise.all([
      call('appearance:get'),
      call('set:get', 'name')
    ]);

    S.appearance = appearance || {};
    S.profileName = name || '';
  } catch (error) {
    console.error('Unable to load appearance settings:', error);
    S.appearance = S.appearance || {};
  }

  applyAppearanceBackground();
}

// LCC PAGE CHROME V2

function updateWelcomeClock() {
  const clock = document.querySelector('[data-welcome-clock]');
  if (!clock) return;

  const now = new Date();

  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  clock.textContent = `${date} · ${time}`;
}

if (!window.__lccWelcomeClock) {
  window.__lccWelcomeClock = window.setInterval(updateWelcomeClock, 1000);
}

function decoratePageHeader(view, root = document.querySelector('#view')) {
  if (!root) return;

  const selectors = {
    internships: ['h1', '.sub', '.page-heading'],
    cases: ['.row.sb'],
    case: ['.row.sb', 'h1', '.tabs'],
    hearings: ['.row.sb'],
    meetings: ['.page-heading'],
    tasks: ['.page-heading', '.task-filters'],
    library: ['.page-heading'],
    notes: ['.page-heading'],
    calendar: ['.calendar-topbar'],
    settings: ['h1']
  };

  const selected = selectors[view];
  if (!selected) return;

  const nodes = selected
    .map(selector => root.querySelector(selector))
    .filter((node, index, all) => node && all.indexOf(node) === index);

  if (!nodes.length) return;

  const card = document.createElement('section');
  card.className = 'page-header-card';

  nodes.forEach(node => card.appendChild(node));

  root.insertBefore(card, root.firstChild);
}


async function go(v, p = {}) {
  document.body.classList.remove('ipad-doc-full');
  Object.assign(S, { view: v }, p);

  S.ws = await call('ws:active');
  drawNav();

  const el = $('#view');
  el.className = 'fade';
  el.innerHTML = '';

  if (!S.ws && !['internships', 'settings'].includes(v)) {
    S.view = 'internships';
    drawNav();

    await V.internships(el, true);
    decoratePageHeader('internships', el);
    return;
  }

  const renderer = V[S.view];

  if (typeof renderer !== 'function') {
    throw new Error(`The "${S.view}" page is not registered.`);
  }

  await renderer(el);
  if (S.view === 'settings') window.tarikhMaintenance?.(el);

// tarikhDashboardAvatarSync
  // Use the saved picture when present; otherwise show the user's initial.
  if (S.view === 'dashboard') {
    const welcomeAvatar = el.querySelector('.welcome-avatar');

    if (welcomeAvatar) {
      const customImage = (S.appearance || {}).profile_picture || '';
      const profileName = String(S.profileName || '').trim();
      const initial = profileName.slice(0, 1).toUpperCase() || 'T';

      const makeInitialAvatar = () => {
        const fallback = document.createElement('div');
        fallback.className = 'welcome-avatar welcome-avatar-initial';
        fallback.textContent = initial;
        fallback.setAttribute('role', 'img');
        fallback.setAttribute('aria-label', `Profile initial ${initial}`);
        return fallback;
      };

      if (customImage) {
        const image = document.createElement('img');
        image.className = 'welcome-avatar';
        image.src = customImage;
        image.alt = 'Profile photo';
        image.onerror = () => image.replaceWith(makeInitialAvatar());
        welcomeAvatar.replaceWith(image);
      } else {
        welcomeAvatar.replaceWith(makeInitialAvatar());
      }
    }
  }


  if (
    S.view === 'library' ||
    (S.view === 'case' && S.tab === 'documents')
  ) {
    renderDocumentViewer();
  }

  if (S.view === 'dashboard') {
    updateWelcomeClock();
  } else {
    decoratePageHeader(S.view, el);
  }
}

// Unsaved editor drafts are kept per workspace and record, not in SQLite.
const TARIKH_DRAFT_PREFIX = 'tarikh:editor-draft:v1:';
function editorDraftKey(kind, identity) {
  const workspace = S.ws?.id ?? 'global';
  return TARIKH_DRAFT_PREFIX + JSON.stringify([workspace, kind, identity]);
}
function loadEditorDraft(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    return data && typeof data === 'object' ? data : null;
  } catch (_) { return null; }
}
function saveEditorDraft(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (error) { console.warn('Unable to retain editor draft:', error); }
}
function forgetEditorDraft(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}
function restoreEditorFields(container, values) {
  if (!values) return;
  container.querySelectorAll('input[name], textarea[name], select[name]').forEach(field => {
    if (!Object.prototype.hasOwnProperty.call(values, field.name)) return;
    if (field.type === 'checkbox' || field.type === 'radio') {
      field.checked = !!values[field.name];
    } else {
      field.value = String(values[field.name] ?? '');
    }
  });
}
function collectEditorFields(container) {
  const values = {};
  container.querySelectorAll('input[name], textarea[name], select[name]').forEach(field => {
    values[field.name] = (field.type === 'checkbox' || field.type === 'radio')
      ? field.checked : field.value;
  });
  return values;
}

function form(title, fields, v, onSave, options = {}) {
  const m = document.createElement('div');
  m.className = 'modal';
  const draftKey = editorDraftKey('form', [
    title, v?.id ?? '', S.caseId ?? '', fields.map(f => f[0])
  ]);

  const inp = f => {
    const [k, l, t, o] = f;
    const value = v[k] ?? '';

    if (t === 'area') {
      return `<label>${esc(l)}
        <textarea name="${k}">${esc(value)}</textarea>
      </label>`;
    }

    if (t === 'sel') {
      const choices = (o || []).map(x => {
        const [a, b] = Array.isArray(x) ? x : [x, x];
        return `<option value="${esc(a)}"
          ${String(a) === String(value) ? 'selected' : ''}>
          ${esc(b)}
        </option>`;
      }).join('');

      return `<label>${esc(l)}
        <select name="${k}">${choices}</select>
      </label>`;
    }

    if (t === 'check') {
      const checked =
        value === true || value === 1 ||
        value === '1' || value === 'true';

      return `<label class="form-check">
        <input type="checkbox" name="${k}" ${checked ? 'checked' : ''}>
        <span>${esc(l)}</span>
      </label>`;
    }

    // Keep native browser calendar and date-time controls.
    if (t === 'date' || t === 'datetime-local') {
      let inputValue = String(value || '');

      if (t === 'date') {
        inputValue = inputValue.slice(0, 10);
      } else {
        inputValue = inputValue.replace(' ', 'T').slice(0, 16);
      }

      return `<label>${esc(l)}
        <input name="${k}" type="${t}" value="${esc(inputValue)}">
      </label>`;
    }

    return `<label>${esc(l)}
      <input name="${k}" type="${esc(t || 'text')}" value="${esc(value)}">
    </label>`;
  };

  const renderedFields = fields.map(f => {
    let html = inp(f);

    if (f[4] === 'task-extra') {
      html = `<div data-task-extra hidden>${html}</div>`;
    } else if (f[4] === 'kind-extra') {
      html = `<div data-kind-extra>${html}</div>`;
    }

    return f[2] === 'area'
      ? `</div>${html}<div class="two">`
      : html;
  }).join('');

  m.innerHTML = `
    <form class="glass box">
      <h2>${esc(title)}</h2>
      <div class="two">${renderedFields}</div>

      <div class="form-actions">
        <div>
          ${options.onDelete
            ? `<button type="button" class="btn danger" data-delete>
                 ${esc(options.deleteLabel || 'Delete')}
               </button>`
            : ''}
        </div>

        <div class="form-actions-right">
          <button type="button" class="btn" data-clear-all>Clear all</button>
          <button type="button" class="btn" data-x>Cancel</button>
          <button class="btn pri" type="submit">Save</button>
        </div>
      </div>
    </form>
  `;

  const editorForm = m.querySelector('form');
  restoreEditorFields(editorForm, loadEditorDraft(draftKey));
  const retainDraft = () => saveEditorDraft(draftKey, collectEditorFields(editorForm));
  editorForm.addEventListener('input', retainDraft);
  editorForm.addEventListener('change', retainDraft);

  m.querySelector('[data-clear-all]').addEventListener('click', () => {
    if (submissionInProgress) return;
    if (!window.confirm('Clear every field in this form?')) return;
    editorForm.querySelectorAll('input[name], textarea[name], select[name]').forEach(field => {
      if (field.type === 'checkbox' || field.type === 'radio') field.checked = false;
      else if (field.tagName === 'SELECT') field.selectedIndex = 0;
      else field.value = '';
    });
    retainDraft();
    editorForm.querySelector('[name]')?.dispatchEvent(new Event('change', { bubbles: true }));
  });

  m.addEventListener('click', e => {
    if (e.target === m || e.target.closest('[data-x]')) {
      if (submissionInProgress) return;
      retainDraft();
      m.remove();
    }
  });
  m.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (submissionInProgress) return;
      retainDraft();
      m.remove();
    }
  });

  // Show task fields only when the hearing checkbox is selected.
  const toggle = m.querySelector('[name="make_task"]');

  const syncTaskFields = () => {
    m.querySelectorAll('[data-task-extra]').forEach(field => {
      field.hidden = !toggle?.checked;
    });
  };

  toggle?.addEventListener('change', syncTaskFields);
  syncTaskFields();

  // LCC CUSTOM EVENT TYPES V1
  const kindSelect = m.querySelector('[name="kind"]');

  const syncKindFields = () => {
    m.querySelectorAll('[data-kind-extra]').forEach(field => {
      field.hidden = kindSelect?.value !== 'Other';
    });
  };

  kindSelect?.addEventListener('change', syncKindFields);
  syncKindFields();

  let submissionInProgress = false;
  m.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    if (submissionInProgress) return;

    const formElement = e.currentTarget;
    submissionInProgress = true;
    const saveButton = formElement.querySelector('button[type="submit"]');
    if (saveButton) saveButton.disabled = true;
    const o = Object.fromEntries(new FormData(formElement).entries());

    // FormData does not include unchecked checkboxes.
    for (const f of fields) {
      if (f[2] === 'check') {
        const checkbox = formElement.elements.namedItem(f[0]);
        o[f[0]] = checkbox?.checked ? '1' : '0';
      }
    }

    // Native date controls already return ISO-compatible values:
    // date: YYYY-MM-DD
    // datetime-local: YYYY-MM-DDTHH:mm
    try {
      await onSave(o);
      // A completed save is the only operation that discards the draft.
      forgetEditorDraft(draftKey);
      m.remove();
      await go(S.view);
    } catch (error) {
      console.error('Form save failed:', error);
    } finally {
      submissionInProgress = false;
      if (saveButton) saveButton.disabled = false;
    }
  });

  if (options.onDelete) {
    m.querySelector('[data-delete]').addEventListener('click', async () => {
      const confirmed = await confirmDestructiveAction({
        title: options.deleteLabel || 'Delete record?',
        message: options.deleteMessage ||
          'Permanently delete this record? This cannot be undone.',
        confirmLabel: options.deleteLabel || 'Delete permanently'
      });

      if (!confirmed) return;

      try {
        await options.onDelete();
        forgetEditorDraft(draftKey);
        m.remove();
        await go(S.view);
      } catch (error) {
        console.error('Record deletion failed:', error);
      }
    });
  }

  document.body.appendChild(m);
  (m.querySelector('input:not([type="checkbox"]), textarea, select') || {}).focus?.();
}

// Reusable destructive-action confirmation modal.
function confirmDestructiveAction({
  title,
  message,
  details = [],
  confirmLabel = 'Delete permanently',
  requireText = ''
}) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <section class="glass box confirm-box"
        role="dialog" aria-modal="true"
        aria-labelledby="confirm-title">

        <div class="confirm-heading">
          <h2 id="confirm-title">${esc(title)}</h2>
          <span class="tag warn">Permanent</span>
        </div>

        <p class="confirm-message">${esc(message)}</p>

        ${details.length ? `
          <ul class="confirm-details">
            ${details.map(x => `<li>${esc(x)}</li>`).join('')}
          </ul>
        ` : ''}

        ${requireText ? `
          <label class="confirm-type-label">
            Type <strong>${esc(requireText)}</strong>
            exactly to enable deletion.

            <input class="confirm-type-input"
              type="text"
              autocomplete="off"
              spellcheck="false">
          </label>
        ` : ''}

        <div class="form-actions confirm-actions">
          <button type="button" class="btn"
            data-confirm-cancel>Cancel</button>

          <button type="button" class="btn danger"
            data-confirm-yes ${requireText ? 'disabled' : ''}>
            ${esc(confirmLabel)}
          </button>
        </div>
      </section>
    `;

    const input = modal.querySelector('.confirm-type-input');
    const yes = modal.querySelector('[data-confirm-yes]');

    let finished = false;

    function finish(value) {
      if (finished) return;
      finished = true;
      document.removeEventListener('keydown', onKeydown);
      modal.remove();
      resolve(value);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') finish(false);

      if (
        event.key === 'Enter' &&
        input &&
        document.activeElement === input &&
        !yes.disabled
      ) finish(true);
    }

    modal.addEventListener('click', event => {
      if (event.target === modal) finish(false);
    });

    modal.querySelector('[data-confirm-cancel]')
      .addEventListener('click', () => finish(false));

    yes.addEventListener('click', () => finish(true));

    if (input) {
      input.addEventListener('input', () => {
        yes.disabled = input.value !== requireText;
      });
    }

    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(modal);

    (input || modal.querySelector('[data-confirm-cancel]')).focus();
  });
}

// ---------- field definitions ----------
const CASE_F = [['title', 'Case title'], ['number', 'Case number (note lodging numbers here)'], ['court', 'Court'], ['type', 'Case type'], ['filed', 'Filing date', 'date'],
  ['stage', 'Current procedural stage'], ['status', 'Status', 'sel', ['Pending', 'Reserved', 'Disposed', 'Appealed']], ['client', 'Client'],
  ['parties', 'Parties and advocates', 'area'], ['background', 'Background from inception', 'area']];
const EV_KINDS = ['Filing', 'Registration', 'Notice', 'Reply', 'Rejoinder', 'Application', 'Order', 'Hearing', 'Adjournment', 'Interim relief', 'Final arguments', 'Judgment', 'Appeal', 'Other'];
const HEAR_F = [
  ['date', 'Hearing date', 'date'],
  ['time', 'Board time', 'time'],
  ['court', 'Court / complex'],
  ['bench', 'Bench / judge'],
  ['room', 'Courtroom'],
  ['board_type', 'Board type'],
  ['board_no', 'Board number'],
  ['serial', 'Serial number'],
  ['purpose', 'Purpose of hearing'],
  ['advocate', 'Advocate appearing'],
  ['minutes', 'Minutes: what transpired, submissions, arguments, judge’s questions', 'area'],
  ['orders', 'Orders passed / adjournment', 'area'],
  ['action', 'Further action required', 'area'],

  ['make_task', 'Convert further action into a task', 'check'],
  ['task_due', 'Task due date', 'date', null, 'task-extra'],
  ['task_time', 'Task due time', 'time', null, 'task-extra'],
  ['task_priority', 'Task priority', 'sel', ['Low', 'Normal', 'High'], 'task-extra'],

  ['nx_date', 'Next hearing date (creates the next hearing)', 'date'],
  ['nx_time', 'Next board time', 'time'],
  ['nx_purpose', 'Next purpose']
];

async function editCase(id) {
  const v = id ? (await call('list', 'cases', { id }))[0] : {};
  form(id ? 'Edit case' : 'New case', CASE_F, v, o => call('save', 'cases', { ...o, id }));
}
async function editHearing(id, caseId) {
  const v = id
    ? ((await call('list', 'hearings', { id }))[0] || {})
    : {};

  let cid = caseId || v.case_id;
  let f = HEAR_F;

  v.make_task = '0';
  v.task_time = '17:00';
  v.task_priority = 'Normal';

  // Retrieve an existing task linked to this hearing.
  if (id) {
    const linked = await call('list', 'tasks', {
      source_hearing_id: Number(id)
    });

    if (linked.length) {
      const task = linked[0];

      v.make_task = '1';
      v.task_due = task.due ? task.due.slice(0, 10) : '';
      v.task_time = task.due && task.due.length >= 16
        ? task.due.slice(11, 16)
        : '17:00';
      v.task_priority = task.priority || 'Normal';
    }
  }

  if (!cid) {
    const cs = await call('list', 'cases');

    if (!cs.length) {
      return alert('Add a case first.');
    }

    f = [
      ['case_id', 'Case', 'sel', cs.map(c => [c.id, c.title])],
      ...HEAR_F
    ];
  }

  form(id ? 'Hearing record' : 'New hearing', f, v, async o => {
    const convert = o.make_task === '1';

    if (convert && !String(o.action || '').trim()) {
      alert('Enter the further action required before creating a task.');
      throw new Error('Further action is required.');
    }

    if (convert && !o.task_due) {
      alert('Select a due date for the task.');
      throw new Error('Task due date is required.');
    }

    const hid = await call('save', 'hearings', {
      ...o,
      case_id: Number(o.case_id || cid),
      id
    });

    if (o.nx_date) {
      await call('next', hid, o.nx_date, o.nx_time, o.nx_purpose);
    }

    if (convert) {
      const result = await call('task:from-hearing', {
        hearingId: hid,
        title: String(o.action).trim(),
        dueDate: o.task_due,
        dueTime: o.task_time || '17:00',
        priority: o.task_priority || 'Normal'
      });

      alert(result.created
        ? 'Further action successfully converted into a task.'
        : 'The existing linked task has been updated.');
    }
  });
}

async function editTask(id) {
  const v = id
    ? ((await call('list', 'tasks', { id }))[0] || {})
    : { priority: 'Normal' };

  if (!v.priority) v.priority = 'Normal';

  const cs = await call('list', 'cases');

  const taskFields = [
    ['title', 'Task'],
    ['due', 'Due (date and time)', 'datetime-local'],
    ['priority', 'Priority', 'sel', ['Low', 'Normal', 'High']],
    ['case_id', 'Linked case', 'sel', [
      ['', 'None'],
      ...cs.map(c => [c.id, c.title])
    ]],
    ['notes', 'Notes', 'area']
  ];

  form(id ? 'Edit task' : 'New task', taskFields, v, async o => {
    const title = String(o.title || '').trim();

    if (!title) {
      alert('Enter a task title.');
      throw new Error('Task title is required.');
    }

    const priority = ['Low', 'Normal', 'High'].includes(o.priority)
      ? o.priority
      : 'Normal';

    return call('save', 'tasks', {
      title,
      due: o.due || null,
      priority,
      case_id: o.case_id ? Number(o.case_id) : null,
      notes: o.notes || '',
      id: id ? Number(id) : undefined
    });
  }, id ? {
    onDelete: () => call('del', 'tasks', Number(id)),
    deleteLabel: 'Delete task',
    deleteMessage: 'Permanently delete this task? This cannot be undone.'
  } : {});
}

function editEvent(caseId, id, v = {}) {
  const values = { ...v };

  // New events default to Other.
  if (!id) {
    values.kind = 'Other';
  } else if (values.kind && !EV_KINDS.includes(values.kind)) {
    // Reopen previously saved custom event types correctly.
    values.custom_kind = values.kind;
    values.kind = 'Other';
  }

  const fields = [
    ['date', 'Date', 'date'],
    ['kind', 'Event type', 'sel', EV_KINDS],
    ['custom_kind', 'Your own event type', 'text', null, 'kind-extra'],
    ['historical', 'When', 'sel', [
      ['1', 'Before I joined (historical)'],
      ['0', 'During my internship']
    ]],
    ['text', 'Details', 'area']
  ];

  form(id ? 'Edit entry' : 'Add to List of Dates', fields, values, o => {
    const customKind = String(o.custom_kind || '').trim();

    const finalKind = o.kind === 'Other'
      ? (customKind || 'Other')
      : o.kind;

    const { custom_kind, ...record } = o;

    return call('save', 'events', {
      ...record,
      kind: finalKind,
      historical: Number(o.historical),
      case_id: caseId,
      id
    });
  });
}


// ============================================================
// TARIKH DOCUMENT VIEWER
// ============================================================

function documentSize(bytes) {
  const size = Number(bytes || 0);

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function documentListMarkup() {
  const query = String(S.docSearch || '').toLowerCase();

  const items = (S.docVisibleItems || []).filter(doc =>
    String(doc.original_name || '').toLowerCase().includes(query) ||
    String(doc.extension || '').toLowerCase().includes(query)
  );

  if (!items.length) {
    return `<div class="doc-list-empty">
      ${query ? 'No matching documents.' : 'No documents uploaded yet.'}
    </div>`;
  }

  return items.map(doc => `
    <div class="doc-entry">
      <button type="button" class="doc-list-item"
        data-a="docopen" data-i="${doc.id}">
        <span class="doc-file-type">${esc(String(doc.extension || 'FILE').toUpperCase())}</span>
        <span class="doc-list-copy">
          <strong>${esc(doc.original_name)}</strong>
          <small>${esc(documentSize(doc.size_bytes))} · ${esc(formatDateTime(doc.created_at))}</small>
        </span>
      </button>

      <button type="button" class="doc-delete"
        data-a="docdelete" data-i="${doc.id}"
        title="Delete document" aria-label="Delete ${esc(doc.original_name)}">×</button>
    </div>
  `).join('');
}

function documentPreviewMarkup(doc) {
  const ext = String(doc.extension || '').toLowerCase();
  const url = esc(doc.url);
  const name = esc(doc.original_name);

  if (ext === 'pdf') {
    return `<div class="ipad-pdf-viewer" data-pdf-url="${url}" aria-label="${name}"></div>`;
  }

  if (ext === 'docx') {
    return `<div class="ipad-word-preview" data-word-url="${url}" aria-label="${name}"></div>`;
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
    return `<div class="ipad-image-viewer"><div class="ipad-image-controls"><button type="button" data-image-fit>Fit</button><button type="button" data-image-full>Actual size</button></div><div class="doc-image-stage"><img src="${url}" alt="${name}" class="doc-image-preview"></div></div>`;
  }

  if (['txt', 'csv'].includes(ext)) {
    return `<iframe class="doc-preview-frame"
      src="${url}" title="${name}"></iframe>`;
  }

  return `<div class="doc-file-message">
    <div class="doc-file-message-icon">▤</div>
    <h3>${name}</h3>
    <p>This document is stored in your Library.</p>
    <p>Open it in its default application to view or edit its full contents.</p>
    <button type="button" class="btn pri"
      data-a="docexternal" data-i="${doc.id}">
      Open externally
    </button>
  </div>`;
}

function documentTabMarkup(doc) {
  const id = Number(doc.id);
  const selected = id === Number(S.docActiveId);

  return `
    <div class="doc-tab${selected ? ' active' : ''}" data-doc-tab="${id}">
      <button type="button" class="doc-tab-open"
        data-a="doctab" data-i="${id}"
        title="${esc(doc.original_name)}">
        ${esc(doc.original_name)}
      </button>
      <button type="button" class="doc-tab-close"
        data-a="docclose" data-i="${id}"
        aria-label="Close document tab">×</button>
    </div>
  `;
}

function documentPanelMarkup(doc) {
  const id = Number(doc.id);
  const selected = id === Number(S.docActiveId);

  return `
    <section class="doc-tab-panel${selected ? ' active' : ''}"
      data-doc-panel="${id}">
      <div class="doc-stage-toolbar">
        <span>${esc(doc.original_name)}</span>
        <button type="button" class="btn"
          data-a="docexternal" data-i="${id}">
          Open externally
        </button>
      </div>
      <div class="doc-stage-content">
        ${documentPreviewMarkup(doc)}
      </div>
    </section>
  `;
}

function documentEmptyStateMarkup() {
  return `
    <div class="doc-empty-state">
      <div class="doc-empty-icon">▤</div>
      <h3>Select a document to begin</h3>
      <p>Open a file from the sidebar. Multiple documents can remain open in tabs.</p>
    </div>
  `;
}

function renderDocumentViewer() {
  const root = document.querySelector('[data-doc-viewer]');
  if (!root) return;

  const tabs = Array.isArray(S.docTabs) ? S.docTabs : [];
  let active = tabs.find(
    doc => Number(doc.id) === Number(S.docActiveId)
  );

  if (!active && tabs.length) {
    S.docActiveId = Number(tabs[0].id);
    active = tabs[0];
  }

  const contextKey = String(S.docContextKey || '');

  const canUpdateInPlace =
    root.dataset.docContext === contextKey &&
    !!root.querySelector('.doc-main');

  root.className = 'doc-workspace' +
    (S.docCollapsed ? ' sidebar-collapsed' : '') +
    (document.body.classList.contains('ipad-doc-full') ? ' ipad-doc-expanded' : '');

  if (!canUpdateInPlace) {
    root.innerHTML = `
      <aside class="doc-sidebar">
        <div class="doc-sidebar-title">
          <strong>Documents</strong>
          <small>${(S.docVisibleItems || []).length} files</small>
        </div>

        <div class="doc-sidebar-search">
          <input type="search" data-doc-search
            value="${esc(S.docSearch || '')}"
            placeholder="Search documents...">
        </div>

        <div class="doc-nav">${documentListMarkup()}</div>
      </aside>

      <section class="doc-main">
        <div class="doc-tabs">
          <button type="button" class="doc-sidebar-toggle"
            data-a="doccollapse"
            title="${S.docCollapsed ? 'Show sidebar' : 'Hide sidebar'}">
            ${S.docCollapsed ? '▶' : '◀'}
          </button>

          <div class="doc-tabs-track">
            ${tabs.map(documentTabMarkup).join('')}
          </div>
          <button type="button" class="doc-sidebar-toggle ipad-doc-full-toggle" data-a="docfullscreen" aria-label="Full screen workspace" title="Full screen workspace">⛶</button>
        </div>

        <div class="doc-stage">
          ${tabs.length
            ? tabs.map(documentPanelMarkup).join('')
            : documentEmptyStateMarkup()}
        </div>
      </section>
    `;

    root.dataset.docContext = contextKey;
  } else {
    // Refresh only the list and tab strip. Do not replace the preview panels.
    const nav = root.querySelector('.doc-nav');
    if (nav) nav.innerHTML = documentListMarkup();

    const count = root.querySelector('.doc-sidebar-title small');
    if (count) {
      count.textContent = `${(S.docVisibleItems || []).length} files`;
    }

    const track = root.querySelector('.doc-tabs-track');
    if (track) {
      track.innerHTML = tabs.map(documentTabMarkup).join('');
    }

    const stage = root.querySelector('.doc-stage');

    if (stage) {
      const openIds = new Set(tabs.map(doc => Number(doc.id)));

      // Remove preview panels only when their corresponding tab is closed.
      stage.querySelectorAll('.doc-tab-panel').forEach(panel => {
        if (!openIds.has(Number(panel.dataset.docPanel))) {
          panel.remove();
        }
      });

      if (!tabs.length) {
        stage.querySelectorAll('.doc-tab-panel').forEach(panel => panel.remove());

        if (!stage.querySelector('.doc-empty-state')) {
          stage.innerHTML = documentEmptyStateMarkup();
        }
      } else {
        stage.querySelector('.doc-empty-state')?.remove();

        // Create a preview only for a newly opened document.
        // Existing iframe elements remain mounted and retain their state.
        tabs.forEach(doc => {
          const id = Number(doc.id);
          const existing = Array.from(
            stage.querySelectorAll('.doc-tab-panel')
          ).find(panel => Number(panel.dataset.docPanel) === id);

          if (!existing) {
            const template = document.createElement('template');
            template.innerHTML = documentPanelMarkup(doc).trim();

            const panel = template.content.firstElementChild;
            if (panel) stage.appendChild(panel);
          }
        });
      }
    }
  }

  // Switch visibility without removing or recreating inactive previews.
  root.querySelectorAll('.doc-tab').forEach(tab => {
    const selected =
      Number(tab.dataset.docTab) === Number(S.docActiveId);

    tab.classList.toggle('active', selected);
  });

  root.querySelectorAll('.doc-tab-panel').forEach(panel => {
    const selected =
      Number(panel.dataset.docPanel) === Number(S.docActiveId);

    panel.classList.toggle('active', selected);
  });

  const full = root.querySelector('.ipad-doc-full-toggle');
  if (full) {
    const expanded = document.body.classList.contains('ipad-doc-full');
    full.textContent = expanded ? 'Exit full screen' : '⛶';
    full.title = expanded ? 'Exit full screen' : 'Full screen workspace';
    full.setAttribute('aria-label', full.title);
    full.setAttribute('aria-pressed', String(expanded));
  }
  const toggle = root.querySelector('.doc-sidebar-toggle');
  if (toggle) {
    toggle.textContent = S.docCollapsed ? '▶' : '◀';
    toggle.title = S.docCollapsed ? 'Show sidebar' : 'Hide sidebar';
  }
}

async function openDocumentInViewer(id) {
  const doc = (S.docItems || []).find(
    item => Number(item.id) === Number(id)
  );

  if (!doc) throw new Error('Document not found.');

  let tab = (S.docTabs || []).find(
    item => Number(item.id) === Number(id)
  );

  if (!tab) {
    const url = await call('documents:url', Number(id));
    tab = { ...doc, url };
    S.docTabs = [...(S.docTabs || []), tab];
  }

  S.docActiveId = Number(id);
  renderDocumentViewer();
}


// ---------- views ----------
const V = {};
const hline = (h, cn) => `<div class="line" data-a="hearing" data-i="${h.id}">
  <b>${esc(h.time || '--:--')}</b>
  <div class="grow">
    ${esc(cn[h.case_id]?.title || '')}
    <small>${esc([h.court, h.room && 'Room ' + h.room, h.board_type,
      h.serial && 'Sr. ' + h.serial, h.purpose].filter(Boolean).join(' · '))}</small>
  </div>
  <span class="tag">${esc(formatDate(h.date))}</span>
  ${h.date < today() && !h.minutes
    ? '<span class="tag warn">Minutes pending</span>'
    : ''}
</div>`;

const taskLine = x => {
  const overdue = !x.done && x.due && x.due < loc(new Date());
  const due = x.due ? `Due ${formatDateTime(x.due)}` : 'No due date';
  return `<article class="task-row ${x.done ? 'is-done' : ''}">
    <label class="task-check" title="Mark task complete">
      <input type="checkbox" data-a="done" data-i="${x.id}" ${x.done ? 'checked' : ''} aria-label="Mark ${esc(x.title)} complete">
    </label>
    <button type="button" class="task-main" data-a="task" data-i="${x.id}">
      <span class="task-title">${esc(x.title)}</span>
      <span class="task-meta">${esc(due)} <span aria-hidden="true">·</span> ${esc(x.priority || 'Normal')}</span>
    </button>
    <div class="task-trailing">
      ${overdue ? '<span class="tag warn">Overdue</span>' : x.done ? '<span class="tag">Completed</span>' : ''}
      <button type="button" class="task-delete" data-a="deletetask" data-i="${x.id}" title="Delete task" aria-label="Delete task: ${esc(x.title)}">×</button>
    </div>
  </article>`;
};


V.dashboard = async el => {
  const [cs, hs, ts, savedName] = await Promise.all([
    call('list', 'cases'),
    call('list', 'hearings'),
    call('list', 'tasks'),
    call('set:get', 'name')
  ]);

  const displayName = String(savedName || '').trim();
  const welcomeHeading = displayName
    ? `Welcome, ${displayName}`
    : 'Welcome';

  const t = today();
  const n = loc(new Date());
  const wk = loc(new Date(Date.now() + 7 * 86400000)).slice(0, 10);

  const cn = Object.fromEntries(cs.map(c => [c.id, c]));

  const td = hs.filter(h => h.date === t);
  const up = hs.filter(h => h.date > t && h.date <= wk);
  const pend = hs.filter(h => h.date < t && !h.minutes);

  const open = ts.filter(x => !x.done);
  const over = open.filter(x => x.due && x.due < n);

  const now = new Date();

  const welcomeDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const welcomeTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  el.innerHTML = `
    <section class="welcome-card">
      <div class="welcome-avatar" aria-label="Profile initial"></div>

      <div class="welcome-copy">
        <h1 class="welcome-title">${esc(welcomeHeading)}</h1>

        <p class="welcome-time" data-welcome-clock>
          ${esc(`${welcomeDate} · ${welcomeTime}`)}
        </p>
      </div>
    </section>

    <div class="grid">
      ${[
        [td.length, 'Hearings today'],
        [up.length, 'Hearings in next 7 days'],
        [open.length, 'Pending tasks'],
        [over.length, 'Overdue tasks'],
        [pend.length, 'Minutes pending']
      ].map(([count, label]) => `
        <div class="card">
          <div class="stat">${count}<small>${label}</small></div>
        </div>
      `).join('')}
    </div>

    <h2>Today's hearings</h2>
    ${td.map(h => hline(h, cn)).join('') ||
      '<div class="empty">No hearings today.</div>'}

    <h2>Next seven days</h2>
    ${up.map(h => hline(h, cn)).join('') ||
      '<div class="empty">Nothing scheduled this week.</div>'}

    ${pend.length ? `
      <h2>Minutes to write up</h2>
      ${pend.map(h => hline(h, cn)).join('')}
    ` : ''}

    <h2>Tasks needing attention</h2>
    <div class="task-list">
      ${open.slice(0, 6).map(taskLine).join('') ||
        '<div class="empty">No pending tasks.</div>'}
    </div>
  `;

  updateWelcomeClock();
};

V.internships = async (el, first) => {
  const l = await call('ws:list');

  el.innerHTML = `
    <h1>Workspaces</h1>

    <div class="sub">
      ${first
        ? 'Create your first workspace to organise cases, hearings, tasks and documents.'
        : 'Keep separate workspaces for internships, chambers, advocacy practices and other legal work.'}
    </div>

    <div class="page-heading">
      <span></span>
      <button class="btn pri" data-a="newws">＋ New workspace</button>
    </div>

    <div class="grid internship-grid">
      ${l.map(w => `
        <article class="card internship-card">

          <div class="internship-card-heading">
            <b class="internship-name">${esc(w.name)}</b>

            <span class="tag internship-status">
              ${w.active ? 'Active' : 'Archived'}
            </span>
          </div>

          <small class="internship-meta">
            ${esc(w.supervisor || 'No supervisor recorded')}
            ${w.joined ? ' · from ' + esc(formatDate(w.joined)) : ''}
            ${w.leaving ? ' to ' + esc(formatDate(w.leaving)) : ''}
          </small>

          <div class="internship-actions">
            ${w.active ? '' : `
              <button class="btn"
                data-a="actws" data-i="${w.id}">
                Make active
              </button>
            `}

            <button class="btn"
              data-a="editws" data-i="${w.id}">
              Edit
            </button>

            <button class="btn danger"
              data-a="deletews" data-i="${w.id}">
              Delete
            </button>
          </div>

        </article>
      `).join('') || '<div class="empty">No internships added yet.</div>'}
    </div>
  `;
};
const WS_F = [['name', 'Chamber / organisation'], ['type', 'Role / Practice Type'], ['supervisor', 'Supervisor and designation'],
  ['joined', 'Joining date', 'date'], ['leaving', 'Leaving date', 'date'], ['address', 'Office address and contact', 'area'], ['notes', 'Notes', 'area']];

const CASE_TINT_HUES = [205, 270, 155, 30, 330, 185, 55, 245, 110, 355, 175, 285, 15, 225, 135, 310];
function caseTintHue(id) {
  const raw = String(id ?? '');
  let hash = 2166136261;
  for (const char of raw) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return CASE_TINT_HUES[(hash >>> 0) % CASE_TINT_HUES.length];
}
V.cases = async el => {
  const cs = await call('list', 'cases');
  el.innerHTML = `<div class="row sb"><h1>Cases</h1><button class="btn pri" data-a="newcase">New case</button></div>
   <input id="q" class="case-search" placeholder="Search title, number or court"><div id="cl" class="case-list"></div>`;
  // Assign an individual shade to each case, avoiding duplicate adjacent colours.
  const sortedCases = [...cs].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const huesById = new Map();
  const usedHues = new Set();
  for (const c of sortedCases) {
    const start = CASE_TINT_HUES.indexOf(caseTintHue(c.id));
    let hue = CASE_TINT_HUES[start];
    for (let step = 0; step < CASE_TINT_HUES.length; step++) {
      const candidate = CASE_TINT_HUES[(start + step) % CASE_TINT_HUES.length];
      if (!usedHues.has(candidate)) { hue = candidate; break; }
    }
    usedHues.add(hue);
    huesById.set(String(c.id), hue);
  }
  const draw = q => $('#cl').innerHTML = cs.filter(c => [c.title, c.number, c.court].join(' ').toLowerCase().includes(q.toLowerCase()))
    .map(c => `<div class="line case-tinted-row case-card-status-${({ pending: "pending", reserved: "reserved", disposed: "disposed", appealed: "appealed" })[String(c.status || "").trim().toLowerCase()] || "other"}" style="--case-tint-hue:${huesById.get(String(c.id))}" data-a="opencase" data-i="${c.id}">
      <div class="grow">
        <b>${esc(c.title)}</b>
        <small>${esc([c.number, c.court, c.stage].filter(Boolean).join(' · '))}</small>
      </div>
      ${c.next_hearing && /^(pending|active|admitted|ongoing|in progress)$/i.test(String(c.status || '').trim()) ? `<span class="tag">Next: ${esc(formatDate(c.next_hearing))}</span>` : ''}
      <span class="tag case-status-tag case-status-${({ pending: "pending", reserved: "reserved", disposed: "disposed", appealed: "appealed" })[String(c.status || "").trim().toLowerCase()] || "other"}">${esc(c.status)}</span>
      <button type="button" class="btn note-inline-action"
        data-a="newnote" data-i="case:${c.id}">＋ Note</button>
    </div>`).join('') || '<div class="empty">No cases yet.</div>';
  draw(''); $('#q').oninput = e => draw(e.target.value);
};
V.case = async el => {
  const [c] = await call('list', 'cases', { id: S.caseId }); if (!c) return go('cases');
  const tabs = [['overview', 'Overview and background'], ['dates', 'List of Dates'], ['hearings', 'Hearings'], ['notes', 'Notes'], ['documents', 'Documents']];
  let body = '';
  if (S.tab === 'overview') body = `<div class="glass panel"><div class="two">${[['Case number', c.number], ['Court', c.court], ['Type', c.type], ['Filed', formatDate(c.filed)], ['Stage', c.stage], ['Status', c.status], ['Client', c.client], ['Next hearing', formatDate(c.next_hearing)]]
    .map(([k, v]) => `<p><small style="opacity:.7">${k}</small><br>${esc(['Filed', 'Next hearing'].includes(k) ? (formatDate(v) || '—') : (v || '—'))}</p>`).join('')}</div><h2>Parties and advocates</h2><pre>${esc(c.parties || '—')}</pre><h2>Background</h2><pre>${esc(c.background || '—')}</pre></div>`;
  if (S.tab === 'dates') {
    const [ev, hs] = await Promise.all([call('list', 'events', { case_id: c.id }), call('list', 'hearings', { case_id: c.id })]);
    const all = [...ev.map(e => ({ ...e, src: 'e' })), ...hs.map(h => ({ id: h.id, date: h.date, kind: 'Hearing', text: [h.purpose, h.orders].filter(Boolean).join(' — '), historical: 0, src: 'h' }))].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    body = `<button class="btn pri record-action" data-a="newevent">Add entry</button><div class="record-list">${all.map(e => `<div class="line" data-a="${e.src === 'e' ? 'event' : 'hearing'}" data-i="${e.id}"><b style="min-width:92px">${esc(formatDate(e.date))}</b>
     <div class="grow">${esc(e.kind)}<small>${esc(e.text)}</small></div>${e.historical ? '<span class="tag">Historical</span>' : ''}</div>`).join('') || '<div class="empty">Add the first event, including events from before you joined.</div>'}</div>`;
  }
  if (S.tab === 'hearings') {
    const hs = await call('list', 'hearings', { case_id: c.id }), cn = { [c.id]: c };
    body = `<button class="btn pri record-action" data-a="newhearing">Add hearing</button><div class="record-list">${hs.map(h => hearingNoteEntryMarkup(h, cn)).join('') || '<div class="empty">No hearings recorded.</div>'}</div>`;
  }


  if (S.tab === 'notes') {
    const allNotes = await call('notes:list');
    const caseNotes = allNotes.filter(
      note => Number(note.case_id) === Number(c.id)
    );

    body = `
      <section class="case-notes-panel">
        <div class="page-heading">
          <div>
            <h2>Notes for this case</h2>
            <p class="sub">Private working notes associated with this case.</p>
          </div>
          <button type="button" class="btn pri"
            data-a="newnote" data-i="case:${c.id}">
            ＋ Add case note
          </button>
        </div>
        <div class="note-card-list">
          ${caseNotes.map(noteCardMarkup).join('') ||
            '<div class="empty">No notes have been added to this case yet.</div>'}
        </div>
      </section>`;
  }

  if (S.tab === 'documents') {
    const docs = await call('documents:list', { case_id: c.id });
    const contextKey = `case:${c.id}`;

    if (S.docContextKey !== contextKey) {
      for (const tab of S.docTabs || []) window.tarikhReleaseDocumentURL?.(tab.id, tab.url);
      S.docTabs = [];
      S.docActiveId = null;
      S.docCollapsed = false;
      S.docSearch = '';
    }

    S.docContextKey = contextKey;
    S.docItems = docs;
    S.docVisibleItems = docs;

    body = `
      <section class="case-document-section">
        <div class="doc-section-heading">
          <div>
            <h2>Case documents</h2>
            <p class="sub">Documents, orders, pleadings and other files associated with this case.</p>
          </div>
          <button type="button" class="btn pri"
            data-a="docupload" data-i="case:${c.id}">
            ＋ Upload documents
          </button>
        </div>

        <div data-doc-viewer class="doc-workspace"></div>
      </section>
    `;
  }

  el.innerHTML = `<div class="row sb"><div><button class="btn" data-a="go" data-i="cases">← Cases</button></div><div class="row"><button class="btn" data-a="newnote" data-i="case:${c.id}">＋ Note</button><button class="btn" data-a="editcase" data-i="${c.id}">Edit</button><button class="btn" data-a="delcase" data-i="${c.id}">Delete</button></div></div>
   <h1 style="margin-top:16px">${esc(c.title)}</h1><div class="tabs">${tabs.map(([k, l]) => `<button class="btn ${S.tab === k ? 'on' : ''}" data-a="tab" data-i="${k}">${l}</button>`).join('')}</div>${body}`;
  initializeNotePreviews(el);
};

// ============================================================
// LIBRARY: Quick Reference + Case Collections
// ============================================================

V.library = async el => {
  const [cases, allDocs] = await Promise.all([
    call('list', 'cases'),
    call('documents:list')
  ]);

  const references = allDocs.filter(d => Number(d.is_reference) === 1);
  const unassigned = allDocs.filter(
    d => !d.case_id && Number(d.is_reference) !== 1
  );

  const selectedCase = S.libraryCaseId
    ? cases.find(c => Number(c.id) === Number(S.libraryCaseId))
    : null;

  if (S.libraryCaseId && !selectedCase) {
    S.libraryCaseId = null;
  }

  let visibleDocs = [];
  let contextKey = 'library:cases';
  let sectionTitle = '';

  if (selectedCase) {
    visibleDocs = allDocs.filter(
      d => Number(d.case_id) === Number(selectedCase.id)
    );
    contextKey = `library:case:${selectedCase.id}`;
    sectionTitle = selectedCase.title;

  } else if (S.libraryScope === 'reference') {
    visibleDocs = references;
    contextKey = 'library:reference';
    sectionTitle = 'Quick Reference Documents';

  } else if (S.libraryScope === 'unassigned') {
    visibleDocs = unassigned;
    contextKey = 'library:unassigned';
    sectionTitle = 'Unassigned documents';
  }

  if (S.docContextKey !== contextKey) {
    for (const tab of S.docTabs || []) window.tarikhReleaseDocumentURL?.(tab.id, tab.url);
      S.docTabs = [];
    S.docActiveId = null;
    S.docCollapsed = false;
    S.docSearch = '';
  }

  S.docContextKey = contextKey;
  S.docItems = allDocs;
  S.docVisibleItems = visibleDocs;

  const caseCards = cases.map(c => {
    const docs = allDocs.filter(d => Number(d.case_id) === Number(c.id));

    return `
      <article class="library-case-card"
        tabindex="0" role="button"
        data-a="librarycase" data-i="${c.id}">

        <div class="library-case-card-heading">
          <h3>${esc(c.title)}</h3>
          <span class="tag">${docs.length} ${docs.length === 1 ? 'document' : 'documents'}</span>
        </div>

        <p>${esc([c.number, c.court].filter(Boolean).join(' · ') || 'Case details')}</p>

        <div class="library-case-files">
          ${docs.slice(0, 3).map(d => `<span>${esc(d.original_name)}</span>`).join('') ||
            '<span>No documents uploaded yet</span>'}
          ${docs.length > 3 ? `<span>+${docs.length - 3} more</span>` : ''}
        </div>

        <div class="library-open-label">Open case library →</div>
      </article>
    `;
  }).join('');

  el.innerHTML = `
    <div class="page-heading library-main-heading">
      <div>
        <h1>Library</h1>
        <p class="sub">Case documents and quick reference materials for this workspace.</p>
      </div>
      <button type="button" class="btn pri"
        data-a="newnote"
        data-i="${selectedCase ? 'case:' + selectedCase.id : 'general'}">
        ＋ Add note
      </button>
    </div>

    <section class="library-reference-bar">
      <div class="library-reference-heading">
        <div>
          <h2>Quick Reference</h2>
          <p>Acts, statutes, rules, research papers and miscellaneous reference files.</p>
        </div>

        <button type="button" class="btn pri"
          data-a="docupload" data-i="reference">
          ＋ Upload reference
        </button>
      </div>

      <div class="library-reference-strip">
        ${references.map(d => `
          <button type="button" class="library-reference-chip"
            data-a="libraryrefopen" data-i="${d.id}"
            title="${esc(d.original_name)}">
            <span class="reference-chip-type">${esc(String(d.extension).toUpperCase())}</span>
            <span>${esc(d.original_name)}</span>
          </button>
        `).join('') ||
          '<span class="library-reference-empty">No quick reference documents yet.</span>'}
      </div>
    </section>

    ${selectedCase ? `
      <section class="library-selected-case">
        <div class="page-heading library-section-heading">
          <div>
            <button type="button" class="btn" data-a="libraryback">← All cases</button>
            <h2>${esc(sectionTitle)}</h2>
            <p>${visibleDocs.length} associated documents</p>
          </div>

          <button type="button" class="btn pri"
            data-a="docupload" data-i="case:${selectedCase.id}">
            ＋ Upload documents
          </button>
        </div>

        <div data-doc-viewer class="doc-workspace"></div>
      </section>

    ` : S.libraryScope ? `
      <section class="library-selected-case">
        <div class="page-heading library-section-heading">
          <div>
            <button type="button" class="btn" data-a="libraryback">← All cases</button>
            <h2>${esc(sectionTitle)}</h2>
            <p>${visibleDocs.length} documents</p>
          </div>
        </div>

        <div data-doc-viewer class="doc-workspace"></div>
      </section>

    ` : `
      <div class="page-heading library-cases-heading">
        <h2>Cases</h2>
        <span class="sub">${cases.length} case collections</span>
      </div>

      <div class="library-case-grid">
        ${caseCards || '<div class="empty">Create a case first. Its documents will appear here.</div>'}
      </div>

      ${unassigned.length ? `
        <section class="library-unassigned-section">
          <div class="page-heading">
            <h2>Unassigned documents</h2>
            <button type="button" class="btn"
              data-a="libraryorphans">
              View ${unassigned.length} documents
            </button>
          </div>
          <p class="sub">Files retained after their original case was removed.</p>
        </section>
      ` : ''}
    `}
  `;
};



function hearingNoteEntryMarkup(hearing, casesById) {
  return `
    <div class="hearing-note-entry">
      ${hline(hearing, casesById)}
      <button type="button" class="btn note-inline-action"
        data-a="newnote" data-i="hearing:${hearing.id}">
        ＋ Note
      </button>
    </div>`;
}

V.hearings = async el => {
  const [cs, hs] = await Promise.all([call('list', 'cases'), call('list', 'hearings')]), cn = Object.fromEntries(cs.map(c => [c.id, c])), t = today();
  const up = hs.filter(h => h.date >= t), past = hs.filter(h => h.date < t).reverse();
  el.innerHTML = `<div class="row sb"><h1>Hearings</h1><div class="row"><button class="btn" data-a="newnote" data-i="general">＋ General note</button><button class="btn pri" data-a="newhearing">New hearing</button></div></div>
   <h2>Upcoming</h2>${up.map(h => hearingNoteEntryMarkup(h, cn)).join('') || '<div class="empty">No upcoming hearings.</div>'}<h2>Past</h2>${past.map(h => hearingNoteEntryMarkup(h, cn)).join('') || '<div class="empty">None yet.</div>'}`;
};

function noteCardMarkup(note) {
  const updated = note.updated_at || note.created_at || '';
  const meta = [];

  if (updated) meta.push('Updated ' + formatDate(updated));
  if (note.hearing_date) {
    meta.push('Hearing ' + formatDate(note.hearing_date));
  }
  if (note.hearing_purpose) meta.push(note.hearing_purpose);

  return `
    <article class="note-card">
      <div class="note-card-heading">
        <div class="note-card-title-area">
          <h3>${esc(note.title || 'Untitled note')}</h3>
          ${meta.length ? `<small>${esc(meta.join(' · '))}</small>` : ''}
        </div>
        <div class="note-card-actions">
          <button type="button" class="btn"
            data-a="editnote" data-i="${note.id}">Edit</button>
          <button type="button" class="btn danger"
            data-a="deletenote" data-i="${note.id}">Delete</button>
        </div>
      </div>
      <div class="note-card-content is-collapsed" data-note-content>${esc(note.content || '')}</div>
      <button type="button" class="btn note-read-toggle" data-a="togglenote" data-i="${note.id}" hidden>Read more</button>
    </article>`;
}

function initializeNotePreviews(root) {
  root.querySelectorAll('.note-card').forEach(card => {
    const content = card.querySelector('[data-note-content]');
    const toggle = card.querySelector('[data-a="togglenote"]');
    if (!content || !toggle) return;

    content.classList.add('is-collapsed');
    toggle.hidden = content.scrollHeight <= content.clientHeight + 1;
  });
}

V.notes = async el => {
  const [notes, cases] = await Promise.all([
    call('notes:list'),
    call('list', 'cases')
  ]);

  const generalNotes = notes.filter(
    note => note.case_id === null || note.case_id === undefined
  );

  const caseSections = cases.map(caseRecord => {
    const linked = notes.filter(
      note => Number(note.case_id) === Number(caseRecord.id)
    );

    if (!linked.length) return '';

    const caseReference = [
      caseRecord.number,
      caseRecord.court
    ].filter(Boolean).join(' · ');

    return `
      <section class="notes-case-group">
        <div class="notes-case-heading">
          <div>
            <h3>${esc(caseRecord.title)}</h3>
            ${caseReference ? `<small>${esc(caseReference)}</small>` : ''}
          </div>
          <div class="notes-case-actions">
            <span class="tag">${linked.length}</span>
            <button type="button" class="btn notes-case-toggle"
              data-a="togglecasegroup" aria-expanded="true">Collapse</button>
            <button type="button" class="btn"
              data-a="newnote" data-i="case:${caseRecord.id}">
              ＋ Add
            </button>
          </div>
        </div>
        <div class="note-card-list">
          ${linked.map(noteCardMarkup).join('')}
        </div>
      </section>`;
  }).filter(Boolean).join('');

  el.innerHTML = `
    <div class="page-heading notes-page-heading">
      <div>
        <h1>Notes</h1>
        <p class="sub">Keep general working notes and notes organised by case.</p>
      </div>
      <button type="button" class="btn pri"
        data-a="newnote" data-i="general">＋ New note</button>
    </div>

    <div class="notes-board-grid">
      <section class="glass panel notes-column">
        <div class="notes-column-heading">
          <div>
            <h2>General Notes</h2>
            <p class="sub">Notes not linked to a particular case.</p>
          </div>
          <span class="tag">${generalNotes.length}</span>
        </div>
        <div class="note-card-list">
          ${generalNotes.map(noteCardMarkup).join('') ||
            '<div class="empty">No general notes yet. Create one using New note.</div>'}
        </div>
      </section>

      <section class="glass panel notes-column">
        <div class="notes-column-heading">
          <div>
            <h2>Case Notes</h2>
            <p class="sub">Notes grouped under their respective cases.</p>
          </div>
          <span class="tag">${notes.length - generalNotes.length}</span>
        </div>
        <div class="notes-case-groups">
          ${caseSections ||
            '<div class="empty">No case-linked notes yet. Add notes from a case, hearing or Library, or assign a case when creating a note.</div>'}
        </div>
      </section>
    </div>`;

  initializeNotePreviews(el);
};

V.tasks = async el => {
  const ts = await call('list', 'tasks'), n = loc(new Date()), t = today();

  const next7EndDate = new Date(`${t}T00:00:00`);
  next7EndDate.setDate(next7EndDate.getDate() + 6);

  const next7End = [
    next7EndDate.getFullYear(),
    String(next7EndDate.getMonth() + 1).padStart(2, '0'),
    String(next7EndDate.getDate()).padStart(2, '0')
  ].join('-');
  const F = {
    all: () => true,
    today: x => !x.done && x.due && x.due.slice(0, 10) === t,
    next7: x => !x.done && x.due &&
      x.due.slice(0, 10) >= t &&
      x.due.slice(0, 10) <= next7End,
    upcoming: x => !x.done && x.due && x.due.slice(0, 10) > t,
    overdue: x => !x.done && x.due && x.due < n,
    done: x => x.done
  };

  const labels = {
    all: 'All',
    today: 'Today',
    next7: 'Next 7 Days',
    upcoming: 'Upcoming',
    overdue: 'Overdue',
    done: 'Done'
  };
  el.innerHTML = `<div class="page-heading"><h1>Tasks</h1><button class="btn pri" data-a="newtask">＋ New task</button></div>
   <div class="task-filters">${Object.keys(F).map(k => `<button class="btn ${S.filter === k ? 'on' : ''}" data-a="filter" data-i="${k}">${labels[k] || k}</button>`).join('')}</div>
   <div class="task-list">${ts.filter(F[S.filter]).map(taskLine).join('') || '<div class="empty">Nothing here.</div>'}</div>`;
};

// ============================================================
// TARIKH MONTHLY CALENDAR
// ============================================================

function calendarPad(value) {
  return String(value).padStart(2, '0');
}

function calendarISO(value) {
  const raw = String(value || '').trim();

  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const check = new Date(y, m - 1, d);

    if (
      check.getFullYear() === y &&
      check.getMonth() === m - 1 &&
      check.getDate() === d
    ) return `${y}-${calendarPad(m)}-${calendarPad(d)}`;
  }

  match = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) {
    const d = Number(match[1]);
    const m = Number(match[2]);
    const y = Number(match[3]);
    const check = new Date(y, m - 1, d);

    if (
      check.getFullYear() === y &&
      check.getMonth() === m - 1 &&
      check.getDate() === d
    ) return `${y}-${calendarPad(m)}-${calendarPad(d)}`;
  }

  return '';
}

function calendarDisplayDate(iso) {
  const parts = calendarISO(iso).split('-');
  if (parts.length !== 3) return String(iso || '');

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function calendarLongDate(iso) {
  const normal = calendarISO(iso);
  if (!normal) return '';

  const [year, month, day] = normal.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  return `${d.toLocaleDateString('en-IN', { weekday: 'long' })}, ${calendarDisplayDate(normal)}`;
}

function calendarMoveMonth(amount) {
  if (!S.calendarMonth) {
    S.calendarMonth = today().slice(0, 7);
  }

  const [year, month] = S.calendarMonth.split('-').map(Number);
  const selectedDay = Number(
    (S.calendarSelectedDate || today()).slice(-2)
  ) || 1;

  const next = new Date(year, month - 1 + amount, 1);
  const nextYear = next.getFullYear();
  const nextMonth = next.getMonth() + 1;
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();

  S.calendarMonth = `${nextYear}-${calendarPad(nextMonth)}`;
  S.calendarSelectedDate =
    `${nextYear}-${calendarPad(nextMonth)}-${calendarPad(Math.min(selectedDay, lastDay))}`;

  renderCalendarPage();
}

function calendarBuildEntries(cases, hearings, tasks, events, holidays, meetings = []) {
  const entries = [];
  const caseMap = new Map(cases.map(c => [Number(c.id), c]));

  const add = (dateValue, item) => {
    const date = calendarISO(dateValue);
    if (!date) return;
    entries.push({ ...item, date });
  };

  // Case filing dates.
  for (const c of cases) {
    if (c.filed) {
      add(c.filed, {
        type: 'case',
        id: Number(c.id),
        title: c.title,
        subtitle: [
          'Case filed',
          c.number,
          c.court
        ].filter(Boolean).join(' · ')
      });
    }
  }

  // All recorded hearings.
  const hearingDates = new Set();

  for (const h of hearings) {
    const date = calendarISO(h.date);
    if (!date) continue;

    hearingDates.add(`${h.case_id}|${date}`);

    const linked = caseMap.get(Number(h.case_id));

    add(date, {
      type: 'hearing',
      id: Number(h.id),
      caseId: Number(h.case_id),
      title: linked ? `Hearing · ${linked.title}` : 'Hearing',
      subtitle: [
        h.time,
        h.court,
        h.bench,
        h.room && `Room ${h.room}`,
        h.purpose
      ].filter(Boolean).join(' · ')
    });
  }

  // Case next-hearing dates not yet represented by a hearing record.
  for (const c of cases) {
    const date = calendarISO(c.next_hearing);
    if (!date || hearingDates.has(`${c.id}|${date}`)) continue;

    add(date, {
      type: 'case-next',
      id: Number(c.id),
      title: `Next hearing · ${c.title}`,
      subtitle: 'Next hearing date recorded in case details'
    });
  }

  // Task due dates, including completed tasks.
  for (const task of tasks) {
    const date = calendarISO(task.due);
    if (!date) continue;

    const linked = task.case_id
      ? caseMap.get(Number(task.case_id))
      : null;

    add(date, {
      type: 'task',
      id: Number(task.id),
      title: task.title,
      subtitle: [
        task.done ? 'Completed' : 'Task due',
        task.priority,
        linked ? linked.title : ''
      ].filter(Boolean).join(' · ')
    });
  }

  // Entries from each case's List of Dates.
  for (const event of events) {
    const date = calendarISO(event.date);
    if (!date) continue;

    const linked = caseMap.get(Number(event.case_id));

    add(date, {
      type: 'event',
      id: Number(event.id),
      caseId: Number(event.case_id),
      title: `${event.kind || 'Case event'}${linked ? ` · ${linked.title}` : ''}`,
      subtitle: [
        event.text,
        Number(event.historical) ? 'Historical entry' : ''
      ].filter(Boolean).join(' · ')
    });
  }

  // Independently scheduled meetings.
  for (const meeting of (meetings || [])) {
    const details = [
      meeting.start_time,
      meeting.end_time ? 'to ' + meeting.end_time : '',
      meeting.location,
      meeting.meeting_link ? 'Online meeting' : ''
    ].filter(Boolean);

    add(meeting.date, {
      type: 'meeting',
      id: Number(meeting.id),
      title: meeting.title,
      time: meeting.start_time || '',
      meeting_link: meeting.meeting_link || '',
      subtitle: details.join(' · ')
    });
  }



  return entries.sort((a, b) =>
    a.date.localeCompare(b.date) ||
    a.type.localeCompare(b.type) ||
    a.title.localeCompare(b.title)
  );
}

function calendarItemsForDate(date) {
  return (S.calendarData?.entries || []).filter(
    item => item.date === date
  );
}

// Court holidays are closures, not scheduled calendar entries.
function calendarHolidayForDate(date) {
  const iso = calendarISO(date);
  return (S.calendarData?.holidays || []).find(
    holiday => calendarISO(holiday.date) === iso
  ) || null;
}

function calendarItemMarkup(item) {
  const labels = {
    case: 'Case filing',
    'case-next': 'Next hearing',
    hearing: 'Hearing',
    task: 'Task',
    event: 'Case event',
    holiday: 'Court holiday',
    meeting: 'Meeting'
  };

  const actionToken = `${item.type}:${item.id}`;

  return `
    <article class="calendar-detail-item type-${esc(item.type)}">
      <div class="calendar-entry-copy">
        <span class="calendar-entry-type">${esc(labels[item.type] || 'Entry')}</span>
        <strong>${esc(item.title)}</strong>
        <small>${esc(item.subtitle || '')}</small>
      </div>

      ${item.type === 'holiday'
        ? `<button type="button" class="btn calendar-remove-holiday"
             data-a="caldeleteholiday" data-i="${esc(item.date)}"
             title="Remove this holiday">Remove</button>`
        : `<button type="button" class="btn calendar-open-entry"
             data-a="calopen" data-i="${esc(actionToken)}">Open</button>`}
    </article>
  `;
}

function renderCalendarPage() {
  const el = $('#view');
  if (!el || !S.calendarData) return;

  if (!S.calendarMonth) {
    S.calendarMonth = today().slice(0, 7);
  }

  if (!S.calendarSelectedDate) {
    S.calendarSelectedDate = today();
  }

  const [year, month] = S.calendarMonth.split('-').map(Number);
  const currentYear = new Date().getFullYear();
  const yearStart = Math.min(currentYear - 5, year - 5);
  const yearEnd = Math.max(currentYear + 10, year + 5);
  const monthDate = new Date(year, month - 1, 1);
  const monthTitle = monthDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric'
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = (monthDate.getDay() + 6) % 7; // Monday first.
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;

  const cells = [];

  for (let index = 0; index < totalCells; index++) {
    const day = index - leading + 1;

    if (day < 1 || day > daysInMonth) {
      cells.push('<div class="calendar-day calendar-day-empty"></div>');
      continue;
    }

    const date =
      `${year}-${calendarPad(month)}-${calendarPad(day)}`;

    const items = calendarItemsForDate(date);
    const sunday = new Date(year, month - 1, day).getDay() === 0;
    const holidayInfo = calendarHolidayForDate(date);
    const holiday = !!holidayInfo;

    const holidayName = String(holidayInfo?.name || '').trim();
    const holidayNotes = String(holidayInfo?.notes || '').trim();

    const holidayReason =
      holidayName && holidayName.toLowerCase() !== 'court holiday'
        ? holidayName
        : holidayNotes;

    const holidayReasonTitle =
      [holidayName, holidayNotes].filter(Boolean).join(' · ');
    const closed = sunday || holiday;
    const selected = date === S.calendarSelectedDate;
    const todayFlag = date === today();

    const markers = items.slice(0, 4).map(item =>
      `<span class="calendar-dot dot-${esc(item.type)}" title="${esc(item.title)}"></span>`
    ).join('');

    const remaining = items.length > 4
      ? `<span class="calendar-extra-count">+${items.length - 4}</span>`
      : '';

    const title = items.map(item => item.title).join(', ');

    cells.push(`
      <button type="button"
        class="calendar-day
          ${sunday ? 'is-sunday' : ''}
          ${holiday ? 'is-holiday' : ''}
          ${selected ? 'is-selected' : ''}
          ${todayFlag ? 'is-today' : ''}"
        data-a="calday" data-i="${date}"
        aria-label="${esc(calendarLongDate(date))}${closed ? ', Court closed' : ''}. ${esc(title)}">

        <span class="calendar-day-number">${day}</span>

        ${closed ? '<span class="calendar-closed-label">Closed</span>' : ''}

        ${holidayReason
          ? `<span class="calendar-holiday-reason"
              title="${esc(holidayReasonTitle)}">
              ${esc(holidayReason)}
            </span>`
          : ''}

        <span class="calendar-day-markers">${markers}${remaining}</span>

        ${items.length
          ? `<span class="calendar-day-count">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>`
          : ''}
      </button>
    `);
  }

  const selectedDate = S.calendarSelectedDate;
  const selectedItems = calendarItemsForDate(selectedDate);
  const selectedSunday =
    new Date(
      Number(selectedDate.slice(0, 4)),
      Number(selectedDate.slice(5, 7)) - 1,
      Number(selectedDate.slice(8, 10))
    ).getDay() === 0;

  const selectedHolidayInfo = calendarHolidayForDate(selectedDate);
  const selectedHoliday = !!selectedHolidayInfo;

  const closureLabel = selectedSunday && selectedHoliday
    ? 'Sunday · Court holiday'
    : selectedSunday
      ? 'Sunday · Court closed'
      : selectedHoliday
        ? 'Court holiday'
        : 'Court working day';

  const closureClass = selectedSunday || selectedHoliday
    ? 'calendar-status-closed'
    : 'calendar-status-open';

  el.innerHTML = `
    <section class="calendar-page">
      <div class="calendar-topbar">
        <div>
          <h1>Calendar</h1>
          <p class="sub">Cases, hearings, tasks and court holidays</p>
        </div>

        <div class="calendar-month-controls">
          <button class="btn" data-a="calprev" aria-label="Previous month">←</button>

          <select class="calendar-month-select" data-calendar-month
            aria-label="Select month">
            ${Array.from({ length: 12 }, (_, index) => {
              const value = index + 1;
              const label = new Date(year, index, 1)
                .toLocaleDateString('en-IN', { month: 'long' });

              return `<option value="${calendarPad(value)}"
                ${value === month ? 'selected' : ''}>${esc(label)}</option>`;
            }).join('')}
          </select>

          <select class="calendar-year-select" data-calendar-year
            aria-label="Select year">
            ${Array.from(
              { length: yearEnd - yearStart + 1 },
              (_, index) => yearStart + index
            ).map(optionYear => `
              <option value="${optionYear}"
                ${optionYear === year ? 'selected' : ''}>
                ${optionYear}
              </option>
            `).join('')}
          </select>

          <button class="btn" data-a="calnext" aria-label="Next month">→</button>
          <button class="btn" data-a="caltoday">Today</button>
        </div>
      </div>


      

      <div class="calendar-layout">
        <section class="glass panel calendar-board">
          <div class="calendar-weekdays">
            ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
              .map((day, index) =>
                `<div class="${index === 6 ? 'weekday-sunday' : ''}">${day}</div>`
              ).join('')}
          </div>

          <div class="calendar-days">${cells.join('')}</div>

          <div class="calendar-legend">
            <span><i class="legend-case"></i> Case</span>
              <span><i class="legend-case-next"></i> Next hearing</span>
            <span><i class="legend-hearing"></i> Hearing</span>
            <span><i class="legend-task"></i> Task</span>
            <span><i class="legend-event"></i> Other event</span>
              <span><i class="legend-meeting"></i> Meeting</span>
            <span><i class="legend-holiday"></i> Holiday</span>
          </div>
        </section>

        <aside class="glass panel calendar-details">
          <div class="calendar-details-heading">
            <div>
              <h2>${esc(calendarLongDate(selectedDate))}</h2>
              <span class="${closureClass}">${closureLabel}</span>
            </div>
          </div>

          ${selectedSunday || selectedHoliday
            ? `<div class="calendar-closure-notice">
                 ${selectedSunday ? '<div>The court is closed on Sundays.</div>' : ''}
                 ${selectedHoliday ? '<div>The court is closed for this holiday.</div>' : ''}
                 ${selectedHolidayInfo?.name &&
                    selectedHolidayInfo.name.trim().toLowerCase() !== 'court holiday'
                    ? `<strong>${esc(selectedHolidayInfo.name)}</strong>` : ''}
                 ${selectedHolidayInfo?.notes
                    ? `<small>${esc(selectedHolidayInfo.notes)}</small>` : ''}
               </div>`
            : ''}

          <h3 class="calendar-agenda-heading">
            ${selectedItems.length
              ? `${selectedItems.length} scheduled ${selectedItems.length === 1 ? 'item' : 'items'}`
              : 'No scheduled items'}
          </h3>

          <div class="calendar-agenda">
            ${selectedItems.map(calendarItemMarkup).join('') ||
              '<div class="calendar-no-items">Nothing has been scheduled for this date.</div>'}
          </div>

          ${selectedHoliday
            ? `<button class="btn calendar-add-holiday"
                 data-a="caldeleteholiday"
                 data-i="${esc(selectedDate)}">
                 Unmark as a court holiday
               </button>`
            : `<button class="btn pri calendar-add-holiday"
                 data-a="calnewholiday">
                 + Mark as a court holiday
               </button>`}
        </aside>
      </div>
    </section>
  `;
}


// ============================================================
// Meetings
// ============================================================

async function editMeeting(id, returnView = 'meetings') {
  let values = {
    title: '',
    date: today(),
    start_time: '10:00',
    end_time: '',
    location: '',
    meeting_link: '',
    notes: ''
  };

  if (id) {
    const rows = await call('meetings:list', { id: Number(id) });
    if (!rows.length) throw new Error('Meeting not found.');
    values = rows[0];
  }

  const fields = [
    ['title', 'Meeting title'],
    ['date', 'Date', 'date'],
    ['start_time', 'Start time', 'time'],
    ['end_time', 'End time (optional)', 'time'],
    ['location', 'Location / venue'],
    ['meeting_link', 'Meeting link (optional)'],
    ['notes', 'Notes', 'area']
  ];

  form(
    id ? 'Edit meeting' : 'Schedule meeting',
    fields,
    values,
    async record => {
      await call('meetings:save', {
        ...record,
        ...(id ? { id: Number(id) } : {})
      });
    }
  );
}

V.meetings = async el => {
  const meetings = await call('meetings:list');
  const todayDate = today();

  const sortMeetings = (a, b) =>
    String(a.date).localeCompare(String(b.date)) ||
    String(a.start_time).localeCompare(String(b.start_time)) ||
    String(a.title).localeCompare(String(b.title));

  const upcoming = meetings
    .filter(item => item.date >= todayDate)
    .sort(sortMeetings);

  const past = meetings
    .filter(item => item.date < todayDate)
    .sort(sortMeetings)
    .reverse();

  const card = meeting => {
    const time = meeting.start_time +
      (meeting.end_time ? ' – ' + meeting.end_time : '');

    const details = [
      time,
      meeting.location,
      meeting.meeting_link ? 'Online meeting available' : ''
    ].filter(Boolean);

    return `
      <article class="meeting-card">
        <div class="meeting-card-main">
          <div class="meeting-card-date">
            ${esc(calendarDisplayDate(meeting.date))}
          </div>
          <div class="meeting-card-copy">
            <strong>${esc(meeting.title)}</strong>
            <small>${esc(details.join(' · '))}</small>
            ${meeting.notes
              ? `<p>${esc(meeting.notes)}</p>`
              : ''}
          </div>
        </div>

        <div class="meeting-card-actions">
          ${meeting.meeting_link
            ? `<button type="button" class="btn"
                 data-a="meetingjoin" data-i="${meeting.id}">Join</button>`
            : ''}
          <button type="button" class="btn"
            data-a="editmeeting" data-i="${meeting.id}">Edit</button>
          <button type="button" class="btn meeting-delete"
            data-a="deletemeeting" data-i="${meeting.id}">Delete</button>
        </div>
      </article>
    `;
  };

  const section = (heading, records, emptyText) => `
    <section class="meetings-section">
      <h2>${heading}</h2>
      <div class="meetings-list">
        ${records.map(card).join('') ||
          `<div class="meetings-empty">${emptyText}</div>`}
      </div>
    </section>
  `;

  el.innerHTML = `
    <div class="page-heading">
      <div>
        <h1>Meetings</h1>
        <p class="sub">Schedule and manage your professional meetings.</p>
      </div>
      <button type="button" class="btn pri" data-a="newmeeting">
        + Schedule meeting
      </button>
    </div>

    ${section('Upcoming meetings', upcoming, 'No upcoming meetings scheduled.')}
    ${section('Past meetings', past, 'No past meetings.')}
  `;
};

// End Meetings.


V.calendar = async el => {
  const [cases, hearings, tasks, events, holidays, meetings] = await Promise.all([
    call('list', 'cases'),
    call('list', 'hearings'),
    call('list', 'tasks'),
    call('list', 'events'),
    call('calendar:holidays:list'),
    call('meetings:list')
  ]);

  S.calendarData = {
    entries: calendarBuildEntries(
      cases, hearings, tasks, events, holidays, meetings
    ),
    holidays: Array.isArray(holidays) ? holidays : []
  };

  if (!S.calendarMonth) {
    S.calendarMonth = today().slice(0, 7);
  }

  if (!S.calendarSelectedDate) {
    S.calendarSelectedDate = today();
  }

  renderCalendarPage();
};

// End monthly calendar.

V.settings = async el => {
  const [name, appearance] = await Promise.all([
    call('set:get', 'name'),
    call('appearance:get')
  ]);

  S.profileName = name || '';
  S.appearance = appearance || {};

  const imageCard = (key, title, desc, fallback) => {
    const url = S.appearance[key] || '';

    return `<article class="appearance-card">
      <h3>${title}</h3>
      <p>${desc}</p>
      <div class="appearance-preview ${url ? 'has-image' : fallback}">
        ${url
          ? `<img src="${esc(url)}" alt="${title} preview">`
          : '<span>Tarikh default background</span>'}
      </div>
      <div class="appearance-card-actions">
        <button class="btn pri" data-a="chooseappearance" data-i="${key}">
          Choose image
        </button>
        ${url ? `<button class="btn" data-a="clearappearance" data-i="${key}">
          Use default
        </button>` : ''}
      </div>
    </article>`;
  };

  const photo = S.appearance.profile_picture || '';
  const initial = (name || 'T').trim().slice(0,1).toUpperCase() || 'T';

  el.innerHTML = `
    <div class="page-heading"><h1>Settings</h1></div>

    <section class="glass panel appearance-settings-panel">
      <h2>Your profile</h2>

      <div class="appearance-profile-row">
        <div class="appearance-avatar-preview">
          ${photo
            ? `<img src="${esc(photo)}" alt="Profile picture">`
            : `<span>${esc(initial)}</span>`}
        </div>

        <div class="appearance-profile-details">
          <label>Your name (shown on the dashboard)
            <input id="nm" value="${esc(name)}" autocomplete="name">
          </label>

          <div class="appearance-card-actions">
            <button class="btn" data-a="savename">Save name</button>
            <button class="btn pri"
              data-a="chooseappearance" data-i="profile_picture">
              Choose profile picture
            </button>
            ${photo
              ? '<button class="btn" data-a="clearappearance" data-i="profile_picture">Remove picture</button>'
              : ''}
          </div>

          <p class="sub">Without a custom picture, Tarikh displays your initial.</p>
        </div>
      </div>
    </section>

    <section class="glass panel appearance-settings-panel">
      <h2>Backgrounds</h2>
      <p class="sub">
        Set different images for light and dark mode.
        Use default restores the original courtroom background.
      </p>

      <div class="appearance-grid">
        ${imageCard(
          'background_light',
          'Light mode',
          'Background used in light mode.',
          'default-light'
        )}
        ${imageCard(
          'background_dark',
          'Dark mode',
          'Background used in dark mode.',
          'default-dark'
        )}
      </div>
    </section>
  `;
};

// ---------- actions (delegated, so the CSP can forbid inline scripts) ----------

// tarikhWorkspaceSettingsIntegration
// Keep workspace management within Settings, above personalization controls.
const tarikhOriginalSettingsRenderer = V.settings;

if (typeof tarikhOriginalSettingsRenderer !== 'function') {
  throw new Error('The original Settings renderer is unavailable.');
}

V.settings = async el => {
  const workspaces = await call('ws:list');

  await tarikhOriginalSettingsRenderer(el);

  const section = document.createElement('section');
  section.className = 'glass panel workspace-settings-section';

  section.innerHTML = `
    <div class="workspace-settings-heading">
      <div>
        <h2>Workspaces</h2>
        <p class="sub">
          Manage separate spaces for internships, advocates' chambers,
          independent practices, law firms and other professional work.
          Each workspace keeps its own records.
        </p>
      </div>

      <button type="button" class="btn pri" data-a="newws">
        + New workspace
      </button>
    </div>

    <div class="workspace-settings-list">
      ${workspaces.length
        ? workspaces.map(workspace => `
          <article class="workspace-settings-card">
            <div class="workspace-settings-card-main">
              <div class="workspace-settings-card-title">
                <h3>${esc(workspace.name || 'Untitled workspace')}</h3>
                ${workspace.active
                  ? '<span class="tag">Active</span>'
                  : ''}
              </div>

              <div class="workspace-settings-role">
                ${esc(workspace.type || 'Role not specified')}
              </div>

              <div class="workspace-settings-meta">
                ${[
                  workspace.supervisor,
                  workspace.joined ? 'From ' + formatDate(workspace.joined) : '',
                  workspace.leaving ? 'To ' + formatDate(workspace.leaving) : ''
                ].filter(Boolean).map(esc).join(' · ')}
              </div>
            </div>

            <div class="workspace-settings-actions">
              ${workspace.active
                ? '<span class="workspace-active-label">Currently active</span>'
                : `<button type="button" class="btn"
                     data-a="actws" data-i="${workspace.id}">
                     Switch to workspace
                   </button>`}

              <button type="button" class="btn"
                data-a="editws" data-i="${workspace.id}">
                Edit details
              </button>
              <button type="button" class="btn danger"
                data-a="deletews" data-i="${workspace.id}">
                Delete workspace
              </button>
            </div>
          </article>
        `).join('')
        : '<div class="empty">No workspaces created yet. Create your first workspace to get started.</div>'}
    </div>
  `;

  const profileAnchor = el.querySelector('#nm');
  const profilePanel = profileAnchor?.closest('.glass.panel')
    || profileAnchor?.closest('section');

  const backgroundAnchor = el.querySelector(
    '.appearance-preview.default-light, .appearance-preview.default-dark, .appearance-preview'
  );
  const backgroundPanel = backgroundAnchor?.closest('.glass.panel')
    || backgroundAnchor?.closest('section');

  if (
    !profilePanel ||
    !backgroundPanel ||
    profilePanel === backgroundPanel ||
    profilePanel.parentElement !== backgroundPanel.parentElement
  ) {
    throw new Error(
      'Could not safely reorder Settings: Profile and Background sections were not identified as separate sibling sections.'
    );
  }

  // Profile → Workspaces → Background → Calendar Data
  profilePanel.after(section);


  // tarikhCalendarDataSettings
  const calendarDataSection = document.createElement('section');
  calendarDataSection.className =
    'glass panel workspace-settings-section calendar-data-settings-section';

  calendarDataSection.innerHTML = `
    <div class="workspace-settings-heading">
      <div>
        <h2>Court Holiday Data</h2>
        <p class="sub">
          Import court holidays from a CSV file or download the CSV template
          with the required columns.
        </p>
      </div>
    </div>

    <div class="calendar-tools">
      <button type="button" class="btn pri" data-a="calimport">
        Import holiday list
      </button>
      <button type="button" class="btn" data-a="caltemplate">
        Download CSV template
      </button>
    </div>
  `;

  backgroundPanel.after(calendarDataSection);
  // Apple Calendar integration deferred on iPad; local holiday tools remain.


};


async function openNoteEditor(note = null, defaults = {}) {
  const cases = await call('list', 'cases');

  let hearingId = note
    ? (note.hearing_id || null)
    : (defaults.hearingId || null);

  let hearingRecord = null;

  if (hearingId) {
    const found = await call('list', 'hearings', { id: Number(hearingId) });
    hearingRecord = found[0] || null;
    if (!hearingRecord) hearingId = null;
  }

  const initialCaseId = note
    ? (note.case_id ?? hearingRecord?.case_id ?? '')
    : (defaults.caseId ?? hearingRecord?.case_id ?? '');

  const caseOptions = [
    `<option value="" ${initialCaseId === '' || initialCaseId === null ? 'selected' : ''}>
      General note — not linked to a case
    </option>`,
    ...cases.map(caseRecord => `
      <option value="${caseRecord.id}"
        ${Number(initialCaseId) === Number(caseRecord.id) ? 'selected' : ''}>
        ${esc(caseRecord.title)}
        ${caseRecord.number ? ' — ' + esc(caseRecord.number) : ''}
      </option>`)
  ].join('');

  const draftKey = editorDraftKey('note', note?.id
    ? `edit:${note.id}` : `new:${initialCaseId || 'general'}:${hearingId || ''}`);
  const modal = document.createElement('div');
  modal.className = 'modal';

  const hearingContext = hearingRecord
    ? `<p class="note-editor-context">
         Linked to hearing dated ${esc(formatDate(hearingRecord.date))}
         ${hearingRecord.purpose ? ' · ' + esc(hearingRecord.purpose) : ''}
       </p>`
    : '';

  modal.innerHTML = `
    <section class="glass box note-editor-box"
      role="dialog" aria-modal="true" aria-labelledby="note-editor-title">
      <div class="note-editor-heading">
        <div>
          <h2 id="note-editor-title">${note ? 'Edit note' : 'New note'}</h2>
          <p class="sub">Notes are stored within the current workspace.</p>
        </div>
      </div>

      <label>
        Note title
        <input type="text" data-note-title
          placeholder="Give this note a title"
          value="${esc(note?.title || '')}">
      </label>

      <label>
        Associate with
        <select data-note-case>${caseOptions}</select>
      </label>

      ${hearingContext}

      <label>
        Note content
        <textarea data-note-content rows="12"
          placeholder="Type your notes here...">${esc(note?.content || '')}</textarea>
      </label>

      <p class="note-editor-error" data-note-error hidden></p>

      <div class="form-actions note-editor-actions">
        <button type="button" class="btn" data-note-clear>Clear all</button>
        <button type="button" class="btn" data-note-cancel>Cancel</button>
        <button type="button" class="btn pri" data-note-save>
          Save note
        </button>
      </div>
    </section>`;

  document.body.appendChild(modal);

  return new Promise(resolve => {
    let finished = false;

    const titleInput = modal.querySelector('[data-note-title]');
    const caseSelect = modal.querySelector('[data-note-case]');
    const contentInput = modal.querySelector('[data-note-content]');
    const errorBox = modal.querySelector('[data-note-error]');
    const saveButton = modal.querySelector('[data-note-save]');
    const savedDraft = loadEditorDraft(draftKey);
    if (savedDraft) {
      titleInput.value = savedDraft.title ?? '';
      contentInput.value = savedDraft.content ?? '';
      if (savedDraft.caseId !== undefined &&
          [...caseSelect.options].some(option => option.value === String(savedDraft.caseId))) {
        caseSelect.value = String(savedDraft.caseId);
      }
    }
    const retainNoteDraft = () => saveEditorDraft(draftKey, {
      title: titleInput.value, content: contentInput.value, caseId: caseSelect.value
    });
    for (const input of [titleInput, contentInput, caseSelect]) {
      input.addEventListener('input', retainNoteDraft);
      input.addEventListener('change', retainNoteDraft);
    }
    modal.querySelector('[data-note-clear]').addEventListener('click', () => {
      if (!window.confirm('Clear the note title and content?')) return;
      titleInput.value = '';
      contentInput.value = '';
      caseSelect.value = String(initialCaseId ?? '');
      errorBox.hidden = true;
      retainNoteDraft();
      titleInput.focus();
    });

    function close(saved) {
      if (finished) return;
      finished = true;
      if (saved) forgetEditorDraft(draftKey);
      else retainNoteDraft();
      document.removeEventListener('keydown', onKeydown);
      modal.remove();
      resolve(saved);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') close(false);
    }

    document.addEventListener('keydown', onKeydown);

    modal.querySelector('[data-note-cancel]').addEventListener(
      'click', () => close(false)
    );

    modal.addEventListener('click', event => {
      if (event.target === modal) close(false);
    });

    saveButton.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      const content = contentInput.value;

      if (!title && !content.trim()) {
        errorBox.textContent = 'Enter a title or some note content.';
        errorBox.hidden = false;
        return;
      }

      const caseId = caseSelect.value ? Number(caseSelect.value) : null;

      const originalCaseId = initialCaseId === ''
        ? null
        : Number(initialCaseId);

      const retainedHearingId =
        hearingId && caseId !== null &&
        Number(caseId) === Number(originalCaseId)
          ? Number(hearingId)
          : null;

      const payload = {
        title,
        content,
        case_id: caseId,
        hearing_id: retainedHearingId
      };

      if (note?.id) payload.id = Number(note.id);

      saveButton.disabled = true;
      errorBox.hidden = true;

      try {
        await call('notes:save', payload);
        close(true);
      } catch (error) {
        errorBox.textContent = error.message || 'Unable to save the note.';
        errorBox.hidden = false;
        saveButton.disabled = false;
      }
    });

    titleInput.focus();
  });
}

async function refreshNotesOrigin() {
  if (S.view === 'case') {
    await go('case', { tab: 'notes' });
    return;
  }

  await go(S.view);
}

const A = {

  newnote: async context => {
    const value = String(context || '');
    const defaults = {};

    const caseMatch = /^case:(\d+)$/.exec(value);
    const hearingMatch = /^hearing:(\d+)$/.exec(value);

    if (caseMatch) {
      defaults.caseId = Number(caseMatch[1]);
    }

    if (hearingMatch) {
      const found = await call(
        'list',
        'hearings',
        { id: Number(hearingMatch[1]) }
      );

      const hearing = found[0];
      if (!hearing) throw new Error('The selected hearing no longer exists.');

      defaults.caseId = Number(hearing.case_id);
      defaults.hearingId = Number(hearing.id);
    }

    const saved = await openNoteEditor(null, defaults);
    if (saved) await refreshNotesOrigin();
  },

  togglenote: (_id, target) => {
    const card = target.closest('.note-card');
    const content = card?.querySelector('[data-note-content]');
    if (!content) return;

    const expanded = content.classList.toggle('is-expanded');
    content.classList.toggle('is-collapsed', !expanded);
    target.textContent = expanded ? 'Show less' : 'Read more';
  },

  togglecasegroup: (_id, target) => {
    const group = target.closest('.notes-case-group');
    if (!group) return;

    const collapsed = group.classList.toggle('is-collapsed');
    target.textContent = collapsed ? 'Expand' : 'Collapse';
    target.setAttribute('aria-expanded', String(!collapsed));
  },

  editnote: async id => {
    const notes = await call('notes:list');
    const note = notes.find(item => Number(item.id) === Number(id));
    if (!note) throw new Error('Note not found.');

    const saved = await openNoteEditor(note);
    if (saved) await refreshNotesOrigin();
  },

  deletenote: async id => {
    const notes = await call('notes:list');
    const note = notes.find(item => Number(item.id) === Number(id));
    if (!note) return;

    const confirmed = await confirmDestructiveAction({
      title: 'Delete note?',
      message: `Permanently delete “${note.title || 'Untitled note'}”?`,
      confirmLabel: 'Delete note'
    });

    if (!confirmed) return;

    await call('notes:delete', Number(id));
    await refreshNotesOrigin();
  },

  librarycase: i => {
    S.libraryCaseId = Number(i);
    S.libraryScope = null;
    go('library');
  },

  libraryback: () => {
    S.libraryCaseId = null;
    S.libraryScope = null;
    go('library');
  },

  libraryorphans: () => {
    S.libraryCaseId = null;
    S.libraryScope = 'unassigned';
    go('library');
  },

  libraryrefopen: async i => {
    S.libraryCaseId = null;
    S.libraryScope = 'reference';
    await go('library');
    await openDocumentInViewer(Number(i));
  },

  docupload: async i => {
    const target = String(i || '');
    const reference = target === 'reference';
    const match = /^case:(\d+)$/.exec(target);

    if (!reference && !match) {
      throw new Error('Invalid document upload destination.');
    }

    const added = await call('documents:upload', {
      reference,
      caseId: match ? Number(match[1]) : null
    });

    if (!added.length) return;

    if (reference && S.view === 'library') {
      S.libraryCaseId = null;
      S.libraryScope = 'reference';
    }

    if (S.view === 'case') {
      await go('case', { tab: 'documents' });
    } else {
      await go('library');
    }
  },

  docopen: i => openDocumentInViewer(Number(i)),

  doctab: i => {
    S.docActiveId = Number(i);
    renderDocumentViewer();
  },

  docclose: i => {
    const id = Number(i);
    const closing = (S.docTabs || []).find(d => Number(d.id) === id);
    if (closing) window.tarikhReleaseDocumentURL?.(id, closing.url);

    S.docTabs = (S.docTabs || []).filter(
      d => Number(d.id) !== id
    );

    if (Number(S.docActiveId) === id) {
      S.docActiveId = S.docTabs.length
        ? Number(S.docTabs[S.docTabs.length - 1].id)
        : null;
    }

    renderDocumentViewer();
  },

  docfullscreen: () => {
    document.body.classList.toggle('ipad-doc-full');
    renderDocumentViewer();
  },

  doccollapse: () => {
    S.docCollapsed = !S.docCollapsed;
    renderDocumentViewer();
  },

  docexternal: i => call('documents:open-external', Number(i)),

  docdelete: async i => {
    const doc = (S.docItems || []).find(
      d => Number(d.id) === Number(i)
    );

    if (!doc) return;

    if (!confirm(`Permanently delete "${doc.original_name}"?`)) return;

    await call('documents:delete', Number(i));

    S.docTabs = (S.docTabs || []).filter(
      d => Number(d.id) !== Number(i)
    );

    if (Number(S.docActiveId) === Number(i)) {
      S.docActiveId = S.docTabs.length
        ? Number(S.docTabs[S.docTabs.length - 1].id)
        : null;
    }

    if (S.view === 'case') {
      await go('case', { tab: 'documents' });
    } else {
      await go('library');
    }
  },


  go: i => { if (i === 'tasks') S.filter = 'all'; return go(i); }, mini: () => $('#shell').classList.toggle('mini'),
  theme: () => { const b = document.body; const d = b.classList.toggle('dark'); b.classList.toggle('light', !d); localStorage.theme = d ? 'dark' : 'light';
    applyAppearanceBackground(); },
  newcase: () => editCase(), editcase: i => editCase(Number(i)), opencase: i => go('case', { caseId: Number(i), tab: 'overview' }), tab: i => go('case', { tab: i }),
  delcase: async i => { if (confirm('Delete this case and all its hearings and entries?')) { await call('del', 'cases', Number(i)); go('cases'); } },
  newhearing: () => editHearing(null, S.view === 'case' ? S.caseId : null), hearing: i => editHearing(Number(i)),
  newevent: () => editEvent(S.caseId), event: async i => editEvent(S.caseId, Number(i), (await call('list', 'events', { id: Number(i) }))[0]),
  newtask: () => editTask(), task: i => editTask(Number(i)), filter: i => go('tasks', { filter: i }),
  done: async (i, el) => {
    // Remember the scroll position before updating the task.
    const shell = document.querySelector('#shell');
    const view = document.querySelector('#view');

    const shellScroll = shell?.scrollTop ?? 0;
    const viewScroll = view?.scrollTop ?? 0;
    const windowScroll = window.scrollY;
    const currentView = S.view;
    const checked = el.checked;

    try {
      const [task] = await call('list', 'tasks', {
        id: Number(i)
      });

      if (!task) return;

      await call('save', 'tasks', {
        id: task.id,
        done: checked ? 1 : 0
      });

      // Refresh the information without losing position.
      await go(currentView);

      if (currentView === 'dashboard') {
        requestAnimationFrame(() => {
          if (shell) shell.scrollTop = shellScroll;
          if (view) view.scrollTop = viewScroll;
          window.scrollTo(0, windowScroll);
        });
      }
    } catch (error) {
      if (el.isConnected) el.checked = !checked;
      throw error;
    }
  },
  deletetask: async i => {
    const [task] = await call('list', 'tasks', { id: Number(i) });
    if (!task) return;

    const confirmed = await confirmDestructiveAction({
      title: 'Delete task?',
      message: `Permanently delete “${task.title}”?`,
      confirmLabel: 'Delete task'
    });

    if (!confirmed) return;

    await call('del', 'tasks', Number(i));
    await go(S.view);
  },
  newws: () => form('New workspace', WS_F, {}, async o => { await call('ws:save', o); }),
  editws: async i => form('Edit workspace', WS_F, (await call('ws:list')).find(w => w.id == i), o => call('ws:save', { ...o, id: Number(i) })),
  deletews: async i => {
    const id = Number(i);

    const workspace = (await call('ws:list'))
      .find(w => Number(w.id) === id);

    if (!workspace) return;

    const info = await call('ws:delete-info', id);

    const confirmed = await confirmDestructiveAction({
      title: 'Delete workspace and all its data?',

      message: `This will permanently remove “${workspace.name}” and all its workspace files.`,

      details: [
        `${info.cases} cases`,
        `${info.hearings} hearings`,
        `${info.events} timeline entries`,
        `${info.tasks} tasks`,
        `${info.documents} stored documents`,
        `${info.backupCopies} backup copies`
      ],

      confirmLabel: 'Delete workspace',
      requireText: workspace.name
    });

    if (!confirmed) return;

    const result = await call('ws:delete', id);

    const message = result.active
      ? `“${result.deletedName}” and its data were deleted. “${result.active.name}” is now active.`
      : `“${result.deletedName}” and its data were deleted. Create a workspace to continue.`;

    if (result.cleanupPending) {
      alert(message + (result.cleanupPending ? ' Some staged files will be cleared on the next application launch.' : ''));
    } else {
      alert(message);
    }

    await go('settings');
  },
  actws: async i => { await call('ws:activate', Number(i)); go('dashboard'); },
  savename: async () => {
    const name = $('#nm').value.trim();
    await call('set:set', 'name', name);
    S.profileName = name;
    drawNav();
    alert('Saved.');
  },
  chooseappearance: async key => {
    const chosen = await call('appearance:choose', key);
    if (!chosen) return;
    S.appearance = await call('appearance:get');
    applyAppearanceBackground();
    await go('settings');
  },
  clearappearance: async key => {
    await call('appearance:clear', key);
    S.appearance = await call('appearance:get');
    applyAppearanceBackground();
    await go('settings');
  }
,


  calendarsyncnow: async () => {
    if (!confirm(
      'Synchronise all existing hearings, meetings and court holidays in this workspace to the selected Apple Calendar?'
    )) return;

    const result = await call('calendar:sync-all');

    alert(
      `Calendar sync finished.\n\n` +
      `Hearings and meetings: ${result.hearingsMeetingsSynced} synced, ${result.hearingsMeetingsFailed} failed, ${result.hearingsMeetingsRemaining} remaining.\n` +
      `Court holidays: ${result.holidaysSynced} synced, ${result.holidaysFailed} failed, ${result.holidaysRemaining} remaining.\n\n` +
      `Total: ${result.synced} synced, ${result.failed} failed, ${result.remaining} remaining.`
    );

    await go('settings');
  },

  removealltarikhcalendar: async () => {
    const preview = await call('calendar:remove-all-preview');

    if (!preview.total) {
      alert('There are no mapped Tarikh events in the currently active workspace.');
      return;
    }

    if (!confirm(
      `This will remove ${preview.total} Tarikh-created event(s) from the selected Apple Calendar.\n\n` +
      `Hearings and meetings: ${preview.hearingsMeetings}\n` +
      `Court holidays: ${preview.courtHolidays}\n\n` +
      `Only the currently active workspace will be affected.\n` +
      `Local Tarikh records and unrelated Apple Calendar events will remain untouched.\n\n` +
      `Continue?`
    )) return;

    const phrase = window.confirm(
      'FINAL CONFIRMATION\\n\\n' +
      'Press OK only if you have read the warning and wish to permanently remove all mapped Tarikh events from Apple Calendar.\\n\\n' +
      'Your local Tarikh records will remain untouched.'
    );

    if (!phrase) {
      alert('Removal cancelled. Nothing was deleted.');
      return;
    }

    const result = await call('calendar:remove-all');

    let message =
      `Calendar cleanup finished.\n\n` +
      `Hearings and meetings removed: ${result.eventsDeleted}\n` +
      `Court holidays removed: ${result.holidaysDeleted}\n` +
      `Total removed: ${result.totalDeleted}\n` +
      `Failed: ${result.failed}\n` +
      `Still mapped: ${result.remaining}\n\n` +
      `Local Tarikh records have not been deleted.`;

    if (result.errors && result.errors.length) {
      message += '\n\nErrors:\n' + result.errors.join('\n');
    }

    alert(message);
    await go('settings');
  },

  appleconnect: async () => {
    const email =
      document.getElementById('apple-calendar-email')?.value.trim() || '';

    const passwordInput =
      document.getElementById('apple-calendar-password');

    const password = passwordInput?.value || '';

    if (!email || !password) {
      alert('Enter your Apple Account email and app-specific password.');
      return;
    }

    if (passwordInput) passwordInput.value = '';

    const result = await call('apple:connect', email, password);

    alert(
      `Apple Calendar connected. ${result.calendars.length} calendar(s) found. The first calendar has been selected.`
    );

    await go('settings');
  },

  applesavecalendar: async () => {
    const href =
      document.getElementById('apple-calendar-select')?.value || '';

    if (!href) return;

    const result = await call('apple:select-calendar', href);

    alert(`Tarikh will use "${result.name}".`);

    await go('settings');
  },

  appledisconnect: async () => {
    if (!confirm(
      'Disconnect Apple Calendar from Tarikh? Your Tarikh cases, hearings, meetings and tasks will not be deleted.'
    )) return;

    await call('apple:disconnect');
    await go('settings');
  },

  calprev: () => calendarMoveMonth(-1),
  calnext: () => calendarMoveMonth(1),

  caltoday: () => {
    S.calendarMonth = today().slice(0, 7);
    S.calendarSelectedDate = today();
    renderCalendarPage();
  },

  calday: date => {
    S.calendarSelectedDate = calendarISO(date);
    renderCalendarPage();
  },

  calnewholiday: () => form(
    'Mark court holiday',
    [
      ['date', 'Date', 'date'],
      ['name', 'Holiday name (optional)'],
      ['notes', 'Notes', 'area']
    ],
    {
      date: S.calendarSelectedDate || today(),
      name: '',
      notes: ''
    },
    values => call(
      'calendar:holiday:save',
      values.date,
      values.name,
      values.notes
    )
  ),

  calimport: async () => {
    const result = await call('calendar:holidays:import');
    if (!result || result.cancelled) return;

    if (S.view === 'calendar') {
      await V.calendar($('#view'));
    }

    alert(
      `Holiday import complete.\n` +
      `Imported or updated: ${result.imported}\n` +
      `Skipped rows: ${result.skipped}`
    );
  },

  caltemplate: async () => {
    const result = await call('calendar:holidays:template');

    if (result && !result.cancelled) {
      alert('CSV template saved.');
    }
  },

  caldeleteholiday: async date => {
    if (!confirm(`Remove the court holiday on ${calendarDisplayDate(date)}?`)) {
      return;
    }

    await call('calendar:holiday:delete', date);
    await V.calendar($('#view'));
  },

  newmeeting: () => editMeeting(null, 'meetings'),

  editmeeting: i => editMeeting(Number(i), 'meetings'),

  deletemeeting: async i => {
    const rows = await call('meetings:list', { id: Number(i) });
    const meeting = rows[0];
    if (!meeting) return;

    if (!confirm(`Delete the meeting "${meeting.title}"?`)) return;

    await call('meetings:delete', Number(i));
    await go('meetings');
  },

  meetingjoin: i => call('meetings:open-link', Number(i)),



  calopen: async token => {
    const [kind, rawId] = String(token || '').split(':');
    const id = Number(rawId);

    if (kind === 'case' || kind === 'case-next') {
      return go('case', {
        caseId: id,
        tab: kind === 'case-next' ? 'hearings' : 'overview'
      });
    }

    if (kind === 'hearing') {
      const [hearing] = await call('list', 'hearings', { id });
      if (hearing) return editHearing(id, Number(hearing.case_id));
    }

    if (kind === 'meeting') {


      return editMeeting(id, 'calendar');


    }



    if (kind === 'task') {
      return editTask(id);
    }

    if (kind === 'event') {
      const [event] = await call('list', 'events', { id });
      if (event) {
        return editEvent(
          Number(event.case_id),
          Number(event.id),
          event
        );
      }
    }
  },

};
document.addEventListener('click', e => {
  const target = e.target instanceof Element ? e.target : null;
  const action = target?.closest('[data-a]');

  if (!action || !A[action.dataset.a]) return;

  Promise.resolve(A[action.dataset.a](action.dataset.i, target))
    .catch(error => {
      console.error(`Action "${action.dataset.a}" failed:`, error);

      if (error && !error.__lccReported) {
        alert(`Unable to complete this action: ${error.message || error}`);
      }
    });
});


document.addEventListener('change', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const isMonth = target.matches('[data-calendar-month]');
  const isYear = target.matches('[data-calendar-year]');

  if (!isMonth && !isYear) return;

  const [oldYear, oldMonth] = (
    S.calendarMonth || today().slice(0, 7)
  ).split('-').map(Number);

  const nextYear = isYear ? Number(target.value) : oldYear;
  const nextMonth = isMonth ? Number(target.value) : oldMonth;

  if (
    !Number.isInteger(nextYear) ||
    !Number.isInteger(nextMonth) ||
    nextMonth < 1 ||
    nextMonth > 12
  ) return;

  const selectedDay = Number(
    (S.calendarSelectedDate || today()).slice(-2)
  ) || 1;

  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  const safeDay = Math.min(selectedDay, lastDay);

  S.calendarMonth =
    `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

  S.calendarSelectedDate =
    `${S.calendarMonth}-${String(safeDay).padStart(2, '0')}`;

  renderCalendarPage();
});

document.addEventListener('input', event => {
  if (!event.target.matches('[data-doc-search]')) return;

  S.docSearch = event.target.value;

  const root = event.target.closest('[data-doc-viewer]');
  const list = root?.querySelector('.doc-nav');

  if (list) list.innerHTML = documentListMarkup();
});


document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('item')) e.target.click(); });
if (localStorage.theme === 'dark') { document.body.classList.replace('light', 'dark'); }
loadTarikhAppearance().finally(() => go('dashboard'));

document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('ipad-doc-full') && !document.querySelector('dialog[open]')) { document.body.classList.remove('ipad-doc-full'); renderDocumentViewer(); } });
