import re
import logging
from typing import Dict, Optional, List
from pathlib import Path
import json

logger = logging.getLogger(__name__)

CHINESE_TO_ENGLISH = {
    "数据库": "database", "云": "cloud", "服务器": "server", "用户": "user",
    "机器人": "robot", "人": "person human people", "设置": "settings config configuration",
    "配置": "config configuration settings", "文件": "file document",
    "文档": "document file", "文件夹": "folder directory", "目录": "directory folder",
    "搜索": "search find magnifier", "查找": "find search", "编辑": "edit modify",
    "删除": "delete remove trash", "添加": "add plus create", "创建": "create add new",
    "保存": "save disk", "下载": "download", "上传": "upload", "刷新": "refresh reload",
    "返回": "back return arrow", "前进": "forward arrow", "菜单": "menu hamburger",
    "导航": "navigation nav", "首页": "home", "登录": "login signin",
    "登出": "logout signout", "注册": "register signup", "锁": "lock secure",
    "解锁": "unlock", "钥匙": "key", "密码": "password key", "安全": "security shield lock",
    "警告": "warning alert", "错误": "error danger", "成功": "success check",
    "信息": "info information", "帮助": "help question", "问题": "question help",
    "邮件": "email mail", "消息": "message chat", "通知": "notification bell",
    "聊天": "chat message", "电话": "phone call", "手机": "mobile phone",
    "电脑": "computer desktop", "笔记本": "laptop", "平板": "tablet",
    "显示器": "monitor screen", "屏幕": "screen display", "键盘": "keyboard",
    "鼠标": "mouse", "打印机": "printer", "扫描仪": "scanner", "网络": "network wifi",
    "无线": "wifi wireless", "有线": "cable wired", "连接": "connection link",
    "链接": "link url", "网址": "url link", "浏览器": "browser web",
    "网页": "web page", "网站": "website", "代码": "code programming",
    "编程": "programming code", "开发": "development code", "测试": "test testing",
    "调试": "debug", "版本": "version git", "分支": "branch git",
    "提交": "commit git", "拉取": "pull git", "推送": "push git",
    "合并": "merge git", "冲突": "conflict", "构建": "build", "部署": "deploy",
    "容器": "container docker", "镜像": "image docker", "表格": "table grid",
    "图表": "chart graph", "图形": "graph chart", "饼图": "pie chart",
    "柱状图": "bar chart", "折线图": "line chart", "地图": "map location",
    "位置": "location pin", "标记": "marker pin", "标签": "tag label",
    "分类": "category folder", "过滤": "filter", "排序": "sort order",
    "分页": "pagination page", "时间": "time clock", "日期": "date calendar",
    "日历": "calendar date", "闹钟": "alarm clock", "定时器": "timer",
    "秒表": "stopwatch", "天气": "weather", "太阳": "sun", "月亮": "moon",
    "星星": "star", "心": "heart love", "喜欢": "like heart", "收藏": "favorite bookmark",
    "书签": "bookmark", "分享": "share", "转发": "forward share",
    "评论": "comment", "点赞": "like thumbs", "表情": "emoji smile",
    "笑脸": "smile happy", "哭脸": "sad cry", "愤怒": "angry",
    "惊讶": "surprised", "音乐": "music audio", "视频": "video movie",
    "播放": "play", "暂停": "pause", "停止": "stop", "录制": "record",
    "音量": "volume sound", "静音": "mute", "麦克风": "microphone",
    "扬声器": "speaker", "耳机": "headphone", "相机": "camera",
    "照片": "photo image", "图片": "image picture", "画廊": "gallery",
    "相册": "album", "编辑器": "editor", "文本": "text", "字体": "font",
    "颜色": "color", "背景": "background", "边框": "border", "阴影": "shadow",
    "渐变": "gradient", "透明": "transparent", "模糊": "blur",
    "亮度": "brightness", "对比度": "contrast", "饱和度": "saturation",
    "旋转": "rotate", "缩放": "zoom scale", "裁剪": "crop", "翻转": "flip",
    "对齐": "align", "居中": "center", "左对齐": "align left",
    "右对齐": "align right", "顶部": "top", "底部": "bottom",
    "中间": "middle center", "宽度": "width", "高度": "height",
    "大小": "size", "间距": "spacing gap", "边距": "margin padding",
    "填充": "padding fill", "布局": "layout", "网格": "grid",
    "列表": "list", "卡片": "card", "模态框": "modal dialog",
    "弹窗": "popup modal", "提示": "tooltip", "下拉": "dropdown select",
    "选择": "select choose", "复选框": "checkbox", "单选": "radio",
    "开关": "switch toggle", "滑块": "slider", "进度条": "progress bar",
    "加载": "loading spinner", "骨架屏": "skeleton", "占位符": "placeholder",
    "头像": "avatar profile", "徽章": "badge", "标签页": "tab",
    "面包屑": "breadcrumb", "分页器": "pagination", "步骤": "steps wizard",
    "向导": "wizard steps", "表单": "form", "输入框": "input field",
    "文本框": "textarea", "搜索框": "search input", "按钮": "button",
    "提交": "submit", "重置": "reset", "取消": "cancel", "确认": "confirm",
    "关闭": "close", "展开": "expand", "收起": "collapse",
    "显示": "show visible", "隐藏": "hide invisible", "禁用": "disabled",
    "启用": "enabled", "必填": "required", "可选": "optional",
    "验证": "validate", "格式": "format", "数字": "number",
    "整数": "integer", "小数": "decimal", "百分比": "percent",
    "货币": "currency money", "金额": "amount price", "价格": "price",
    "购物车": "shopping cart", "订单": "order", "商品": "product item",
    "库存": "inventory stock", "仓库": "warehouse", "物流": "logistics shipping",
    "配送": "delivery", "快递": "express", "包裹": "package",
    "发票": "invoice", "收据": "receipt", "报表": "report",
    "统计": "statistics", "分析": "analysis", "仪表盘": "dashboard",
    "概览": "overview", "详情": "detail", "摘要": "summary",
    "备注": "note", "附件": "attachment", "导出": "export",
    "导入": "import", "打印": "print", "扫描": "scan",
    "复制": "copy", "粘贴": "paste", "剪切": "cut",
    "撤销": "undo", "重做": "redo", "全选": "select all",
    "清空": "clear", "同步": "sync", "更新": "update",
    "升级": "upgrade", "安装": "install", "卸载": "uninstall",
    "重启": "restart", "关机": "shutdown", "电源": "power",
    "电池": "battery", "充电": "charging", "节能": "energy saving",
    "性能": "performance", "优化": "optimize", "加速": "accelerate",
    "减速": "decelerate", "开始": "start begin", "结束": "end finish",
    "完成": "complete done", "失败": "fail error", "重试": "retry",
    "跳过": "skip", "下一步": "next", "上一步": "previous",
    "第一页": "first page", "最后一页": "last page", "全部": "all",
    "部分": "partial", "无": "none empty", "空": "empty",
    "默认": "default", "自定义": "custom", "高级": "advanced",
    "简单": "simple basic", "快速": "quick fast", "慢速": "slow",
    "自动": "auto automatic", "手动": "manual", "智能": "smart intelligent",
    "人工智能": "AI artificial intelligence", "机器学习": "machine learning",
    "深度学习": "deep learning", "神经网络": "neural network",
    "算法": "algorithm", "模型": "model", "训练": "training",
    "预测": "prediction", "分类": "classification", "回归": "regression",
    "聚类": "clustering", "推荐": "recommendation", "分组": "group",
    "聚合": "aggregate", "计算": "calculate compute", "求和": "sum",
    "平均值": "average mean", "最大值": "maximum max",
    "最小值": "minimum min", "计数": "count", "比率": "ratio",
    "趋势": "trend", "增长": "growth increase",
    "下降": "decrease decline", "稳定": "stable", "波动": "fluctuate",
    "峰值": "peak", "低谷": "valley", "中位数": "median",
    "标准差": "standard deviation", "方差": "variance",
    "分布": "distribution", "概率": "probability", "随机": "random",
    "确定性": "deterministic", "不确定性": "uncertainty",
    "风险": "risk", "机会": "opportunity", "挑战": "challenge",
    "问题": "problem issue", "解决方案": "solution",
    "建议": "suggestion recommendation", "反馈": "feedback",
    "评价": "rating review", "评分": "score rating",
    "等级": "level grade", "排名": "ranking", "积分": "points score",
    "奖励": "reward", "惩罚": "punishment", "成就": "achievement",
    "证书": "certificate", "资质": "qualification", "技能": "skill",
    "经验": "experience", "教育": "education", "培训": "training",
    "学习": "learning", "考试": "exam test", "学位": "degree",
    "学历": "education", "专业": "major profession",
    "职业": "profession career", "工作": "work job",
    "职位": "position job", "公司": "company enterprise",
    "企业": "enterprise business", "组织": "organization",
    "团队": "team", "部门": "department", "员工": "employee staff",
    "经理": "manager", "主管": "supervisor", "领导": "leader",
    "老板": "boss", "客户": "customer client", "会员": "member",
    "访客": "visitor", "嘉宾": "guest", "主持人": "host moderator",
    "演讲者": "speaker", "听众": "audience", "参与者": "participant",
    "组织者": "organizer", "赞助商": "sponsor", "合作伙伴": "partner",
    "供应商": "supplier vendor", "分销商": "distributor",
    "代理商": "agent", "经销商": "dealer", "零售商": "retailer",
    "批发商": "wholesaler", "制造商": "manufacturer", "工厂": "factory",
    "车间": "workshop", "生产线": "production line",
    "设备": "equipment device", "工具": "tool", "材料": "material",
    "原料": "raw material", "成品": "finished product",
    "半成品": "semi-finished", "废品": "waste", "回收": "recycle",
    "环保": "environmental", "绿色": "green", "可持续": "sustainable",
    "创新": "innovation", "发明": "invention", "专利": "patent",
    "版权": "copyright", "商标": "trademark", "品牌": "brand",
    "营销": "marketing", "广告": "advertisement", "推广": "promotion",
    "销售": "sales", "购买": "purchase buy", "支付": "payment",
    "退款": "refund", "折扣": "discount", "优惠": "coupon",
    "活动": "activity event", "促销": "promotion sale",
    "节日": "festival holiday", "庆祝": "celebrate", "礼物": "gift present",
    "红包": "red packet", "抽奖": "lottery", "游戏": "game",
    "娱乐": "entertainment", "电影": "movie film", "电视剧": "TV series",
    "音乐": "music", "书籍": "book", "杂志": "magazine",
    "新闻": "news", "博客": "blog", "论坛": "forum",
    "社区": "community", "群组": "group", "话题": "topic",
    "标签": "tag", "热门": "hot popular", "最新": "latest newest",
    "推荐": "recommended", "精选": "featured", "排行": "ranking",
    "榜单": "list chart", "流行": "popular trendy", "经典": "classic",
    "复古": "retro vintage", "现代": "modern", "简约": "minimal simple",
    "复杂": "complex", "专业": "professional", "业余": "amateur",
    "正式": "formal", "休闲": "casual", "商务": "business",
    "个人": "personal", "公开": "public", "私有": "private",
    "保密": "confidential", "机密": "secret", "内部": "internal",
    "外部": "external", "本地": "local", "远程": "remote",
    "在线": "online", "离线": "offline", "实时": "real-time",
    "延迟": "delay latency", "同步": "sync", "异步": "async",
    "并发": "concurrent", "并行": "parallel", "串行": "serial",
    "批量": "batch", "单个": "single", "多个": "multiple",
    "全部": "all", "部分": "partial", "完整": "complete full",
    "片段": "fragment", "简介": "brief introduction", "描述": "description",
    "标题": "title", "名称": "name", "编号": "number ID",
    "标识": "identifier", "代码": "code", "缩写": "abbreviation",
    "全称": "full name", "别名": "alias", "昵称": "nickname",
    "用户名": "username", "密码": "password", "验证码": "verification code",
    "二维码": "QR code", "条形码": "barcode", "识别": "recognize",
    "检测": "detect", "监控": "monitor", "报警": "alarm alert",
    "预警": "warning", "提醒": "reminder", "短信": "SMS",
    "推送": "push", "订阅": "subscribe", "取消订阅": "unsubscribe",
    "关注": "follow", "粉丝": "follower fan", "好友": "friend",
    "联系人": "contact", "通讯录": "address book", "群聊": "group chat",
    "私信": "private message", "会话": "session", "历史": "history",
    "记录": "record log", "日志": "log", "追踪": "track trace",
    "定位": "locate location", "路线": "route path",
    "目的地": "destination", "起点": "start point", "终点": "end point",
    "距离": "distance", "时长": "duration", "速度": "speed",
    "加速度": "acceleration", "方向": "direction", "角度": "angle",
    "坐标": "coordinate", "维度": "dimension", "空间": "space",
    "平面": "plane", "立体": "3D three-dimensional", "圆形": "circle",
    "方形": "square", "三角形": "triangle", "矩形": "rectangle",
    "椭圆": "ellipse", "多边形": "polygon", "线条": "line",
    "曲线": "curve", "点": "point dot", "区域": "area region",
    "边界": "boundary border", "范围": "range scope", "区间": "interval",
    "段": "segment", "块": "block", "片": "piece", "层": "layer",
    "级": "level", "阶": "stage", "步": "step", "阶段": "phase stage",
    "过程": "process", "流程": "workflow", "状态": "status state",
    "转换": "transition", "变化": "change", "修改": "modify",
    "更新": "update", "调整": "adjust", "配置": "configure",
    "设置": "settings", "选项": "option", "参数": "parameter",
    "变量": "variable", "常量": "constant", "类型": "type",
    "格式": "format", "单位": "unit", "精度": "precision",
    "误差": "error margin", "容错": "fault tolerance", "备份": "backup",
    "恢复": "restore recover", "迁移": "migrate", "转换": "convert",
    "导入": "import", "导出": "export", "上传": "upload",
    "下载": "download", "同步": "sync", "异步": "async",
    "并发": "concurrent", "并行": "parallel", "分布式": "distributed",
    "集群": "cluster", "负载均衡": "load balance",
    "高可用": "high availability", "容灾": "disaster recovery",
    "备份": "backup", "恢复": "recovery", "监控": "monitoring",
    "日志": "logging", "追踪": "tracing", "调试": "debugging",
    "测试": "testing", "部署": "deployment", "发布": "release",
    "版本": "version", "更新": "update", "升级": "upgrade",
    "回滚": "rollback", "灰度": "gray release",
    "蓝绿": "blue-green", "金丝雀": "canary", "A/B测试": "A/B testing",
    "实验": "experiment", "试用": "trial", "演示": "demo",
    "示例": "example", "模板": "template", "预设": "preset",
    "扩展": "extension", "插件": "plugin", "组件": "component",
    "模块": "module", "库": "library", "框架": "framework",
    "平台": "platform", "系统": "system", "应用": "application app",
    "软件": "software", "硬件": "hardware", "设备": "device",
    "终端": "terminal", "客户端": "client", "服务端": "server",
    "接口": "interface API", "协议": "protocol", "标准": "standard",
    "规范": "specification", "文档": "documentation", "手册": "manual",
    "指南": "guide", "教程": "tutorial", "示例": "example",
    "案例": "case study", "最佳实践": "best practice",
    "设计模式": "design pattern", "架构": "architecture",
    "设计": "design", "原型": "prototype", "草图": "sketch",
    "线框图": "wireframe", "模型": "model", "视图": "view",
    "控制器": "controller", "路由": "route", "中间件": "middleware",
    "过滤器": "filter", "拦截器": "interceptor", "监听器": "listener",
    "观察者": "observer", "订阅者": "subscriber",
    "发布者": "publisher", "生产者": "producer", "消费者": "consumer",
    "队列": "queue", "栈": "stack", "堆": "heap", "树": "tree",
    "图": "graph", "链表": "linked list", "数组": "array",
    "矩阵": "matrix", "向量": "vector", "张量": "tensor",
    "标量": "scalar", "函数": "function", "方法": "method",
    "类": "class", "对象": "object", "实例": "instance",
    "属性": "property attribute", "字段": "field", "列": "column",
    "行": "row", "表": "table", "数据库": "database",
    "索引": "index", "查询": "query", "事务": "transaction",
    "锁": "lock", "并发": "concurrency", "隔离": "isolation",
    "持久化": "persistence", "缓存": "cache", "内存": "memory",
    "磁盘": "disk", "存储": "storage", "文件系统": "file system",
    "对象存储": "object storage", "块存储": "block storage",
    "网络存储": "network storage", "分布式存储": "distributed storage",
}


