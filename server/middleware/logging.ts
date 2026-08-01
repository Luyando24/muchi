import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { contextStorage, Logger } from '../lib/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const isAnonymousFeedingFeedback = (req.originalUrl || req.url).startsWith('/api/public/feeding-feedback');
  const requestId = isAnonymousFeedingFeedback
    ? crypto.randomUUID()
    : ((req.headers['x-request-id'] as string) || crypto.randomUUID());
  const loggedUrl = isAnonymousFeedingFeedback
    ? '/api/public/feeding-feedback/[redacted]'
    : (req.originalUrl || req.url);
  res.setHeader('x-request-id', requestId);

  contextStorage.run({ requestId }, () => {
    const startTime = process.hrtime();

    Logger.info(`Incoming Request: ${req.method} ${loggedUrl}`, {
      method: req.method,
      url: loggedUrl,
      ...(isAnonymousFeedingFeedback
        ? { privacy: 'anonymous-channel' }
        : { ip: req.ip, userAgent: req.headers['user-agent'] })
    });

    res.on('finish', () => {
      const diff = process.hrtime(startTime);
      const latencyMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

      Logger.info(`Request Completed: ${req.method} ${loggedUrl} - ${res.statusCode} in ${latencyMs}ms`, {
        method: req.method,
        url: loggedUrl,
        statusCode: res.statusCode,
        latencyMs: parseFloat(latencyMs)
      });
    });

    next();
  });
};

export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const requestUrl = req.originalUrl || req.url;
  const loggedUrl = requestUrl.startsWith('/api/public/feeding-feedback')
    ? '/api/public/feeding-feedback/[redacted]'
    : requestUrl;

  Logger.error(`Request Error: ${req.method} ${loggedUrl} - ${statusCode}`, {
    method: req.method,
    url: loggedUrl,
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
