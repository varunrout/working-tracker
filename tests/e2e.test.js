import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { startServer } from '../src/server/index.js';

let server;
let baseUrl;

test('capture to search lifecycle', async (t) => {
  await rm(new URL('../data/store.json', import.meta.url), { force: true });
  server = await startServer(0);
  t.after(() => server.close());
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  const captureRes = await fetch(`${baseUrl}/api/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Today 16:30-17:00 prepare cost forecast slides; tag: @E.ON @nBS' })
  });
  assert.equal(captureRes.status, 201);
  const captureData = await captureRes.json();
  assert(captureData.created.length > 0);
  const itemId = captureData.created[0].item.id;

  const scheduleRes = await fetch(`${baseUrl}/api/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemIds: [itemId], calendarBusy: [] })
  });
  assert.equal(scheduleRes.status, 200);
  const searchRes = await fetch(`${baseUrl}/api/search?query=forecast`);
  const searchData = await searchRes.json();
  assert(searchData.results.some((item) => item.id === itemId));

  const reviewRes = await fetch(`${baseUrl}/api/review`);
  assert.equal(reviewRes.status, 200);
});
