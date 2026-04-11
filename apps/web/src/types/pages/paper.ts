// 基础论文数据接口
export interface Paper {
  id: string;
  title: string;
  author: string;
  year: number;
  citations: number;
  abstract: string;
  url: string;
  isFavorite?: boolean;
}