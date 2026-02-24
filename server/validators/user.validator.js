/**
 * User input validators — error accumulation pattern.
 * Collects all validation errors and throws once.
 */

/**
 * Validate registration input.
 * @param {{ firstName?: string, lastName?: string, email?: string, password?: string, confirmPassword?: string }} input
 * @throws {Error} with accumulated Arabic error messages
 */
export function validateRegisterInput(input) {
  const errors = [];

  if (!input.firstName?.trim()) {
    errors.push('الاسم الأول مطلوب');
  } else if (input.firstName.trim().length < 2) {
    errors.push('الاسم الأول يجب أن يكون حرفين على الأقل');
  }

  if (!input.lastName?.trim()) {
    errors.push('الاسم الأخير مطلوب');
  } else if (input.lastName.trim().length < 2) {
    errors.push('الاسم الأخير يجب أن يكون حرفين على الأقل');
  }

  if (!input.email?.trim()) {
    errors.push('البريد الإلكتروني مطلوب');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push('صيغة البريد الإلكتروني غير صالحة');
  }

  if (!input.password) {
    errors.push('كلمة المرور مطلوبة');
  } else if (input.password.length < 6) {
    errors.push('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  }

  if (input.password && input.confirmPassword !== input.password) {
    errors.push('كلمة المرور وتأكيدها غير متطابقتين');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join('، '));
    error.statusCode = 400;
    throw error;
  }
}

/**
 * Validate login input.
 * @param {{ email?: string, password?: string }} input
 * @throws {Error}
 */
export function validateLoginInput(input) {
  const errors = [];

  if (!input.email?.trim()) {
    errors.push('البريد الإلكتروني مطلوب');
  }

  if (!input.password) {
    errors.push('كلمة المرور مطلوبة');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join('، '));
    error.statusCode = 400;
    throw error;
  }
}

/**
 * Validate profile update input (partial — only validates provided fields).
 * @param {{ firstName?: string, lastName?: string, status?: string }} input
 * @throws {Error}
 */
export function validateUpdateUserInput(input) {
  const errors = [];

  if (input.firstName !== undefined) {
    if (!input.firstName.trim()) {
      errors.push('الاسم الأول لا يمكن أن يكون فارغاً');
    } else if (input.firstName.trim().length < 2) {
      errors.push('الاسم الأول يجب أن يكون حرفين على الأقل');
    }
  }

  if (input.lastName !== undefined) {
    if (!input.lastName.trim()) {
      errors.push('الاسم الأخير لا يمكن أن يكون فارغاً');
    } else if (input.lastName.trim().length < 2) {
      errors.push('الاسم الأخير يجب أن يكون حرفين على الأقل');
    }
  }

  if (input.status !== undefined && input.status.length > 100) {
    errors.push('الحالة يجب ألا تتجاوز 100 حرف');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join('، '));
    error.statusCode = 400;
    throw error;
  }
}
