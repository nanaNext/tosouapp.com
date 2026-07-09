/**
 * Password Policy Tests
 * Pure unit tests — no DB needed.
 */

const { validatePassword } = require('../../src/core/middleware/passwordPolicy');

describe('Password Policy', () => {
  describe('Valid passwords', () => {
    const validPasswords = [
      'Abc12345',
      'StrongPass1',
      'P@ssw0rd',
      'MySecret99',
      'Japanese1A',
      'LongPassword123WithManyChars',
    ];

    test.each(validPasswords)('"%s" should be valid', (pw) => {
      const result = validatePassword(pw);
      expect(result.valid).toBe(true);
      expect(result.message).toBe('');
    });
  });

  describe('Invalid passwords', () => {
    const cases = [
      ['short', 'Ab1', 'too short'],
      ['no uppercase', 'abcdefg1', 'missing uppercase'],
      ['no lowercase', 'ABCDEFG1', 'missing lowercase'],
      ['no number', 'Abcdefgh', 'missing number'],
      ['empty', '', 'empty string'],
      ['only numbers', '12345678', 'no letters'],
      ['7 chars valid mix', 'Abcde1f', 'too short (7)'],
      ['spaces only', '        ', 'no valid chars'],
    ];

    test.each(cases)('%s: "%s" should be invalid', (desc, pw) => {
      const result = validatePassword(pw);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8文字以上');
    });
  });

  describe('Edge cases', () => {
    it('should handle null', () => {
      const result = validatePassword(null);
      expect(result.valid).toBe(false);
    });

    it('should handle undefined', () => {
      const result = validatePassword(undefined);
      expect(result.valid).toBe(false);
    });

    it('should handle number input', () => {
      const result = validatePassword(12345678);
      expect(result.valid).toBe(false);
    });

    it('should accept exactly 8 chars', () => {
      const result = validatePassword('Abcdef1g');
      expect(result.valid).toBe(true);
    });
  });
});
