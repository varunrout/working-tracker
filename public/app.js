const tabs = Array.from(document.querySelectorAll('.tab'));
const views = Array.from(document.querySelectorAll('.view'));
const interpretationsEl = document.getElementById('interpretations');
const captureForm = document.getElementById('capture-form');
const captureInput = document.getElementById('capture-input');
const latencyLabel = document.getElementById('latency');
const nowNext = document.getElementById('now-next');
const agenda = document.getElementById('agenda');
const nudgesList = document.getElementById('nudges-list');
const timelineTimes = document.querySelector('.timeline-times');
const timelineColumns = Array.from(document.querySelectorAll('.timeline-column'));
const blendToggle = document.getElementById('blend-toggle');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const runReviewBtn = document.getElementById('run-review');
const reviewOutput = document.getElementById('review-output');
const refreshInsightsBtn = document.getElementById('refresh-insights');
const insightsOutput = document.getElementById('insights-output');
const voiceCapture = document.getElementById('voice-capture');

let state = { items: [], goals: [], reviews: [], habits: [] };
let timelineData = [];

function switchView(view) {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view));
  views.forEach((panel) => panel.classList.toggle('active', panel.dataset.view === view));
}

tabs.forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)));
blendToggle.addEventListener('change', () => renderTimeline());

document.body.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (!id) return;
  if (action === 'done') {
    await updateItem(id, { status: 'done' });
    await fetchState();
  } else if (action === 'snooze') {
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    const durationMs = item.start_at && item.end_at ? new Date(item.end_at).getTime() - new Date(item.start_at).getTime() : 30 * 60 * 1000;
    const start = item.start_at ? new Date(item.start_at) : new Date();
    start.setHours(start.getHours() + 1);
    const end = new Date(start.getTime() + durationMs);
    await updateItem(id, { start_at: start.toISOString(), end_at: end.toISOString() });
    await fetchState();
  }
});

async function fetchState() {
  const res = await fetch('/api/state');
  state = await res.json();
  renderToday();
  await refreshTimeline();
}

async function refreshTimeline() {
  const res = await fetch('/api/timeline');
  const data = await res.json();
  timelineData = data.items;
  renderTimeline();
}

function renderToday() {
  const active = state.items
    .filter((item) => item.status === 'active')
    .sort((a, b) => new Date(a.start_at || a.created_at) - new Date(b.start_at || b.created_at));

  const agendaItems = active.filter((item) => item.start_at);
  const nextItems = active.slice(0, 3);

  nowNext.innerHTML = '';
  nextItems.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `
      <strong>${item.title}</strong>
      <small>${formatTime(item.start_at)} • ${item.scope}</small>
      <div class="card-actions">
        <button data-action="done" data-id="${item.id}">Done</button>
        <button data-action="snooze" data-id="${item.id}">Snooze</button>
      </div>`;
    nowNext.appendChild(li);
  });

  agenda.innerHTML = '';
  agendaItems.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `
      <strong>${item.title}</strong>
      <small>${formatTimeRange(item.start_at, item.end_at)}</small>
      <small>${item.type} • ${item.scope}</small>`;
    agenda.appendChild(li);
  });

  renderNudges();
}

function renderNudges() {
  const overdue = state.items.filter((item) => item.due_at && new Date(item.due_at) < new Date() && item.status !== 'done');
  const nudges = [];
  if (overdue.length) {
    nudges.push({ title: 'Triage overdue items', detail: `${overdue.length} need reschedule` });
  }
  const unplanned = state.items.filter((item) => item.status === 'active' && !item.start_at);
  if (unplanned.length) {
    nudges.push({ title: 'Plan focus window', detail: `${unplanned[0].title}` });
  }
  const habitHighlights = state.habits.slice(0, 2).map((habit) => ({
    title: `Habit: ${habit.title}`,
    detail: habit.last_done_at ? `Last done ${timeAgo(habit.last_done_at)}` : 'Start today'
  }));
  nudges.push(...habitHighlights);
  nudgesList.innerHTML = '';
  nudges.slice(0, 3).forEach((nudge) => {
    const li = document.createElement('li');
    li.className = 'card';
    li.innerHTML = `<strong>${nudge.title}</strong><small>${nudge.detail}</small>`;
    nudgesList.appendChild(li);
  });
}

