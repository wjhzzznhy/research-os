// UI Types (Keep these here as they are specific to the web UI components)
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationState {
  isOpen: boolean;
  title: string;
  message: string;
  type: NotificationType;
}

export type ConfirmDialogType = 'warning' | 'danger' | 'info' | 'success';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (() => void | Promise<void>) | null;
  type?: ConfirmDialogType;
}

export interface DrawioHandle {
  exportDiagram: (format: string) => void;
  mergeDiagram: (xmlData: string) => void;
  getXml: () => void;
  [key: string]: any;
}
