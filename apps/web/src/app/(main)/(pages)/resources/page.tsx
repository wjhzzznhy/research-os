'use client';

import { useState } from 'react';
import { IconGallery } from '@/components/smart-draw/IconGallery';
import { ImageUploadPanel } from '@/components/smart-draw/ImageUploadPanel';

type ResourceTab = 'icons' | 'upload';

export default function ResourcePage() {
  const [activeTab, setActiveTab] = useState<ResourceTab>('icons');

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      <div className="flex flex-col w-full h-full">
        <div className="flex items-center gap-1 px-6 py-4 border-b border-gray-100 bg-white">
          <button
            onClick={() => setActiveTab('icons')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'icons'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            图标检索
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'upload'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            素材上传
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'icons' && (
            <IconGallery className="w-full" />
          )}
          {activeTab === 'upload' && (
            <ImageUploadPanel className="w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
