# @research-os/sdk

Research OS 前端集成 SDK，提供 API 客户端、React Hooks 和可复用组件。

## 安装

```bash
pnpm add @research-os/sdk @research-os/types
```

## 快速开始

### 配置 SDK

```tsx
import { ResearchOSProvider } from '@research-os/sdk';

function App() {
  return (
    <ResearchOSProvider config={{
      baseUrl: '/api',
      apiVersion: 'v1',
    }}>
      {/* 你的应用 */}
    </ResearchOSProvider>
  );
}
```

### 使用 API

```typescript
import { qaApi } from '@research-os/sdk';

const response = await qaApi.ask({
  question: '什么是机器学习？',
  top_k: 5,
});
```

### 使用 Hooks

```tsx
import { useQA } from '@research-os/sdk';

function QAPanel() {
  const { ask, answer, sources, loading } = useQA();
  
  const handleAsk = async () => {
    await ask({ question: '你的问题' });
  };
  
  return (
    <div>
      <button onClick={handleAsk} disabled={loading}>
        提问
      </button>
      <p>{answer}</p>
    </div>
  );
}
```

### 使用组件

```tsx
import { KnowledgeUploader } from '@research-os/sdk';

function UploadSection() {
  return (
    <KnowledgeUploader
      onUploadComplete={(results) => {
        console.log('上传完成:', results);
      }}
    />
  );
}
```

## 模块说明

### API 模块

- `knowledgeApi` - 知识管理
- `smartDrawApi` - 智能绘图
- `qaApi` - 问答
- `vectorApi` - 向量搜索
- `searchApi` - 搜索
- `materialsApi` - 素材管理
- `storageApi` - 存储

### React Hooks

- `useKnowledge`
- `useSmartDraw`
- `useQA`
- `useVector`
- `useSearch`
- `useMaterials`
- `useStorage`

### 组件

- `ResearchOSProvider`
- `FileUpload`
- `KnowledgeUploader`
- `MaterialUploader`
- `SearchBar`
- `IconPicker`

### 工具函数

- `formatters` - 格式化
- `validators` - 验证
- `errors` - 错误处理
- `async` - 异步工具

## 许可证

ISC
