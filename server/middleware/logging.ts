import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { contextStorage, Logger } from '../lib/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);

  contextStorage.run({ requestId }, () => {
    const startTime = process.hrtime();

    Logger.info(`Incoming Request: ${req.method} ${req.originalUrl || req.url}`, {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.on('finish', () => {
      const diff = process.hrtime(startTime);
      const latencyMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

      Logger.info(`Request Completed: ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} in ${latencyMs}ms`, {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        latencyMs: parseFloat(latencyMs)
      });
    });

    next();
  });
};

export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;

  Logger.error(`Request Error: ${req.method} ${req.originalUrl || req.url} - ${statusCode}`, {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode,
    errorMessage: err.message,
    stack: err.stack
  });

  if (!res.headersSent) {
    res.status(statusCode).json({
      message: err.message || 'Internal Server Error'
    });
  } else {
    next(err);
  }
};
