import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInput } from '../src/shared/parser.js';

test('parseInput structures a simple task', () => {
  const { interpretations } = parseInput('Apply for Senior Data Engineer by Fri 17:00; prep CV + cover; 2h');
  assert.equal(interpretations.length, 1);
  const { primary } = interpretations[0];
  assert.equal(primary.type, 'task');
  assert.equal(primary.scope, 'work');
  assert(primary.due_at?.includes('T'), 'due date should be iso');
  assert(primary.duration_est.startsWith('PT'), 'duration should be ISO 8601');
});

test('parseInput detects habits', () => {
  const { interpretations } = parseInput('Gym 45m repeat Mon Wed Fri 7am');
  const { primary } = interpretations[0];
  assert.equal(primary.type, 'habit');
  assert(primary.recurrence);
  assert(primary.recurrence.byweekday.includes('monday'));
  assert.equal(primary.scope, 'personal');
});
