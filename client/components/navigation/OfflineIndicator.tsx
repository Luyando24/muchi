import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOffline } from '@/hooks/useOffline';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/offline';

export const OfflineIndicator = () => {
  const { isOnline } = useOffline();
  const pendingSync = useLiveQuery(() => db.pendingSync.count());

  if (isOnline && (!pendingSync || pendingSync === 0)) {
    return (
      <Badge variant="outline" className="flex items-center gap-2 text-emerald-600 border-emerald-200 bg-emerald-50">
        <Wifi className="h-3.5 w-3.5" />
        Online
      </Badge>
    );
  }

  if (isOnline && pendingSync && pendingSync > 0) {
    return (
      <Badge variant="outline" className="flex items-center gap-2 text-blue-600 border-blue-200 bg-blue-50 animate-pulse">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Syncing {pendingSync}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-2 text-amber-600 border-amber-200 bg-amber-50">
      <WifiOff className="h-3.5 w-3.5" />
      Offline {pendingSync ? `(${pendingSync} pending)` : ''}
    </Badge>
  );
};
