import { Modal, Input, Form, Tag, Tooltip, Collapse, Button } from 'antd';
import { useState, useEffect, useRef, useMemo } from 'react';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { InputRef } from 'antd';

const { TextArea } = Input;

export interface KnowledgeSectionData {
  id: string;
  title: string;
  content: string;
  removable?: boolean;
}

export interface KnowledgeCardData {
  id: number;
  title: string;
  innovationPoints: string;
  methodology: string;
  experimentProcess: string;
  algorithmFlow: string;
  methodComparison?: string;
  datasetAndMetrics?: string;
  keyResults: string;
  theoreticalFramework: string;
  limitations?: string;
  futureWork?: string;
  tags: string[];
  source: string;
  date: string;
  content?: string;
  sections?: KnowledgeSectionData[];
}

interface KnowledgeCardModalProps {
  open: boolean;
  initialData?: KnowledgeCardData | null;
  onClose: () => void;
  onSave: (data: KnowledgeCardData) => void;
}

const FIXED_SECTIONS = [
  { id: 'researchBackground', title: '研究背景与问题定义' },
  { id: 'innovationPoints', title: '创新点' },
  { id: 'methodology', title: '研究方法' },
  { id: 'experimentProcess', title: '实验流程' },
  { id: 'algorithmFlow', title: '算法流程' },
  { id: 'methodComparison', title: '方法对比（与现有方法相比的优劣）' },
  { id: 'datasetAndMetrics', title: '数据集与评估指标' },
  { id: 'keyResults', title: '关键结果' },
  { id: 'theoreticalFramework', title: '理论框架' },
  { id: 'limitations', title: '局限性与风险' },
  { id: 'futureWork', title: '未来工作与应用价值' }
];

const buildDefaultSections = (data?: KnowledgeCardData | null): KnowledgeSectionData[] => {
  const values: Record<string, string> = {
    researchBackground: data?.content || '',
    innovationPoints: data?.innovationPoints || '',
    methodology: data?.methodology || '',
    experimentProcess: data?.experimentProcess || '',
    algorithmFlow: data?.algorithmFlow || '',
    methodComparison: data?.methodComparison || '',
    datasetAndMetrics: data?.datasetAndMetrics || '',
    keyResults: data?.keyResults || '',
    theoreticalFramework: data?.theoreticalFramework || '',
    limitations: data?.limitations || '',
    futureWork: data?.futureWork || ''
  };
  return FIXED_SECTIONS.map((item) => ({
    id: item.id,
    title: item.title,
    content: values[item.id] || '',
    removable: false
  }));
};

