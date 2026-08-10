import { useEffect, useMemo, useState } from 'react';
import {
  LEGACY_THEME,
  THEME_PRESETS,
  cloneTheme,
  compileThemeVariables,
  migrateTheme,
  styleSettingsToTheme,
  themeToStyleSettings,
  validateTheme,
} from './themeCore';
import { ThemeContext } from './themeContext';

const ACTIVE_THEME_KEY = 'visualTheme';
const DRAFT_THEME_KEY = 'visualThemeDraft';

export function ThemeProvider({ children }) {
  const [activeTheme, setActiveTheme] = useState(() => cloneTheme(LEGACY_THEME));
  const [draftTheme, setDraftTheme] = useState(() => cloneTheme(LEGACY_THEME));
  const [previewTheme, setPreviewTheme] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readThemeStorage().then(({ active, draft, legacyStyle }) => {
      const fallback = legacyStyle ? styleSettingsToTheme(legacyStyle, LEGACY_THEME) : LEGACY_THEME;
      const nextActive = migrateTheme(active || fallback);
      setActiveTheme(nextActive);
      setDraftTheme(migrateTheme(draft || nextActive));
      setReady(true);
    });
  }, []);

  const effectiveTheme = previewTheme || activeTheme;

  useEffect(() => {
    const variables = compileThemeVariables(effectiveTheme);
    for (const [key, value] of Object.entries(variables)) {
      document.documentElement.style.setProperty(key, value);
    }
    document.documentElement.dataset.themeMode = effectiveTheme.mode;
    document.documentElement.dataset.motion = effectiveTheme.accessibility.reducedMotion ? 'off' : effectiveTheme.effects.motion;
  }, [effectiveTheme]);

  const value = useMemo(() => ({
    ready,
    activeTheme,
    draftTheme,
    effectiveTheme,
    presetThemes: THEME_PRESETS,
    styleSettings: themeToStyleSettings(effectiveTheme),
    updateDraftTheme(patch, preview = true) {
      setDraftTheme(current => {
        const next = mergeTheme(current, patch);
        if (preview) setPreviewTheme(next);
        return next;
      });
    },
    previewPreset(theme) {
      const next = migrateTheme(theme);
      setDraftTheme(next);
      setPreviewTheme(next);
    },
    cancelThemeDraft() {
      setDraftTheme(activeTheme);
      setPreviewTheme(null);
      removeThemeDraft();
    },
    saveThemeDraft() {
      writeStorage(DRAFT_THEME_KEY, draftTheme);
    },
    publishTheme(theme = draftTheme) {
      const result = validateTheme(theme);
      if (!result.ok) return result;
      setActiveTheme(result.theme);
      setDraftTheme(result.theme);
      setPreviewTheme(null);
      writeStorage(ACTIVE_THEME_KEY, result.theme);
      writeStorage('styleSettings', themeToStyleSettings(result.theme));
      removeThemeDraft();
      return result;
    },
    resetTheme() {
      const next = cloneTheme(LEGACY_THEME);
      setActiveTheme(next);
      setDraftTheme(next);
      setPreviewTheme(null);
      writeStorage(ACTIVE_THEME_KEY, next);
      writeStorage('styleSettings', themeToStyleSettings(next));
      removeThemeDraft();
    },
  }), [activeTheme, draftTheme, effectiveTheme, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function mergeTheme(theme, patch) {
  return migrateTheme({
    ...theme,
    ...patch,
    colors: { ...theme.colors, ...(patch.colors || {}) },
    background: { ...theme.background, ...(patch.background || {}) },
    layout: { ...theme.layout, ...(patch.layout || {}) },
    cards: { ...theme.cards, ...(patch.cards || {}) },
    effects: { ...theme.effects, ...(patch.effects || {}) },
    accessibility: { ...theme.accessibility, ...(patch.accessibility || {}) },
  });
}

async function readThemeStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new Promise(resolve => {
      chrome.storage.local.get([ACTIVE_THEME_KEY, DRAFT_THEME_KEY, 'styleSettings'], result => {
        resolve({
          active: result[ACTIVE_THEME_KEY],
          draft: result[DRAFT_THEME_KEY],
          legacyStyle: result.styleSettings,
        });
      });
    });
  }
  return {
    active: readLocal(ACTIVE_THEME_KEY),
    draft: readLocal(DRAFT_THEME_KEY),
    legacyStyle: readLocal('mock_styleSettings'),
  };
}

function writeStorage(key, value) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ [key]: value });
  } else {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function removeThemeDraft() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.remove(DRAFT_THEME_KEY);
  } else {
    window.localStorage.removeItem(DRAFT_THEME_KEY);
  }
}

function readLocal(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
