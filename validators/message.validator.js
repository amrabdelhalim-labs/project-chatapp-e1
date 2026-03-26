/**
 * Message input validators — error accumulation pattern.
 */

/**
 * Validate message creation input.
 * @param {{ receiverId?: string, content?: string }} input
 * @throws {Error}
 */
export function validateMessageInput(input) {
  const errors = [];

  if (!input.receiverId?.trim()) {
    errors.push('معرّف المستقبل مطلوب');
  }

  if (!input.content || !input.content.trim()) {
    errors.push('محتوى الرسالة مطلوب');
  } else if (input.content.length > 500) {
    errors.push('محتوى الرسالة يجب ألا يتجاوز 500 حرف');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join('، '));
    error.statusCode = 400;
    throw error;
  }
}