export function KnowledgeCardModal({
  open,
  initialData,
  onClose,
  onSave
}: KnowledgeCardModalProps) {
  const [form] = Form.useForm();
  const [tags, setTags] = useState<string[]>([]);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sections, setSections] = useState<KnowledgeSectionData[]>([]);
  const [activeSectionKeys, setActiveSectionKeys] = useState<string[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initialData) {
      form.setFieldsValue({ title: initialData.title });
      setTags(initialData.tags || []);
      const mergedSections = initialData.sections && initialData.sections.length > 0
        ? [...buildDefaultSections(initialData), ...initialData.sections.filter((item) => !FIXED_SECTIONS.find((s) => s.id === item.id))]
        : buildDefaultSections(initialData);
      setSections(mergedSections);
      setActiveSectionKeys(mergedSections.map((item) => item.id));
    } else {
      form.resetFields();
      setTags([]);
      const defaults = buildDefaultSections(null);
      setSections(defaults);
      setActiveSectionKeys(defaults.map((item) => item.id));
    }
    setNewSectionTitle('');
    setInputVisible(false);
    setInputValue('');
  }, [open, initialData, form]);

  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  const handleCloseModal = () => {
    setSaving(false);
    onClose();
  };

  const getSectionContent = (id: string) => {
    return sections.find((item) => item.id === id)?.content || '';
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      const firstValidContent = sections.find((item) => item.content?.trim())?.content || '';
      onSave({
        ...initialData,
        title: values.title,
        tags,
        sections,
        innovationPoints: getSectionContent('innovationPoints'),
        methodology: getSectionContent('methodology'),
        experimentProcess: getSectionContent('experimentProcess'),
        algorithmFlow: getSectionContent('algorithmFlow'),
        methodComparison: getSectionContent('methodComparison'),
        datasetAndMetrics: getSectionContent('datasetAndMetrics'),
        keyResults: getSectionContent('keyResults'),
        theoreticalFramework: getSectionContent('theoreticalFramework'),
        limitations: getSectionContent('limitations'),
        futureWork: getSectionContent('futureWork'),
        id: initialData?.id || Date.now(),
        date: initialData?.date || new Date().toISOString().split('T')[0],
        source: initialData?.source || '手动创建',
        content: firstValidContent ? `${firstValidContent.slice(0, 100)}...` : ''
      });
      handleCloseModal();
    } finally {
      setSaving(false);
    }
  };

  const handleCloseTag = (removedTag: string) => {
    setTags(tags.filter((tag) => tag !== removedTag));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputConfirm = () => {
    const value = inputValue.trim();
    if (value && !tags.includes(value)) {
      setTags([...tags, value]);
    }
    setInputVisible(false);
    setInputValue('');
  };

  const handleSectionContentChange = (sectionId: string, content: string) => {
    setSections((prev) => prev.map((item) => item.id === sectionId ? { ...item, content } : item));
  };

  const handleAddSection = () => {
    const title = newSectionTitle.trim();
    if (!title) {
      return;
    }
    const id = `custom-${Date.now()}`;
    const next = [...sections, { id, title, content: '', removable: true }];
    setSections(next);
    setActiveSectionKeys((prev) => [...prev, id]);
    setNewSectionTitle('');
  };

  const handleRemoveSection = (sectionId: string) => {
    setSections((prev) => prev.filter((item) => item.id !== sectionId));
    setActiveSectionKeys((prev) => prev.filter((key) => key !== sectionId));
  };

  const collapseItems = useMemo(() => {
    return sections.map((section, index) => ({
      key: section.id,
      label: (
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-gray-700">{index + 1}. {section.title}</span>
        </div>
      ),
      extra: section.removable ? (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(event) => {
            event.stopPropagation();
            handleRemoveSection(section.id);
          }}
        />
      ) : null,
      children: (
        <TextArea
          rows={4}
          value={section.content}
          onChange={(event) => handleSectionContentChange(section.id, event.target.value)}
          placeholder={`请输入${section.title}内容`}
          className="rounded-lg"
        />
      )
    }));
  }, [sections]);

  return (
    <Modal
      title={initialData ? '编辑知识卡片' : '新建知识卡片'}
      open={open}
      onCancel={handleCloseModal}
      width={980}
      centered
      keyboard
      closable
      maskClosable
      destroyOnHidden
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      onOk={handleSave}
      styles={{
        body: {
          paddingTop: 14,
          background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)'
        },
        content: {
          borderRadius: 20,
          overflow: 'hidden'
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="space-y-4"
      >
        <Form form={form} layout="vertical" initialValues={{ title: initialData?.title || '' }}>
          <Form.Item
            name="title"
            label="卡片标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入标题" className="h-10 rounded-lg" />
          </Form.Item>
        </Form>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {tags.map((tag) => {
              const isLongTag = tag.length > 20;
              const tagNode = (
                <Tag key={tag} closable onClose={() => handleCloseTag(tag)} className="m-0 rounded-full px-2 py-1">
                  {isLongTag ? `${tag.slice(0, 20)}...` : tag}
                </Tag>
              );
              return isLongTag ? <Tooltip title={tag} key={tag}>{tagNode}</Tooltip> : tagNode;
            })}
            {inputVisible ? (
              <Input
                ref={inputRef}
                type="text"
                size="small"
                style={{ width: 120 }}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputConfirm}
                onPressEnter={handleInputConfirm}
              />
            ) : (
              <Tag onClick={() => setInputVisible(true)} style={{ borderStyle: 'dashed', cursor: 'pointer' }} className="m-0 rounded-full px-2 py-1">
                <PlusOutlined /> 新标签
              </Tag>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newSectionTitle}
              onChange={(event) => setNewSectionTitle(event.target.value)}
              placeholder="输入新板块名称，例如：参考文献、工程实现"
              className="h-9 rounded-lg"
              onPressEnter={handleAddSection}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSection}>
              新增板块
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-2">
          <Collapse
            activeKey={activeSectionKeys}
            onChange={(keys) => setActiveSectionKeys(Array.isArray(keys) ? keys as string[] : [keys as string])}
            items={collapseItems}
            bordered={false}
            ghost
            className="[&_.ant-collapse-item]:mb-2 [&_.ant-collapse-item]:rounded-lg [&_.ant-collapse-item]:border [&_.ant-collapse-item]:border-gray-200 [&_.ant-collapse-item]:bg-white [&_.ant-collapse-header]:items-center"
          />
        </div>
      </motion.div>
    </Modal>
  );
}
