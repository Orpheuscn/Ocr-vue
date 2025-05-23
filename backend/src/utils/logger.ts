/**
 * 日志工具
 * 提供统一的日志记录功能
 */

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

class SimpleLogger implements Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] [${this.name}] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  }

  info(message: string, meta?: any): void {
    console.log(`[INFO] [${this.name}] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] [${this.name}] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  error(message: string, meta?: any): void {
    console.error(`[ERROR] [${this.name}] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }
}

export function getLogger(name: string): Logger {
  return new SimpleLogger(name);
}
