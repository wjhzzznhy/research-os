// 阅读器支持的文档类型 
export type DocType = 'pdf' | 'markdown' | 'txt';

// 阅读器支持的文档类型
export interface ReadingDocument {
  id: string;
  name: string;
  size: number;
  type: DocType;
  uploadTime: Date;
  status: 'uploading' | 'parsing' | 'ready' | 'error';
  url?: string; // 文件预览或下载地址
}

// 解析结果预览（如果需要展示在列表里） 
export interface ParsingSummary {
  title: string;
  authors: string[];
  keyPoints: string[];
}