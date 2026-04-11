# @research-os/types

Shared TypeScript definitions for ResearchOS.

## Usage

Import types in your frontend application:

```typescript
import { UploadResponse } from "@research-os/types";
```

## Syncing with Backend

Currently, these types are manually synced with backend Pydantic models in `apps/api/app/schemas`.
Future improvement: Use `openapi-typescript` to generate these automatically from `openapi.json`.
