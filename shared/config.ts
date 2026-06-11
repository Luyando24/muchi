/**
 * Shared configuration module.
 * Safely parses environment variables from either Node.js (process.env) or Vite (import.meta.env).
 */

const getEnv = (key: string): string | undefined => {
  // Check Node.js process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  // Check Vite import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteKey = `VITE_${key}`;
    return import.meta.env[viteKey] || (import.meta.env as any)[key];
  }
  return undefined;
};

export const CONFIG = {
  server: {
    get port(): number {
      const p = getEnv('PORT') || getEnv('SERVER_PORT') || '3000';
      return parseInt(p, 10);
    },
    get baseUrl(): string {
      return getEnv('SERVER_URL') || `http://localhost:${this.port}`;
    }
  },
  client: {
    get port(): number {
      const p = getEnv('CLIENT_PORT') || '5173';
      return parseInt(p, 10);
    },
    get baseUrl(): string {
      return getEnv('CLIENT_URL') || `http://localhost:${this.port}`;
    }
  }
};
export default CONFIG;