function renderTimeline() {
  timelineTimes.innerHTML = '';
  for (let hour = 6; hour <= 22; hour++) {
    const label = document.createElement('div');
    label.textContent = `${String(hour).padStart(2, '0')}:00`;
    timelineTimes.appendChild(label);
  }

  timelineColumns.forEach((col) => {
    col.innerHTML = '';
    col.style.display = blendToggle.checked ? 'none' : 'block';
  });

  let targets;
  if (blendToggle.checked) {
    const unifiedColumn = timelineColumns[0];
    unifiedColumn.style.display = 'block';
    unifiedColumn.setAttribute('aria-label', 'Unified timeline');
    targets = new Map([["all", unifiedColumn]]);
  } else {
    targets = new Map(timelineColumns.map((col) => [col.dataset.scope, col]));
  }

  timelineData.forEach((item) => {
    const scopeKey = blendToggle.checked ? 'all' : item.scope;
    const column = targets.get(scopeKey);
    if (!column) return;
    const card = document.createElement('div');
    card.className = 'timeline-card';
    card.dataset.id = item.id;
    card.dataset.scope = item.scope;
    card.dataset.status = item.status;
    card.dataset.startAt = item.start_at || '';
    card.dataset.endAt = item.end_at || '';
    card.style.top = `${computeTop(item.start_at)}px`;
    card.style.height = `${computeHeight(item.start_at, item.end_at)}px`;
    card.innerHTML = `
      <strong>${item.title}</strong>
      <small>${item.type}</small>
      <div class="card-actions">
        <button data-action="done" data-id="${item.id}">Done</button>
        <button data-action="snooze" data-id="${item.id}">Snooze</button>
      </div>`;
    enableDrag(card);
    column.appendChild(card);
  });
}

function computeTop(iso) {
  if (!iso) return 0;
  const date = new Date(iso);
  const minutes = date.getHours() * 60 + date.getMinutes();
  return Math.max(0, minutes - 6 * 60);
}

function computeHeight(start, end) {
  if (!start || !end) return 60;
  return Math.max(45, (new Date(end) - new Date(start)) / (1000 * 60));
}

function enableDrag(card) {
  let startY = 0;
  let initialTop = 0;
  card.addEventListener('pointerdown', (event) => {
    startY = event.clientY;
    initialTop = parseFloat(card.style.top);
    card.setPointerCapture(event.pointerId);
    card.style.cursor = 'grabbing';
  });
  card.addEventListener('pointermove', (event) => {
    if (!card.hasPointerCapture(event.pointerId)) return;
    const delta = event.clientY - startY;
    card.style.top = `${Math.max(0, initialTop + delta)}px`;
  });
  card.addEventListener('pointerup', async (event) => {
    if (!card.hasPointerCapture(event.pointerId)) return;
    card.releasePointerCapture(event.pointerId);
    card.style.cursor = 'grab';
    const offsetMinutes = Math.max(0, parseFloat(card.style.top));
    const totalMinutes = 6 * 60 + offsetMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    const base = card.dataset.startAt ? new Date(card.dataset.startAt) : new Date();
    base.setHours(hours, minutes, 0, 0);
    const durationMs = card.dataset.endAt && card.dataset.startAt
      ? new Date(card.dataset.endAt).getTime() - new Date(card.dataset.startAt).getTime()
      : 60 * 60 * 1000;
    const end = new Date(base.getTime() + durationMs);
    await updateItem(card.dataset.id, { start_at: base.toISOString(), end_at: end.toISOString() });
    await fetchState();
  });
}

