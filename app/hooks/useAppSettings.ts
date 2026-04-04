import { useCallback, useEffect, useState } from 'react';

export interface AppSettings {
  theme: 'light' | 'dark';
  systemPrompt: string;
  maxTokens: number;
  autoSummarize: boolean;
  tokenBudget: number | null;
  fontSize: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  systemPrompt: '',
  maxTokens: 4096,
  autoSummarize: true,
  tokenBudget: null,
  fontSize: 17,
};

const STORAGE_KEY = 'chat-ai-webgpu-settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.style.colorScheme = 'dark';
      root.classList.add('dark');
    } else {
      root.style.colorScheme = 'light';
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--chat-font-size', `${settings.fontSize}px`);
    root.style.fontSize = `${settings.fontSize}px`;
    return () => {
      root.style.fontSize = '';
      root.style.removeProperty('--chat-font-size');
    };
  }, [settings.fontSize]);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, update, reset };
}
