import React from 'react';
import { Sparkles } from 'lucide-react';

export default function FloatingAdvisorChat({ sharedData }: { sharedData?: any }) {
  const handleOpenAdvisor = () => {
    const isSubdomain = window.location.hostname.startsWith('system.');
    const path = isSubdomain ? '/business-advisor' : '/system-admin/business-advisor';
    const url = `${window.location.origin}${path}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleOpenAdvisor}
        className="h-14 w-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-2xl transition-all border border-blue-400/20 active:scale-95 focus:outline-none hover:shadow-blue-500/25 hover:shadow-lg hover:scale-105"
        title="Open Business Advisor in a new tab"
      >
        <Sparkles className="h-6 w-6 animate-pulse" />
      </button>
    </div>
  );
}
