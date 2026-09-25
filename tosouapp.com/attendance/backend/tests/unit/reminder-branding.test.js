'use strict';

const branding = require('../../src/services/reminderBranding');

describe('reminderBranding', () => {
  test('only Iizuka (tenant 1) gets the official LINE contact', () => {
    expect(branding.contactBlock(1).text).toContain('lin.ee');
    expect(branding.contactBlock(1).html).toContain('lin.ee');
    for (const tid of [2, 3, 4, null]) {
      expect(branding.contactBlock(tid).text).not.toContain('lin.ee');
      expect(branding.contactBlock(tid).html).not.toContain('lin.ee');
    }
  });

  test('company name follows the recipient tenant', () => {
    const names = new Map([[1, '飯塚塗研株式会社'], [2, '株式会社山口工業']]);
    expect(branding.companyName(names, 2)).toBe('株式会社山口工業');
    expect(branding.companyName(names, '1')).toBe('飯塚塗研株式会社');
  });
});

describe('senderWithName', () => {
  const load = (mailFrom) => {
    jest.resetModules();
    jest.doMock('../../src/config/env', () => ({ mailFrom }));
    return require('../../src/core/notifications/email.service').senderWithName;
  };

  test.each([
    ['"飯塚塗研株式会社" <noreply@tosouapp.com>'],
    ['飯塚塗研株式会社 noreply@tosouapp.com'],
    ['noreply@tosouapp.com'],
  ])('keeps the verified address, swaps display name (%s)', (mailFrom) => {
    expect(load(mailFrom)('株式会社山口工業')).toBe('"株式会社山口工業" <noreply@tosouapp.com>');
  });

  test('strips characters that could break the header', () => {
    expect(load('noreply@tosouapp.com')('A"B\r\n<x>')).toBe('"ABx" <noreply@tosouapp.com>');
  });
});
