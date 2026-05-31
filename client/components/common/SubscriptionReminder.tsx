import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SubscriptionReminderProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: () => void;
  schoolName: string;
  variant?: 'renew' | 'onboarding';
}

export default function SubscriptionReminder({ isOpen, onClose, onSnooze, schoolName, variant = 'renew' }: SubscriptionReminderProps) {
  const [whatsappNumber, setWhatsappNumber] = useState("260570260374");
  const [loading, setLoading] = useState(false);

  const isOnboarding = variant === 'onboarding';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.whatsapp_number) {
            setWhatsappNumber(data.whatsapp_number);
          }
        }
      } catch (error) {
        console.error('Failed to fetch whatsapp number', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const handleWhatsAppClick = () => {
    const text = encodeURIComponent(
      isOnboarding
        ? `Hello, I am the school admin for ${schoolName}. We are setting up our portal and would like assistance with onboarding and trial options.`
        : `Hello, I am the school admin for ${schoolName}. I need assistance with our school subscription renewal.`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-slate-900 border-slate-800 text-white rounded-2xl shadow-2xl">
        {/* Decorative Top Gradient bar */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 animate-pulse" />
        
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
                {isOnboarding ? 'Onboarding & Support' : 'Subscription Status'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-100 mt-0.5">
                {isOnboarding ? 'Complete School Setup' : 'Renew School Subscription'}
              </h3>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal">
              {isOnboarding ? (
                <>
                  Your trial period for <strong className="text-white font-bold">{schoolName}</strong> has completed. Since you are still setting up your portal, we'd love to help you get fully onboarded! Contact our support team for a free trial extension, raw data migration, or staff training.
                </>
              ) : (
                <>
                  Your trial period for <strong className="text-white font-bold">{schoolName}</strong> has completed. To ensure uninterrupted access to the admin dashboard, gradebooks, financial records, and reports for all your teachers and students, please activate a license.
                </>
              )}
            </p>

            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {isOnboarding ? 'Onboarding Benefits:' : 'Included Features:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-300">
                {isOnboarding ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Free Setup Guidance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Staff Training & Demos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Bulk Data Upload Help</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Direct WhatsApp Support</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Gradebooks & Report Cards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Tuition & Fee Ledger</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Teacher & Student Portals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Daily Attendance & Schedules</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              className="w-full sm:flex-1 bg-green-600 hover:bg-green-500 text-white font-bold transition-all duration-200 py-6 text-base rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-green-900/20"
              onClick={handleWhatsAppClick}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
              )}
              {isOnboarding ? 'Contact Support for Setup Help' : 'Contact Support to Renew'}
            </Button>
            <Button
              variant="ghost"
              className="w-full sm:w-auto hover:bg-slate-800 text-slate-400 hover:text-white font-medium py-6 text-sm rounded-xl"
              onClick={onSnooze}
            >
              <Clock className="h-4 w-4 mr-2" />
              Remind me in 3 days
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
