"use client";

import { ReadOutlined } from '@ant-design/icons';
import { FeatureHeader } from '@/components/pages/common/FeatureHeader';
import { FileUploader } from '@/components/pages/reading/FileUploader';
import { ReadingProvider } from '@/context/ReadingContext';
import { HistorySidebar } from '@/components/pages/common/HistorySidebar';
import { HistoryTrigger } from '@/components/pages/common/HistoryTrigger';
import { useRouter } from 'next/navigation';

export default function AIReaderPage() {
  const router = useRouter();
  return (
    <ReadingProvider>
      <div className="relative flex h-screen w-full overflow-hidden bg-mesh-green">
        <div className="z-50">
          <HistorySidebar
            position="left"
            shadowClassName="shadow-[4px_0_24px_rgba(0,0,0,0.08)]!"
            borderClassName="border-r-gray-600!"
          />
        </div>

        <div className="flex-1 relative overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center relative px-6">
            <HistoryTrigger
              module="reading"
              title="历史对话"
            />

            <div className="w-full max-w-4xl flex flex-col items-center">
              <FeatureHeader
                title="AI 阅读"
                tag="GLM-4.0 满血版 ✦"
                description="作为你的论文阅读助手，我可以帮你快速解读论文：进行多语言论文的高精准翻译，对论文中文本、图片、公式高精准解读与问答"
                icon={<ReadOutlined />}
                align="left"
              />
              <div className="w-full mt-2">
                <FileUploader onLibraryClick={() => router.push('/knowledge')} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ReadingProvider>
  );
}
