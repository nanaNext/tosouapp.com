/**
 * Input Sanitization Tests
 * Pure unit tests — no DB needed.
 */

const { stripDangerous, escapeHtml, sanitizeValue } = require('../../src/core/middleware/sanitize');

describe('Input Sanitization', () => {
  describe('stripDangerous', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      expect(stripDangerous(input)).toBe('Hello  World');
    });

    it('should remove on* event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      expect(stripDangerous(input)).not.toContain('onerror');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      expect(stripDangerous(input)).not.toContain('javascript:');
    });

    it('should keep normal text', () => {
      const input = '田中太郎 tanaka@test.com 2026-07-01';
      expect(stripDangerous(input)).toBe(input);
    });

    it('should keep normal HTML', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      expect(stripDangerous(input)).toBe(input);
    });
  });

  describe('escapeHtml', () => {
    it('should escape < and >', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    it('should escape ampersand', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });
  });

  describe('sanitizeValue', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: '<script>xss</script>田中',
        address: { city: 'Tokyo<script>bad</script>' }
      };
      const result = sanitizeValue(input);
      expect(result.name).toBe('田中');
      expect(result.address.city).toBe('Tokyo');
    });

    it('should sanitize arrays', () => {
      const input = ['normal', '<script>xss</script>bad'];
      const result = sanitizeValue(input);
      expect(result[0]).toBe('normal');
      expect(result[1]).toBe('bad');
    });

    it('should preserve numbers and booleans', () => {
      expect(sanitizeValue(123)).toBe(123);
      expect(sanitizeValue(true)).toBe(true);
      expect(sanitizeValue(null)).toBe(null);
    });

    it('should trim whitespace', () => {
      expect(sanitizeValue('  hello  ')).toBe('hello');
    });
  });
});
