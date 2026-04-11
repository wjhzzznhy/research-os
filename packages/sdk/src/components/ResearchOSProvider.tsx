import { createContext, useContext, ReactNode } from 'react';
import { configureSDK, getSDKConfig, type SDKConfig } from '../config';

interface ResearchOSContextType {
  config: SDKConfig;
  setConfig: (config: Partial<SDKConfig>) => void;
}

const ResearchOSContext = createContext<ResearchOSContextType | undefined>(undefined);

interface ResearchOSProviderProps {
  children: ReactNode;
  config?: Partial<SDKConfig>;
}

export function ResearchOSProvider({ children, config }: ResearchOSProviderProps) {
  if (config) {
    configureSDK(config);
  }

  const setConfig = (newConfig: Partial<SDKConfig>) => {
    configureSDK(newConfig);
  };

  return (
    <ResearchOSContext.Provider
      value={{
        config: getSDKConfig(),
        setConfig,
      }}
    >
      {children}
    </ResearchOSContext.Provider>
  );
}

export function useResearchOS() {
  const context = useContext(ResearchOSContext);
  if (context === undefined) {
    throw new Error('useResearchOS must be used within a ResearchOSProvider');
  }
  return context;
}
