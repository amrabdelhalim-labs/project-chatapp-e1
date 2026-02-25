// ─────────────────────────────────────────────────────────────────
// Unit tests for the message filter function (filterMessages.js)
// Tests: bidirectional message filtering between two users
// Integration: none — pure function
// ─────────────────────────────────────────────────────────────────

import { getReceiverMessages } from '../libs/filterMessages';

const USER_A = 'user-a';
const USER_B = 'user-b';
const USER_C = 'user-c';

const messages = [
  { _id: 'm1', sender: USER_A, recipient: USER_B, content: 'Hello' },
  { _id: 'm2', sender: USER_B, recipient: USER_A, content: 'Hi there' },
  { _id: 'm3', sender: USER_A, recipient: USER_C, content: 'How are you?' },
  { _id: 'm4', sender: USER_C, recipient: USER_A, content: 'All good' },
  { _id: 'm5', sender: USER_B, recipient: USER_C, content: 'Good evening' },
];

// ═══════════════════════════════════════════════════════════════
// getReceiverMessages — filter messages between two users
// ═══════════════════════════════════════════════════════════════

describe('getReceiverMessages — filter messages between two users', () => {
  it('should return only messages between user A and B', () => {
    const result = getReceiverMessages(messages, USER_B, USER_A);
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe('m1');
    expect(result[1]._id).toBe('m2');
  });

  it('should be symmetric (A→B equals B→A)', () => {
    const fromA = getReceiverMessages(messages, USER_B, USER_A);
    const fromB = getReceiverMessages(messages, USER_A, USER_B);
    expect(fromA).toEqual(fromB);
  });

  it('should return only messages between A and C', () => {
    const result = getReceiverMessages(messages, USER_C, USER_A);
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe('m3');
    expect(result[1]._id).toBe('m4');
  });

  it('should not include messages involving other parties', () => {
    const result = getReceiverMessages(messages, USER_B, USER_A);
    const ids = result.map((m) => m._id);
    expect(ids).not.toContain('m3');
    expect(ids).not.toContain('m4');
    expect(ids).not.toContain('m5');
  });

  it('should return an empty array when there are no matching messages', () => {
    const result = getReceiverMessages(messages, 'non-existent', USER_A);
    expect(result).toHaveLength(0);
  });

  it('should return an empty array when the message list is empty', () => {
    const result = getReceiverMessages([], USER_B, USER_A);
    expect(result).toHaveLength(0);
  });

  it('should return a single message for the B↔C conversation', () => {
    const result = getReceiverMessages(messages, USER_C, USER_B);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('m5');
  });
});
