/**
 * Password Policy Middleware
 * Enforce: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number.
 * Used across: user creation, password change, password reset.
 */

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const PASSWORD_ERROR_MESSAGE = 'パスワードは8文字以上で、大文字・小文字・数字を含めてください。';

/**
 * Validate password strength
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
function validatePassword(password) {
  const p = String(password || '');
  if (p.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: PASSWORD_ERROR_MESSAGE };
  }
  if (!PASSWORD_REGEX.test(p)) {
    return { valid: false, message: PASSWORD_ERROR_MESSAGE };
  }
  return { valid: true, message: '' };
}

/**
 * Express middleware: validate req.body.password or req.body.newPassword
 */
function enforcePasswordPolicy(fieldName = 'password') {
  return (req, res, next) => {
    const password = req.body?.[fieldName];
    if (!password) return next(); // Let other validators handle "required"
    const { valid, message } = validatePassword(password);
    if (!valid) {
      return res.status(400).json({ message });
    }
    next();
  };
}

module.exports = { validatePassword, enforcePasswordPolicy, PASSWORD_MIN_LENGTH, PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE };
