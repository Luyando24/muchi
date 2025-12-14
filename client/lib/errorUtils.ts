/**
 * Error utility functions for capturing, logging, and reporting errors
 */

/**
 * Log detailed error information to console with component context
 */
export function logError(error: Error, componentName: string, additionalInfo?: Record<string, any>): void {
  console.error(`[${componentName} Error]`, error);
  
  if (additionalInfo) {
    console.error(`[${componentName} Context]`, additionalInfo);
  }
  
  console.error(`[${componentName} Stack]`, error.stack);
}

/**
 * Validate required props and log warnings for missing or invalid props
 */
export function validateProps(props: Record<string, any>, requiredProps: string[], componentName: string): boolean {
  let isValid = true;
  
  for (const prop of requiredProps) {
    if (props[prop] === undefined || props[prop] === null) {
      console.warn(`[${componentName}] Missing required prop: ${prop}`);
      isValid = false;
    }
  }
  
  return isValid;
}

/**
 * Safe render function that catches errors during component rendering
 */
export function safeRender<T>(renderFn: () => T, fallback: T, componentName: string): T {
  try {
    return renderFn();
  } catch (error) {
    logError(error as Error, componentName, { message: 'Error during render' });
    return fallback;
  }
}

/**
 * Report error to a monitoring service (placeholder for actual implementation)
 */
export function reportError(error: Error, componentName: string, metadata?: Record<string, any>): void {
  // This would connect to your error monitoring service like Sentry
  console.error(`[ERROR REPORT] ${componentName}:`, error);
  
  // Example implementation for when you add error monitoring:
  // if (typeof window !== 'undefined' && window.errorReportingService) {
  //   window.errorReportingService.captureException(error, {
  //     tags: { component: componentName },
  //     extra: metadata
  //   });
  // }
}