class TranslationService:
    def __init__(
        self,
        translation_dict: Optional[Dict[str, str]] = None,
        custom_dict_path: Optional[Path] = None,
    ):
        self.translation_dict = translation_dict or CHINESE_TO_ENGLISH.copy()
        self.custom_dict_path = custom_dict_path
        
        if custom_dict_path and custom_dict_path.exists():
            self._load_custom_dict(custom_dict_path)
    
    def _load_custom_dict(self, path: Path) -> None:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                custom_dict = json.load(f)
                self.translation_dict.update(custom_dict)
                logger.info(f"Loaded custom translations from {path}")
        except Exception as e:
            logger.warning(f"Failed to load custom translations: {e}")
    
    def save_custom_dict(self, path: Optional[Path] = None) -> None:
        save_path = path or self.custom_dict_path
        if not save_path:
            raise ValueError("No path specified for saving custom dict")
        
        try:
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, 'w', encoding='utf-8') as f:
                json.dump(self.translation_dict, f, ensure_ascii=False, indent=2)
            logger.info(f"Saved custom translations to {save_path}")
        except Exception as e:
            logger.error(f"Failed to save custom translations: {e}")
            raise
    
    def translate_chinese_to_english(self, text: str) -> str:
        if not re.search(r'[\u4e00-\u9fff]', text):
            return text
        
        remaining = text
        
        sorted_terms = sorted(self.translation_dict.keys(), key=len, reverse=True)
        
        for chinese in sorted_terms:
            if chinese in remaining:
                english = self.translation_dict[chinese]
                remaining = remaining.replace(chinese, f" {english} ")
        
        translated = " ".join(remaining.split())
        
        if translated != text:
            logger.info(f"Translated: '{text}' -> '{translated}'")
        
        return translated
    
    def add_translation(self, chinese: str, english: str) -> None:
        self.translation_dict[chinese] = english
        logger.info(f"Added translation: {chinese} -> {english}")
    
    def remove_translation(self, chinese: str) -> bool:
        if chinese in self.translation_dict:
            del self.translation_dict[chinese]
            logger.info(f"Removed translation: {chinese}")
            return True
        return False


_translation_service: Optional[TranslationService] = None


def get_translation_service(
    custom_dict_path: Optional[Path] = None,
) -> TranslationService:
    global _translation_service
    if _translation_service is None:
        _translation_service = TranslationService(custom_dict_path=custom_dict_path)
    return _translation_service


def translate_chinese_to_english(text: str) -> str:
    return get_translation_service().translate_chinese_to_english(text)
