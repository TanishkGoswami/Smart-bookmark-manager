import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LEGACY_THEME,
  compileThemeVariables,
  getContrastRatio,
  migrateTheme,
  styleSettingsToTheme,
  validateTheme,
} from './themeCore.js';

test('migrates partial themes onto the legacy schema', () => {
  const theme = migrateTheme({ id: 'custom', colors: { primary: '#123456' } });
  assert.equal(theme.version, 1);
  assert.equal(theme.colors.primary, '#123456');
  assert.equal(theme.effects.boardOpacity, LEGACY_THEME.effects.boardOpacity);
});

test('rejects unsafe color values', () => {
  const result = validateTheme({ ...LEGACY_THEME, colors: { ...LEGACY_THEME.colors, primary: 'url(javascript:alert(1))' } });
  assert.equal(result.ok, false);
});

test('generates semantic css variables', () => {
  const vars = compileThemeVariables(LEGACY_THEME);
  assert.equal(vars['--color-primary'], LEGACY_THEME.colors.primary);
  assert.equal(vars['--radius-card'], '10px');
});

test('converts old style settings into a valid theme', () => {
  const theme = styleSettingsToTheme({ primaryColor: '#ffffff', boardColor: '#000000', boardOpacity: 120, boardBlur: -1, isDarkBg: false });
  assert.equal(theme.mode, 'light');
  assert.equal(theme.effects.boardOpacity, 100);
  assert.equal(theme.effects.boardBlur, 0);
});

test('calculates accessible contrast ratios', () => {
  assert.equal(getContrastRatio('#000000', '#ffffff'), 21);
});
