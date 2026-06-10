import { AsyncLocalStorage } from 'node:async_hooks';

export interface LogStore {
  requestId: string;
}

export const contextStorage = new AsyncLocalStorage<LogStore>();

export class Logger {
  private static formatLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: any) {
    const store = contextStorage.getStore();
    const logObject = {
      timestamp: new Date().toISOString(),
      level,
      requestId: store?.requestId || null,
      message,
      ...(context && { context })
    };
    return JSON.stringify(logObject);
  }

  static info(message: string, context?: any) {
    console.log(this.formatLog('info', message, context));
  }

  static warn(message: string, context?: any) {
    console.warn(this.formatLog('warn', message, context));
  }

  static error(message: string, context?: any) {
    console.error(this.formatLog('error', message, context));
  }

  static debug(message: string, context?: any) {
    console.debug(this.formatLog('debug', message, context));
  }
}
