import { 
  FileSearchOutlined, ReadOutlined, EditOutlined, HighlightOutlined, CodeOutlined,
  StarOutlined, ApartmentOutlined, DatabaseOutlined,
  ProductOutlined, 
} from '@ant-design/icons';
import { NavItem } from '@/types/private/sidebar';

// 导出导航栏具有的数据
export const NAV_ITEMS : NavItem[] = [
  { id: 'library', label: 'AI综述', icon: <FileSearchOutlined />, path: '/library' },
  { id: 'reading', label: 'AI阅读', icon: <ReadOutlined />, path: '/reading' },
  { id: 'writing', label: 'AI写作', icon: <EditOutlined />, path: '/writing' },
  { id: 'drawing', label: 'AI绘图', icon: <HighlightOutlined />, path: '/drawing' },
  { id: 'code', label: 'AI代码', icon: <CodeOutlined />, path: '/code' },
  { id: 'highlights', label: 'AI创新点', icon: <StarOutlined />, path: '/idea' },
  { id: 'graph', label: '关联图', icon: <ApartmentOutlined />, path: '/graph' },
  { id: 'knowledge', label: '知识库', icon: <DatabaseOutlined />, path: '/knowledge' },
  { id: 'resources', label:'资源中心', icon:<ProductOutlined />, path:'/resources'},
];