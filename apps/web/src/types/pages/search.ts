// 搜索模式：简单或智能
export type SearchMode = 'simple' | 'smart';

// 模型选项接口 
export interface ModelOption {
  value: string;
  label: string;
}

// 搜索请求参数（预留给后端接口） 
export interface SearchRequest {
  query: string;
  mode: SearchMode;
  model: string;
  isWebSearch: boolean;
  imageFile?: File; // 针对智能搜索的图片上传
}