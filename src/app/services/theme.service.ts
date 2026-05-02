import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'agendify-theme';
const DEFAULT_THEME: ThemePreference = 'light';
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'auto';
}

function hasBrowserApis(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function readStoredThemePreference(): ThemePreference {
  if (!hasBrowserApis()) return DEFAULT_THEME;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function writeStoredThemePreference(theme: ThemePreference): void {
  if (!hasBrowserApis()) return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage can be unavailable in private/restricted browser contexts.
  }
}

function getSystemTheme(): ResolvedTheme {
  if (!hasBrowserApis() || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'auto' ? getSystemTheme() : preference;
}

function applyResolvedTheme(theme: ResolvedTheme): void {
  if (!hasBrowserApis()) return;

  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

export function initializeTheme(): ResolvedTheme {
  const preference = readStoredThemePreference();
  const resolved = resolveTheme(preference);
  applyResolvedTheme(resolved);
  return resolved;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly storageKey = THEME_STORAGE_KEY;

  private readonly preferenceSubject = new BehaviorSubject<ThemePreference>(readStoredThemePreference());
  private readonly resolvedSubject = new BehaviorSubject<ResolvedTheme>(resolveTheme(this.preferenceSubject.value));
  private mediaQuery?: MediaQueryList;
  private readonly systemThemeListener = () => {
    if (this.preferenceSubject.value === 'auto') {
      this.applyPreference('auto', false);
    }
  };

  readonly preference$ = this.preferenceSubject.asObservable();
  readonly resolvedTheme$ = this.resolvedSubject.asObservable();

  constructor() {
    this.setupSystemThemeListener();
    this.applyPreference(this.preferenceSubject.value, false);
  }

  getTheme(): ThemePreference {
    return this.preferenceSubject.value;
  }

  getResolvedTheme(): ResolvedTheme {
    return this.resolvedSubject.value;
  }

  setTheme(theme: ThemePreference): void {
    this.applyPreference(theme, true);
  }

  toggle(): void {
    this.setTheme(this.getResolvedTheme() === 'dark' ? 'light' : 'dark');
  }

  private applyPreference(preference: ThemePreference, persist: boolean): void {
    const resolved = resolveTheme(preference);

    if (persist) {
      writeStoredThemePreference(preference);
    }

    applyResolvedTheme(resolved);
    this.preferenceSubject.next(preference);
    this.resolvedSubject.next(resolved);
  }

  private setupSystemThemeListener(): void {
    if (!hasBrowserApis() || typeof window.matchMedia !== 'function') return;

    this.mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY);
    this.mediaQuery.addEventListener('change', this.systemThemeListener);
  }
}
