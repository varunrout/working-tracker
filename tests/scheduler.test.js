import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleItems } from '../src/shared/scheduler.js';

test('scheduleItems finds slot around busy blocks', () => {
  const items = [
    {
      id: '1',
      title: 'Deep work block',
      scope: 'work',
      duration_est: 'PT120M'
    }
  ];
  const calendarBusy = [
    { start: new Date().toISOString(), end: new Date(Date.now() + 60 * 60 * 1000).toISOString() }
  ];
  const { scheduled, conflicts } = scheduleItems({ items, calendarBusy, date: new Date(), scope: 'work' });
  assert.equal(conflicts.length, 0);
  assert.equal(scheduled.length, 1);
  assert(scheduled[0].start_at, 'start_at should be set');
  assert(scheduled[0].end_at, 'end_at should be set');
  assert.equal(scheduled[0].status, 'active');
});

test('scheduleItems suggests alternatives when no slot available', () => {
  const items = [
    { id: '2', title: 'Long workshop', scope: 'work', duration_est: 'PT240M' }
  ];
  const calendarBusy = [
    (() => { const start = new Date(); start.setHours(9, 0, 0, 0); const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); return { start: start.toISOString(), end: end.toISOString() }; })(),
    (() => { const start = new Date(); start.setHours(13, 0, 0, 0); const end = new Date(start.getTime() + 4.5 * 60 * 60 * 1000); return { start: start.toISOString(), end: end.toISOString() }; })()
  ];
  const { conflicts } = scheduleItems({ items, calendarBusy, scope: 'work' });
  assert.equal(conflicts.length, 1);
  assert(conflicts[0].alternatives.length > 0);
});
