import { configManager } from './config-manager';
import { LLMConfig } from '@/types/api';

export const configService = {
  /**
   * 获取当前配置
   * 优先获取 password mode 的配置（虽然前端只有部分信息），
   * 如果不是 password mode，则获取本地激活的配置
   */
  getCurrentConfig(): Partial<LLMConfig> {
    // 检查是否是密码模式
    if (typeof window !== 'undefined' && localStorage.getItem('smart-diagram-use-password') === 'true') {
      return {
        type: 'password-mode', // 标记类型
        // 密码模式下，baseUrl/model 等信息可能需要从服务端获取，或者硬编码，或者存储在 localStorage
        // 这里假设密码模式下，前端主要负责传递 access-password，具体配置由后端决定
        // 但为了兼容 validateConfig，可能需要返回一些占位符
        isPasswordMode: true
      };
    }
    
    // 否则返回本地激活配置
    return configManager.getActiveConfig() || {};
  },

  /**
   * 验证配置
   */
  validateConfig(config: Partial<LLMConfig>): { isValid: boolean; errors: string[] } {
    if (config && config.isPasswordMode) {
      // 密码模式下，主要验证是否有 access password
      const accessPassword = typeof window !== 'undefined' ? localStorage.getItem('smart-diagram-access-password') : '';
      if (!accessPassword) {
        return { isValid: false, errors: ['请先输入访问密码'] };
      }
      return { isValid: true, errors: [] };
    }

    return configManager.validateConfig(config);
  },

  /**
   * 判断是否是密码模式
   */
  isPasswordMode(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('smart-diagram-use-password') === 'true';
  },

  /**
   * 保存密码模式设置
   */
  setPasswordMode(usePassword: boolean, password?: string): void {
    if (typeof window === 'undefined') return;
    if (usePassword) {
      localStorage.setItem('smart-diagram-use-password', 'true');
      if (password) {
        localStorage.setItem('smart-diagram-access-password', password);
      }
    } else {
      localStorage.setItem('smart-diagram-use-password', 'false');
      localStorage.removeItem('smart-diagram-access-password');
    }
  },
  
  /**
   * 暴露 configManager 的其他方法
   */
  get activeConfigId(): string | null {
    return configManager.activeConfigId;
  },
  
  loadConfigs(): void {
    return configManager.loadConfigs();
  },
  
  saveConfigs(): void {
    return configManager.saveConfigs();
  }
};

// 导出 configManager 以保持兼容
export { configManager };
