'use client';

import { useDrawioEngine } from './useDrawioEngine';
import { useExcalidrawEngine } from './useExcalidrawEngine';

export function useEngine(engineType: 'drawio' | 'excalidraw') {
  const drawioEngine = useDrawioEngine();
  const excalidrawEngine = useExcalidrawEngine();

  const activeEngine = engineType === 'excalidraw' ? excalidrawEngine : drawioEngine;

  return {
    active: activeEngine,
    drawio: drawioEngine,
    excalidraw: excalidrawEngine,
  };
}
