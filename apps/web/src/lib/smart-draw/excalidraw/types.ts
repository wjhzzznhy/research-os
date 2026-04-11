export type ExcalidrawElement = {
  id: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  [key: string]: any;
};

export type ExcalidrawImageElement = ExcalidrawElement & {
  type: "image";
  fileId: string;
  status?: "pending" | "saved" | "error";
};

export type BinaryFileData = {
  id: string;
  dataURL: string;
  mimeType: string;
  created: number;
  lastRetrieved: number;
};

export type BinaryFiles = Record<string, BinaryFileData>;

export type ExcalidrawImperativeAPI = {
  getSceneElements: () => readonly ExcalidrawElement[];
  scrollToContent?: (
    elements?: readonly ExcalidrawElement[],
    opts?: any,
  ) => void;
  updateScene: (args: {
    elements?: readonly ExcalidrawElement[];
    appState?: any;
    files?: BinaryFiles;
  }) => void;
  updateLibrary?: (args: {
    libraryItems: any;
    merge?: boolean;
    prompt?: boolean;
    defaultStatus?: 'published' | 'unpublished';
    openLibraryMenu?: boolean;
  }) => Promise<void> | void;
};
