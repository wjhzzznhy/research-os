export interface FileUploadStatus {
  filename: string;
  status: string;
  path?: string | null;
  message?: string | null;
}

export interface UploadResponse {
  uploaded: FileUploadStatus[];
}

export interface SearchResult {
  content: string;
  metadata: Record<string, any>;
  score?: number | null;
}

export interface SearchResponse {
  results: SearchResult[];
}

// --- Smart Draw / LLM Types ---

export interface LLMConfig {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'password-mode' | string; // loose string for compatibility
  baseUrl: string;
  apiKey: string;
  model: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isPasswordMode?: boolean;
}

export interface AttachmentRef {
  blobId: string;
  name: string;
  type: string;
  size: number;
  kind?: 'image' | 'file';
}

export interface LLMMessageContentPart {
    type: 'text' | 'image' | 'image_url' | string;
    text?: string;
    image_url?: { url: string };
    source?: Record<string, any>;
    cache_control?: Record<string, any>;
    [key: string]: any;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | string;
  content: string | LLMMessageContentPart[];
  image?: Record<string, any> | null;
  images?: Record<string, any>[] | null;
  imagePayloads?: Record<string, any>[] | null;
  files?: any[]; // For frontend file display
  attachments?: any[]; // For general attachments
}

// Alias for backward compatibility if needed, or prefer LLMMessage
export type Message = LLMMessage; 
export type MessagePart = LLMMessageContentPart;

export interface MessageRecord {
  id: string;
  conversationId: string;
  message: LLMMessage;
  createdAt: number;
  // Legacy fields for migration
  role?: string;
  content?: string;
  type?: string;
  attachments?: AttachmentRef[];
}

export interface ConversationRecord {
  id: string;
  title: string;
  chartType: string;
  config: Partial<LLMConfig> | null;
  editor?: 'drawio' | 'excalidraw';
  createdAt: number;
  updatedAt: number;
}

export interface BlobRecord {
  id: string;
  blob: Blob | File;
  name: string;
  type: string;
  size: number;
}

export interface SmartDrawRequest {
  config?: LLMConfig | null;
  messages: LLMMessage[];
}

export interface IconAsset {
  id: string;
  name?: string;
  url: string;
  tags?: string[];
  category?: string;
  metadata?: Record<string, any>;
  source_file_url?: string;
  [key: string]: any;
}

export interface IconSearchResponse {
  icons: IconAsset[];
  total?: number;
}

export interface DeletionResponse {
  id: string;
  storage_deleted: string[];
  storage_failed: string[];
  vectors_deleted: number;
  vectors_failed: number;
  errors: string[];
  success: boolean;
}

export interface QAAskRequest {
  question: string;
  top_k?: number;
  score_threshold?: number;
  kind?: string | null;
  category?: string | null;
}

export interface QASource {
  id: string;
  name: string;
  url: string;
  proxy_url?: string | null;
  kind?: string | null;
  tags?: string[];
  category?: string | null;
  description?: string | null;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface QAAskResponse {
  answer: string;
  sources: QASource[];
  images: QASource[];
}

export interface HistoryItem {
  id: string;
  chartType: string;
  userInput: string;
  config: LLMConfig | null;
  timestamp: number;
  editor: 'drawio' | 'excalidraw' | string;
  [key: string]: any;
}

export interface VectorSearchResult {
  id: string;
  collection: string;
  item_type: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
  rerank_score?: number | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
}

export interface VectorSearchRequest {
  query: string;
  collections?: string[] | null;
  item_types?: string[] | null;
  top_k?: number;
  use_bm25?: boolean;
  use_vector?: boolean;
  use_rerank?: boolean;
  score_threshold?: number;
}

export interface VectorSearchResponse {
  query: string;
  items: VectorSearchResult[];
  total: number;
  search_time_ms: number;
}

export interface VectorAddItemRequest {
  collection: string;
  item_type: string;
  content: string;
  embedding_text?: string | null;
  metadata?: Record<string, any>;
  external_id?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
}

export interface VectorAddItemResponse {
  id: string;
  collection: string;
  success: boolean;
}

export interface VectorStatsResponse {
  total: number;
  collections: {
    icons: number;
    materials: number;
    papers: number;
  };
}
