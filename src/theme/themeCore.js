export const CURRENT_THEME_VERSION = 1;

export const LEGACY_THEME_ID = 'legacy-glass';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const LEGACY_THEME = {
  id: LEGACY_THEME_ID,
  name: 'Legacy Glass',
  version: CURRENT_THEME_VERSION,
  mode: 'dark',
  colors: {
    primary: '#8a2b34',
    background: '#111111',
    surface: '#a18b8c',
    surfaceElevated: '#2a2c31',
    textPrimary: '#f8f9fa',
    textSecondary: '#94a3b8',
    border: '#ffffff',
    focus: '#8a2b34',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#dc2626',
  },
  background: {
    type: 'image',
    gradient: 'linear-gradient(135deg, #111111 0%, #2a2c31 100%)',
    image: null,
  },
  layout: {
    density: 'comfortable',
    boardAlignment: 'start',
    compactMode: false,
    cardRadius: 10,
    cardPadding: 14,
  },
  cards: {
    preset: 'glass',
    showDescriptions: false,
    shortenLongTitles: true,
    hideExtraBookmarks: false,
  },
  effects: {
    boardOpacity: 85,
    boardBlur: 24,
    motion: 'medium',
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    strongFocus: false,
  },
};

export const THEME_PRESETS = [
  LEGACY_THEME,
  {
    ...LEGACY_THEME,
    id: 'mono-dot',
    name: 'Mono Dot',
    mode: 'light',
    colors: {
      ...LEGACY_THEME.colors,
      primary: '#111827',
      background: '#f8fafc',
      surface: '#ffffff',
      surfaceElevated: '#f1f5f9',
      textPrimary: '#111827',
      textSecondary: '#475569',
      border: '#cbd5e1',
      focus: '#111827',
    },
    background: {
      type: 'pattern',
      gradient: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,.18) 1px, transparent 0)',
      image: null,
    },
    effects: { boardOpacity: 94, boardBlur: 0, motion: 'low' },
  },
  {
    ...LEGACY_THEME,
    id: 'pure-minimal',
    name: 'Pure Minimal',
    mode: 'light',
    colors: {
      ...LEGACY_THEME.colors,
      primary: '#2563eb',
      background: '#f7f8fb',
      surface: '#ffffff',
      surfaceElevated: '#eef2ff',
      textPrimary: '#172033',
      textSecondary: '#53627a',
      border: '#d9e0eb',
      focus: '#2563eb',
    },
    background: { type: 'solid', gradient: 'linear-gradient(180deg, #f7f8fb 0%, #eef2ff 100%)', image: null },
    effects: { boardOpacity: 96, boardBlur: 0, motion: 'low' },
  },
  {
    ...LEGACY_THEME,
    id: 'amoled-night',
    name: 'AMOLED Night',
    mode: 'dark',
    colors: {
      ...LEGACY_THEME.colors,
      primary: '#22c55e',
      background: '#000000',
      surface: '#0a0a0a',
      surfaceElevated: '#111111',
      textPrimary: '#f8fafc',
      textSecondary: '#a1a1aa',
      border: '#27272a',
      focus: '#22c55e',
    },
    background: { type: 'solid', gradient: 'linear-gradient(180deg, #000000 0%, #09090b 100%)', image: null },
    effects: { boardOpacity: 92, boardBlur: 0, motion: 'low' },
  },
  {
    ...LEGACY_THEME,
    id: 'executive',
    name: 'Executive',
    mode: 'dark',
    colors: {
      ...LEGACY_THEME.colors,
      primary: '#2dd4bf',
      background: '#101418',
      surface: '#1d242b',
      surfaceElevated: '#26313a',
      textPrimary: '#f8fafc',
      textSecondary: '#a7b4c3',
      border: '#3b4652',
      focus: '#2dd4bf',
    },
    background: { type: 'gradient', gradient: 'linear-gradient(135deg, #101418 0%, #1d242b 55%, #0f766e 100%)', image: null },
    effects: { boardOpacity: 90, boardBlur: 10, motion: 'medium' },
  },
  {
    ...LEGACY_THEME,
    id: 'soft-pastel',
    name: 'Soft Pastel',
    mode: 'light',
    colors: {
      ...LEGACY_THEME.colors,
      primary: '#db2777',
      background: '#fff7ed',
      surface: '#fff1f2',
      surfaceElevated: '#fdf2f8',
      textPrimary: '#312e3f',
      textSecondary: '#725e73',
      border: '#f9c8d5',
      focus: '#db2777',
    },
    background: { type: 'gradient', gradient: 'linear-gradient(135deg, #fff7ed 0%, #fdf2f8 45%, #e0f2fe 100%)', image: null },
    effects: { boardOpacity: 90, boardBlur: 8, motion: 'medium' },
  },
];

