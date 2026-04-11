'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDrawStore } from '@/stores/draw-store';
import { useEngine } from '@/hooks/smart-draw/useEngine';
import { useConfigSync } from '@/hooks/smart-draw/useConfigSync';
import { configService } from '@/lib/smart-draw/config-service';
import { LLMConfig, IconAsset } from '@/types/api';

import DrawioCanvas from '@/components/smart-draw/DrawioCanvas';
import ExcalidrawCanvas from '@/components/smart-draw/ExcalidrawCanvas';
import FloatingChat from '@/components/smart-draw/FloatingChat';
import FloatingCodeEditor from '@/components/smart-draw/FloatingCodeEditor';
import AppHeader from '@/components/smart-draw/AppHeader';
import CombinedSettingsModal from '@/components/smart-draw/CombinedSettingsModal';
import HistoryModal from '@/components/smart-draw/HistoryModal';
import Notification from '@/components/smart-draw/Notification';
import ConfirmDialog from '@/components/smart-draw/ConfirmDialog';

export default function DrawingLayout() {
  const {
    engineType,
    setEngineType,
    config,
    setConfig,
    usePassword,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    isCombinedSettingsOpen,
    setIsCombinedSettingsOpen,
    confirmDialog,
    closeConfirmDialog,
    notification,
    closeNotification,
    showNotification,
    chatPanelWidth,
    setChatPanelWidth,
  } = useDrawStore();

  useConfigSync();

  const { active: engine, drawio: drawioEngine, excalidraw: excalidrawEngine } = useEngine(engineType);

  const {
    usedCode,
    messages,
    isGenerating,
    streamingContent,
    conversationId,
    handleSendMessage,
    handleRetryMessage,
    handleApplyCode,
    handleCanvasChange,
    handleNewChat,
    handleRestoreHistory,
    handleInsertIcon,
  } = engine;

  const excalidrawFiles = (engine as any).extraData?.files || {};

  const drawioRef = useRef<any>(null);

  const handleEngineSwitch = useCallback(
    async (type: 'drawio' | 'excalidraw') => {
      if (type === engineType) return;

      const currentEngine = engineType === 'excalidraw' ? excalidrawEngine : drawioEngine;
      const currentCode = currentEngine.usedCodeRef?.current ?? currentEngine.usedCode;
      const hasContent = currentCode && currentCode.trim();
      const hasMessages = currentEngine.messages && currentEngine.messages.length > 0;

      if (hasContent || hasMessages) {
        try {
          if (engineType === 'excalidraw' && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('excalidraw-force-save'));
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          const latestCode = currentEngine.usedCodeRef?.current ?? currentEngine.usedCode;
          await currentEngine.saveToHistory(engineType, latestCode);
        } catch (error) {
          console.error('保存画布状态失败:', error);
        }
      }

      setEngineType(type);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('floating-code-editor-reset'));
      }
    },
    [engineType, setEngineType, drawioEngine, excalidrawEngine],
  );

  const handleSendMessageWrapper = useCallback(
    (text: string, attachments: any[], chartType: string) => {
      handleSendMessage(text, attachments, chartType, undefined, (msg: string, type: 'success' | 'error') => {
        showNotification(type === 'error' ? '生成失败' : '提示', msg, type === 'error' ? 'error' : 'info');
      });
    },
    [handleSendMessage, showNotification],
  );

  const handleApplyCodeWrapper = useCallback(
    async (code: string) => {
      if (engineType === 'drawio' && drawioRef.current) {
        drawioRef.current.mergeDiagram(code);
      }
      await handleApplyCode(code);
    },
    [engineType, handleApplyCode],
  );

  const handleDrawioSave = useCallback(
    (xml: string) => {
      handleCanvasChange(xml);
    },
    [handleCanvasChange],
  );

  const handleExcalidrawChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      handleCanvasChange(elements, files);
    },
    [handleCanvasChange],
  );

  const handleRestoreHistoryWrapper = useCallback(
    (history: any) => {
      handleRestoreHistory(history);
    },
    [handleRestoreHistory],
  );

  const handleConfigSelect = useCallback(
    (newConfig: LLMConfig) => {
      setConfig(newConfig);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('config-changed', { detail: { config: newConfig } }));
      }
    },
    [setConfig],
  );

  const handleInsertIconWrapper = useCallback(
    (icon: IconAsset) => {
      handleInsertIcon(icon);
    },
    [handleInsertIcon],
  );

  useEffect(() => {
    const handleVisibilityChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setChatPanelWidth(detail.open ? detail.width : 0);
    };
    window.addEventListener('chatpanel-visibility-change', handleVisibilityChange);
    return () => {
      window.removeEventListener('chatpanel-visibility-change', handleVisibilityChange);
    };
  }, [setChatPanelWidth]);

  const parseExcalidrawElements = (code: string | null): any[] => {
    if (!code) return [];
    try {
      const data = JSON.parse(code);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.elements)) return data.elements;
    } catch {}
    return [];
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white">
      {engineType === 'drawio' ? (
        <div className="w-full h-full" style={{ marginRight: chatPanelWidth ? `${chatPanelWidth}px` : '0' }}>
          <DrawioCanvas
            ref={drawioRef}
            xml={usedCode || undefined}
            onSave={handleDrawioSave}
            onAutosave={handleDrawioSave}
            autosave
          />
        </div>
      ) : (
        <div style={{ marginRight: chatPanelWidth ? `${chatPanelWidth}px` : '0' }}>
          <ExcalidrawCanvas
            elements={parseExcalidrawElements(usedCode)}
            initialFiles={excalidrawFiles}
            onChange={handleExcalidrawChange}
            showNotification={(n: any) => showNotification(n.title, n.message, n.type === 'info' ? 'info' : n.type)}
          />
        </div>
      )}

      <FloatingChat
        engineType={engineType}
        onEngineSwitch={handleEngineSwitch}
        onSendMessage={handleSendMessageWrapper}
        isGenerating={isGenerating}
        messages={messages}
        streamingContent={streamingContent}
        onApplyCode={handleApplyCodeWrapper}
        conversationId={conversationId}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onNewChat={handleNewChat}
        onRetryMessage={handleRetryMessage}
        onInsertIcon={handleInsertIconWrapper}
      />

      <FloatingCodeEditor
        engineType={engineType}
        onApplyCode={handleApplyCodeWrapper}
        messages={messages}
      />

      <AppHeader onOpenSettings={() => setIsCombinedSettingsOpen(true)} />

      <CombinedSettingsModal
        isOpen={isCombinedSettingsOpen}
        onClose={() => setIsCombinedSettingsOpen(false)}
        usePassword={usePassword}
        currentConfig={config}
        onConfigSelect={handleConfigSelect}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onApply={handleRestoreHistoryWrapper}
        editorType={engineType}
      />

      <Notification
        isOpen={notification.isOpen}
        onClose={closeNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={() => {
          if (confirmDialog.onConfirm) confirmDialog.onConfirm();
          closeConfirmDialog();
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
}
