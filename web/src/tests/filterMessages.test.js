import { getReceiverMessages } from '../libs/filterMessages';

// ─────────────────────────────────────────────────────────────────
// اختبارات تصفية الرسائل — filterMessages
// ─────────────────────────────────────────────────────────────────

const USER_A = 'user-a-id';
const USER_B = 'user-b-id';
const USER_C = 'user-c-id';

const messages = [
  { _id: 'm1', sender: USER_A, recipient: USER_B, content: 'Hello B', seen: false },
  { _id: 'm2', sender: USER_B, recipient: USER_A, content: 'Hi A', seen: true },
  { _id: 'm3', sender: USER_A, recipient: USER_C, content: 'Hello C', seen: false },
  { _id: 'm4', sender: USER_C, recipient: USER_A, content: 'Hey A', seen: true },
  { _id: 'm5', sender: USER_B, recipient: USER_C, content: 'Hi C', seen: false },
];

describe('getReceiverMessages — تصفية الرسائل بين مستخدمين', () => {
  it('يجب أن تعيد الرسائل بين المستخدم A والمستخدم B فقط', () => {
    const result = getReceiverMessages(messages, USER_B, USER_A);
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe('m1');
    expect(result[1]._id).toBe('m2');
  });

  it('يجب أن تعيد الرسائل بين المستخدم A والمستخدم C فقط', () => {
    const result = getReceiverMessages(messages, USER_C, USER_A);
    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe('m3');
    expect(result[1]._id).toBe('m4');
  });

  it('يجب أن تعيد الرسائل بين المستخدم B والمستخدم C', () => {
    const result = getReceiverMessages(messages, USER_C, USER_B);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('m5');
  });

  it('يجب أن تعيد مصفوفة فارغة عندما لا توجد رسائل', () => {
    const result = getReceiverMessages(messages, 'unknown-id', USER_A);
    expect(result).toHaveLength(0);
  });

  it('يجب أن تعيد مصفوفة فارغة عندما تكون المصفوفة فارغة', () => {
    const result = getReceiverMessages([], USER_B, USER_A);
    expect(result).toHaveLength(0);
  });

  it('يجب أن تعمل بغض النظر عن ترتيب المعاملات', () => {
    const resultAB = getReceiverMessages(messages, USER_B, USER_A);
    const resultBA = getReceiverMessages(messages, USER_A, USER_B);
    expect(resultAB).toEqual(resultBA);
  });

  it('يجب أن لا تشمل رسائل بين أطراف أخرى', () => {
    const result = getReceiverMessages(messages, USER_B, USER_A);
    result.forEach((msg) => {
      const involves_A = msg.sender === USER_A || msg.recipient === USER_A;
      const involves_B = msg.sender === USER_B || msg.recipient === USER_B;
      expect(involves_A && involves_B).toBe(true);
    });
  });
});