function formatTime(iso) {
  if (!iso) return 'Unscheduled';
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeRange(start, end) {
  if (!start) return 'Unplanned';
  const startTime = new Date(start);
  const endTime = end ? new Date(end) : new Date(startTime.getTime() + 30 * 60 * 1000);
  return `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function timeAgo(date) {
  const diff = Math.round((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
  if (diff < 1) return 'just now';
  if (diff < 24) return `${diff}h ago`;
  return `${Math.round(diff / 24)}d ago`;
}

async function updateItem(id, payload) {
  await fetch(`/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

captureForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = captureInput.value.trim();
  if (!text) return;
  const started = performance.now();
  latencyLabel.textContent = 'Parsing…';
  const res = await fetch('/api/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  const data = await res.json();
  const latency = performance.now() - started;
  latencyLabel.textContent = `Structured in ${Math.round(latency)}ms`;
  renderInterpretations(data.created);
  captureInput.value = '';
  await fetchState();
});

function renderInterpretations(items) {
  interpretationsEl.innerHTML = '';
  items.forEach(({ item, alternatives }) => {
    const card = document.createElement('article');
    card.className = 'interpretation-card';
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <dl>
        <div><dt>Type</dt><dd>${item.type}</dd></div>
        <div><dt>Scope</dt><dd>${item.scope}</dd></div>
        <div><dt>When</dt><dd>${formatTimeRange(item.start_at, item.end_at)}</dd></div>
        <div><dt>Priority</dt><dd>${item.priority}</dd></div>
        <div><dt>Contexts</dt><dd>${(item.contexts || []).join(', ') || '—'}</dd></div>
      </dl>
      <details>
        <summary>Alternatives</summary>
        <ol>
          ${alternatives.map((alt) => `<li>${alt.type} • ${formatTimeRange(alt.start_at, alt.end_at)}</li>`).join('') || '<li>No alternatives</li>'}
        </ol>
      </details>`;
    interpretationsEl.appendChild(card);
  });
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;
  const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
  const data = await res.json();
  searchResults.innerHTML = '';
  data.results.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'search-result';
    div.innerHTML = `
      <strong>${item.title}</strong>
      <p>${item.description}</p>
      <small>${item.type} • ${item.scope} • ${formatTimeRange(item.start_at, item.end_at)}</small>`;
    searchResults.appendChild(div);
  });
});

runReviewBtn.addEventListener('click', async () => {
  const res = await fetch('/api/review');
  const review = await res.json();
  reviewOutput.innerHTML = `
    <article class="review-card">
      <h3>Summary</h3>
      <p>${review.summary}</p>
      <h4>Wins</h4>
      <ul>${review.wins.map((win) => `<li>${win.title}</li>`).join('')}</ul>
      <h4>Blockers</h4>
      <ul>${review.blockers.map((blocker) => `<li>${blocker.title} (due ${formatTime(blocker.due_at)})</li>`).join('')}</ul>
      <h4>Suggestions</h4>
      <ul>${review.suggestions.map((s) => `<li>${s.action} → ${s.id}</li>`).join('')}</ul>
    </article>`;
});

refreshInsightsBtn.addEventListener('click', async () => {
  const res = await fetch('/api/insights');
  const data = await res.json();
  insightsOutput.innerHTML = `
    <section class="card">
      <h3>Completion vs time of day</h3>
      <ul>${data.correlations.map((c) => `<li>${c.hour}: avg ${c.avg_duration.toFixed(1)} mins (n=${c.sample})</li>`).join('') || '<li>No data yet</li>'}</ul>
    </section>
    <section class="card">
      <h3>Habit streak risks</h3>
      <ul>${data.habitRisks.map((risk) => `<li>${risk.title}: ${risk.streak_risk ? 'at risk' : 'on track'}</li>`).join('') || '<li>No habits yet</li>'}</ul>
    </section>`;
});

voiceCapture.addEventListener('click', () => {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Voice capture uses the Web Speech API and is not supported in this browser.');
    return;
  }
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.start();
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map((result) => result[0].transcript).join(' ');
    captureInput.value = transcript;
  };
});

fetchState();
