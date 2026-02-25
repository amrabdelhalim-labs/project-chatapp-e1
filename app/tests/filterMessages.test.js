// ─────────────────────────────────────────────────────────────────
// اختبارات وحدة لدالة تصفية الرسائل (filterMessages.js)
// يختبر: تصفية الرسائل بين مستخدمين (ثنائي الاتجاه)
// يتكامل مع: لا شيء — دالة نقية
// ─────────────────────────────────────────────────────────────────

import { getReceiverMessages } from '../libs/filterMessages';

const USER_A = 'user-a';
const USER_B = 'user-b';
const USER_C = 'user-c';

const messages = [
  { _id: 'm1', sender: USER_A, recipient: USER_B, content: 'مرحباً' },
  { _id: 'm2', sender: USER_B, recipient: USER_A, content: 'أهلاً' },
  { _id: 'm3', sender: USER_A, recipient: USER_C, content: 'كيف حالك' },
  { _id: 'm4', sender: USER_C, recipient: USER_A, content: 'بخير' },
  { _id: 'm5', sender: USER_B, recipient: USER_C, content: 'مسا الخير' },
];

// ═══════════════════════════════════════════════════════════════
// getReceiverMessages — تصفية الرسائل بين مستخدمين
// ═══════════════════════════════════════════════════════════════

describe('getReceiverMessages — تصفية الرسائل بين مستخدمين', () => {
  it('يجب أن تُرجع الرسائل بين المستخدم A و B فقط', () => {
    const result = getReceiverMessages(messages, USER_B, USER_A);
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe('m1');
    expect(result[1]._id).toBe('m2');
  });

  it('يجب أن تعمل في كلا الاتجاهين (A→B و B→A)', () => {
    const fromA = getReceiverMessages(messages, USER_B, USER_A);
    const fromB = getReceiverMessages(messages, USER_A, USER_B);
    expect(fromA).toEqual(fromB);
  });

  it('يجب أن تُرجع الرسائل بين A و C فقط', () => {
    const result = getReceiverMessages(messages, USER_C, USER_A);
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe('m3');
    expect(result[1]._id).toBe('m4');
  });

  it('يجب أن لا تشمل رسائل أطراف أخرى', () => {
    const result = getReceiverMessages(messages, USER_B, USER_A);
    const ids = result.map((m) => m._id);
    expect(ids).not.toContain('m3');
    expect(ids).not.toContain('m4');
    expect(ids).not.toContain('m5');
  });

  it('يجب أن تُرجع مصفوفة فارغة إذا لم تكن هناك رسائل مطابقة', () => {
    const result = getReceiverMessages(messages, 'non-existent', USER_A);
    expect(result).toHaveLength(0);
  });

  it('يجب أن تُرجع مصفوفة فارغة إذا كانت قائمة الرسائل فارغة', () => {
    const result = getReceiverMessages([], USER_B, USER_A);
    expect(result).toHaveLength(0);
  });

  it('يجب أن تُرجع رسالة واحدة لمحادثة B↔C', () => {
    const result = getReceiverMessages(messages, USER_C, USER_B);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('m5');
  });
});
