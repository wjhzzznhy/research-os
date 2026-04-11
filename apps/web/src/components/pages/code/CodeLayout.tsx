'use client';
import {
  FolderOutlined,
  CodeOutlined,
  ConsoleSqlOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import EditorLayout from '../shared/EditorLayout';
import CodeAiChat from './CodeAiChat';
import CodeFileExplorer from './CodeFileExplorer';
import CodePythonEditor from './CodePythonEditor';

export default function CodeLayout() {
  return (
    <EditorLayout
      storagePrefix="code"
      defaultFile="main.py"
      hidePreview
      panelConfig={{
        file: {
          icon: <FolderOutlined style={{ fontSize: '10px' }} />,
          label: '文件浏览',
          closeTip: '关闭文件浏览',
          closedText: '文件浏览区已关闭',
          closedSubText: '点击顶部按钮重新打开',
          closedIcon: <FolderOutlined style={{ fontSize: '48px', marginBottom: '12px' }} />,
        },
        editor: {
          icon: <CodeOutlined style={{ fontSize: '10px' }} />,
          label: '代码编辑',
          closeTip: '关闭代码编辑',
          closedText: '代码编辑区已关闭',
          closedSubText: '点击顶部按钮重新打开',
          closedIcon: <CodeOutlined style={{ fontSize: '48px', marginBottom: '12px' }} />,
        },
        preview: {
          icon: <ConsoleSqlOutlined style={{ fontSize: '10px' }} />,
          label: '终端输出',
          closeTip: '关闭终端',
          closedText: '终端输出区已关闭',
          closedSubText: '点击顶部按钮重新打开',
          closedIcon: <ConsoleSqlOutlined style={{ fontSize: '48px', marginBottom: '12px' }} />,
        },
        chat: {
          icon: <RobotOutlined style={{ fontSize: '10px' }} />,
          label: 'AI助手',
          closeTip: '关闭AI助手',
          closedText: 'AI助手已关闭',
          closedSubText: '点击顶部按钮重新打开',
          closedIcon: <RobotOutlined style={{ fontSize: '48px', marginBottom: '12px' }} />,
        },
      }}
      renderFileExplorer={({ onFileSelect }) => (
        <CodeFileExplorer onFileSelect={onFileSelect} />
      )}
      renderEditor={({ activeFile, onSendToAi }) => (
        <CodePythonEditor activeFile={activeFile} onSendToAi={onSendToAi} />
      )}
      renderPreview={() => <div />}
      renderChat={({ aiPrompt, onPromptConsumed }) => (
        <CodeAiChat aiPrompt={aiPrompt} onPromptConsumed={onPromptConsumed} />
      )}
    />
  );
}
