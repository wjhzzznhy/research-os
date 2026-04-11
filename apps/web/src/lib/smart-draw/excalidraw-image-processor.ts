import type {
  BinaryFiles,
  ExcalidrawElement,
  ExcalidrawImageElement,
} from "@/lib/smart-draw/excalidraw/types";

/**
 * 检查元素是否为我们约定的 "URL 占位符" 图片元素
 * 即：type 为 image，且 fileId 是一个 URL 字符串
 */
function isPendingImageElement(element: ExcalidrawElement): element is ExcalidrawImageElement {
  if (element.type !== "image") return false;
  const fileId = (element as ExcalidrawImageElement).fileId;
  // 简单的 URL 检查：以 http 开头，或者 data:image 开头（虽然 data:image 通常不需要 hydration，但为了统一处理也可以包含）
  // 这里主要针对 AI 生成的 http/https 链接
  return typeof fileId === "string" && (fileId.startsWith("http://") || fileId.startsWith("https://") || fileId.startsWith("/"));
}

/**
 * 将图片 URL 转换为 Data URL (Base64)
 */
async function fetchImageUrlToDataUrl(
  url: string,
): Promise<{ mimeType: string; dataURL: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${url}`);
      return null;
    }
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataURL = reader.result as string;
        // 简单的 mimeType 提取，如果 blob.type 不存在，尝试从 dataURL 头部提取
        let mimeType = blob.type;
        if (!mimeType && dataURL.startsWith("data:")) {
          mimeType = dataURL.split(";")[0].substring(5);
        }
        // 默认 fallback
        if (!mimeType) mimeType = "image/png";
        resolve({ mimeType, dataURL });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error fetching image ${url}:`, error);
    return null;
  }
}

/**
 * 生成简单的随机 ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * 处理 Excalidraw 场景数据
 * 扫描所有元素，找到 fileId 为 URL 的 image 元素
 * 下载图片，构建 files 对象，并更新元素的 fileId 为真正的引用 ID
 */
export async function hydrateExcalidrawImages(
  elements: ExcalidrawElement[],
  existingFiles: BinaryFiles = {},
): Promise<{ elements: ExcalidrawElement[]; files: BinaryFiles }> {
  const newElements = JSON.parse(JSON.stringify(elements)); // Deep clone
  const newFiles = { ...existingFiles };
  const processingPromises: Promise<void>[] = [];

  for (const element of newElements) {
    if (isPendingImageElement(element)) {
      const imageUrl = element.fileId; // 这里此时是 URL
      
      // 创建处理任务
      const task = async () => {
        try {
          console.log('[Hydration] 开始下载图片:', imageUrl);
          const imageData = await fetchImageUrlToDataUrl(imageUrl);
          console.log('[Hydration] 图片下载结果:', imageData ? `成功, mimeType: ${imageData.mimeType}` : '失败');
          
          if (imageData) {
            // 生成真正的 fileId
            const realFileId = generateId();
            
            // 更新元素
            element.fileId = realFileId;
            element.status = "saved";
            
            // 添加到 files 字典
            newFiles[realFileId] = {
              id: realFileId,
              dataURL: imageData.dataURL,
              mimeType: imageData.mimeType,
              created: Date.now(),
              lastRetrieved: Date.now(),
            };
            console.log('[Hydration] 图片已添加到 files:', realFileId);
          } else {
            // 如果下载失败，保持原始 URL 以便调试
            console.error(`[Hydration] 无法下载图片: ${imageUrl}`);
            element.status = "error";
          }
        } catch (error) {
          console.error(`[Hydration] 处理图片时出错: ${imageUrl}`, error);
        }
      };
      processingPromises.push(task());
    }
  }

  console.log('[Hydration] 等待所有图片下载完成，总数:', processingPromises.length);
  await Promise.all(processingPromises);
  console.log('[Hydration] 完成，files 总数:', Object.keys(newFiles).length);
  
  return { elements: newElements, files: newFiles };
}
