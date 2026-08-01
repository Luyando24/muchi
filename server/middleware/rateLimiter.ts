import { Request, Response, NextFunction } from 'express';

const ipRequests = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (options: { windowMs: number; max: number; message?: string }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Determine the IP address of the requester
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Use the declared route pattern so changing a path parameter cannot bypass the limit.
    const routePattern = req.route?.path || req.baseUrl || req.path;
    const key = `${req.method}:${req.baseUrl}${routePattern}:${ip}`;
    let requestRecord = ipRequests.get(key);

    if (!requestRecord || now > requestRecord.resetTime) {
      requestRecord = {
        count: 1,
        resetTime: now + options.windowMs
      };
      ipRequests.set(key, requestRecord);
      return next();
    }

    if (requestRecord.count >= options.max) {
      return res.status(429).json({
        message: options.message || 'Too many requests, please try again later.'
      });
    }

    requestRecord.count++;
    return next();
  };
};
