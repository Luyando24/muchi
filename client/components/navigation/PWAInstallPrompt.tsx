import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  ArrowUpCircle,
  X,
  Layout
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if the app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone || 
                        document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    const checkDismissal = () => {
      const dismissedAt = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissedAt) return true;
      
      const fiveMinutes = 5 * 60 * 1000;
      return Date.now() - parseInt(dismissedAt) > fiveMinutes;
    };

    if (isIos) {
      setPlatform('ios');
      // On iOS, we show the prompt after a small delay if not standalone
      const timer = setTimeout(() => {
        if (checkDismissal()) setShowPrompt(true);
      }, 3000);
      
      const interval = setInterval(() => {
        if (!showPrompt && checkDismissal()) setShowPrompt(true);
      }, 30000); // Check every 30 seconds

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    } else if (isAndroid) {
      setPlatform('android');
      
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        if (checkDismissal()) setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      
      const interval = setInterval(() => {
        if (!showPrompt && deferredPrompt && checkDismissal()) setShowPrompt(true);
      }, 30000); // Check every 30 seconds

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        clearInterval(interval);
      };
    }
  }, [showPrompt, deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    // Remember dismissal timestamp to allow reappearance after 5 minutes
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 lg:bottom-6 z-[100] px-4 animate-in fade-in slide-in-from-bottom-10 duration-500">
      <Card className="max-w-md mx-auto shadow-2xl border-blue-100 dark:border-blue-900 overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <CardContent className="p-0">
          <div className="relative p-5">
            <button 
              onClick={dismissPrompt}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="bg-blue-600 rounded-2xl p-3 shadow-lg shadow-blue-200 dark:shadow-none">
                <Layout className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="font-black text-slate-900 dark:text-white text-lg">Install MUCHI App</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                  Add to your home screen for a faster, full-screen experience and offline access.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {platform === 'android' ? (
                <Button 
                  onClick={handleInstallClick}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-black text-base shadow-xl shadow-blue-100 dark:shadow-none"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Install Now
                </Button>
              ) : platform === 'ios' ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">How to install on iOS:</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-md shadow-sm">
                        <Share className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Tap the <span className="text-blue-600">Share</span> button in Safari
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-md shadow-sm">
                        <PlusSquare className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Select <span className="text-blue-600">"Add to Home Screen"</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-tighter">
              Works like a native app • No App Store needed
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
