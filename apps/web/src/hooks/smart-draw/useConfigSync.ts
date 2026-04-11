import { useEffect } from 'react';
import { LLMConfig } from '@/types/api';
import { configService } from '@/lib/smart-draw/config-service';
import { useDrawStore } from '@/stores/draw-store';

export function useConfigSync() {
  const { setConfig, setUsePassword } = useDrawStore();

  useEffect(() => {
    // Initial load
    const savedConfig = configService.getCurrentConfig();
    if (savedConfig) {
      setConfig(savedConfig as LLMConfig);
    }

    const passwordEnabled = configService.isPasswordMode();
    setUsePassword(passwordEnabled);

    // Listen for unified config change event
    const handleConfigChange = (e: any) => {
      const newConfig = e.detail?.config || configService.getCurrentConfig();
      setConfig(newConfig);
      setUsePassword(configService.isPasswordMode());
    };

    // Listen for storage changes to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      const key = e?.key;

      const configKeys = [
        'smart-diagram-local-configs',
        'smart-diagram-active-local-config',
        'smart-diagram-remote-config',
        'smart-diagram-use-password',
      ];

      if (!key || configKeys.includes(key)) {
        const newConfig = configService.getCurrentConfig();
        setConfig(newConfig as LLMConfig);
        setUsePassword(configService.isPasswordMode());
      }
    };

    window.addEventListener('config-changed', handleConfigChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('config-changed', handleConfigChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setConfig, setUsePassword]);
}
