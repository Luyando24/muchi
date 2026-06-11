export const activeUsers = new Map<string, number>();

export const trackActiveUser = (identifier: string) => {
  activeUsers.set(identifier, Date.now());
};

export const getActiveUsersCount = (timeWindowMs: number = 15 * 60 * 1000): number => {
  const cutoff = Date.now() - timeWindowMs;
  let count = 0;
  
  for (const [identifier, lastSeen] of activeUsers.entries()) {
    if (lastSeen > cutoff) {
      count++;
    } else {
      activeUsers.delete(identifier);
    }
  }
  
  return count;
};