const presetById = new Map(THEME_PRESETS.map(theme => [theme.id, theme]));

export function cloneTheme(theme) {
  return JSON.parse(JSON.stringify(theme));
}

export function isHexColor(value) {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

export function migrateTheme(theme) {
  if (!theme || typeof theme !== 'object') return cloneTheme(LEGACY_THEME);
  const base = presetById.get(theme.id) || LEGACY_THEME;
  return {
    ...cloneTheme(base),
    ...theme,
    version: CURRENT_THEME_VERSION,
    colors: { ...base.colors, ...(theme.colors || {}) },
    background: { ...base.background, ...(theme.background || {}) },
    layout: { ...base.layout, ...(theme.layout || {}) },
    cards: { ...base.cards, ...(theme.cards || {}) },
    effects: { ...base.effects, ...(theme.effects || {}) },
    accessibility: { ...base.accessibility, ...(theme.accessibility || {}) },
  };
}

export function validateTheme(theme) {
  const next = migrateTheme(theme);
  const requiredColors = ['primary', 'background', 'surface', 'textPrimary', 'textSecondary', 'border', 'focus'];
  for (const key of requiredColors) {
    if (!isHexColor(next.colors[key])) {
      return { ok: false, error: `${key} must be a HEX color.` };
    }
  }
  if (!['light', 'dark', 'system'].includes(next.mode)) {
    return { ok: false, error: 'Theme mode is invalid.' };
  }
  if (!['solid', 'gradient', 'pattern', 'image'].includes(next.background.type)) {
    return { ok: false, error: 'Background type is invalid.' };
  }
  if (!['off', 'low', 'medium', 'high'].includes(next.effects.motion)) {
    return { ok: false, error: 'Motion level is invalid.' };
  }
  return { ok: true, theme: next };
}

export function compileThemeVariables(theme) {
  const { theme: next } = validateTheme(theme).ok ? validateTheme(theme) : { theme: LEGACY_THEME };
  return {
    '--color-primary': next.colors.primary,
    '--color-background': next.colors.background,
    '--color-surface': next.colors.surface,
    '--color-surface-elevated': next.colors.surfaceElevated,
    '--color-text-primary': next.colors.textPrimary,
    '--color-text-secondary': next.colors.textSecondary,
    '--color-border': next.colors.border,
    '--color-focus': next.colors.focus,
    '--color-success': next.colors.success,
    '--color-warning': next.colors.warning,
    '--color-danger': next.colors.danger,
    '--radius-card': `${next.layout.cardRadius}px`,
    '--card-padding': `${next.layout.cardPadding}px`,
    '--transition-duration': next.accessibility.reducedMotion || next.effects.motion === 'off' ? '0ms' : '180ms',
    '--bookmark-background': next.background.gradient,
  };
}

export function themeToStyleSettings(theme) {
  const next = migrateTheme(theme);
  return {
    primaryColor: next.colors.primary,
    boardColor: next.colors.surface,
    boardOpacity: next.effects.boardOpacity,
    boardBlur: next.accessibility.disableBlur ? 0 : next.effects.boardBlur,
    isDarkBg: next.mode === 'dark',
  };
}

export function styleSettingsToTheme(styleSettings, sourceTheme = LEGACY_THEME) {
  const next = migrateTheme(sourceTheme);
  return migrateTheme({
    ...next,
    colors: {
      ...next.colors,
      primary: isHexColor(styleSettings.primaryColor) ? styleSettings.primaryColor : next.colors.primary,
      surface: isHexColor(styleSettings.boardColor) ? styleSettings.boardColor : next.colors.surface,
    },
    mode: styleSettings.isDarkBg ? 'dark' : 'light',
    effects: {
      ...next.effects,
      boardOpacity: clampNumber(styleSettings.boardOpacity, 20, 100, next.effects.boardOpacity),
      boardBlur: clampNumber(styleSettings.boardBlur, 0, 32, next.effects.boardBlur),
    },
  });
}

export function getContrastRatio(foreground, background) {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const light = Math.max(fg, bg);
  const dark = Math.min(fg, bg);
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
}

function relativeLuminance(hex) {
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const [r, g, b] = rgb.map(value => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
