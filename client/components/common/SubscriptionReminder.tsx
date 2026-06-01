import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SubscriptionReminderProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: () => void;
  schoolName: string;
  variant?: 'renew' | 'onboarding';
  setupProgress?: number;
  rewardDays?: number;
  rewardClaimed?: boolean;
  onClaimReward?: () => Promise<void>;
  isMandatory?: boolean;
}

export default function SubscriptionReminder({ 
  isOpen, 
  onClose, 
  onSnooze, 
  schoolName, 
  variant = 'renew',
  setupProgress = 0,
  rewardDays = 30,
  rewardClaimed = false,
  onClaimReward,
  isMandatory = false
}: SubscriptionReminderProps) {
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isMandatory) onClose(); }}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white border-slate-200 text-slate-900 rounded-2xl shadow-2xl">
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              {isOnboarding ? 'Onboarding & Support' : 'Subscription Status'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 mt-1">
              {isOnboarding ? 'Complete School Setup' : 'Renew School Subscription'}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
              {isOnboarding ? (
                <>
                  Thank you for trying out the MUCHI system! Your trial period for <strong className="text-slate-900 font-bold">{schoolName}</strong> has completed. 
                  {!rewardClaimed && (
                    <div className={`my-3 border rounded-xl p-4 text-sm font-semibold ${
                      setupProgress === 100 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
                        : 'bg-indigo-50 border-indigo-100 text-indigo-900'
                    }`}>
                      {setupProgress === 100 ? (
                        <>
                          🎉 <strong>Setup 100% Completed!</strong> You have successfully completed your school configuration and unlocked <strong>{rewardDays} days of free usage</strong>! Claim them below to instantly extend your access.
                        </>
                      ) : (
                        <>
                          🎁 <strong>Trial Extension Incentive:</strong> Complete 100% of your school setup (classes, subjects, and teacher allocations) to unlock <strong>{rewardDays} days of free usage</strong>! You are currently at <strong>{setupProgress}%</strong>. Complete it to claim your reward before you pay!
                        </>
                      )}
                    </div>
                  )}
                  <p className="mt-3">
                    Since you are still setting up your portal, we'd love to help you get fully onboarded! Contact our support team for a free trial extension, raw data migration, or staff training.
                  </p>
                </>
              ) : (
                <>
                  Thank you for trying out the MUCHI system! Your trial period for <strong className="text-slate-900 font-bold">{schoolName}</strong> has completed.
                  {!rewardClaimed && (
                    <div className={`my-3 border rounded-xl p-4 text-sm font-semibold ${
                      setupProgress === 100 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
                        : 'bg-indigo-50 border-indigo-100 text-indigo-900'
                    }`}>
                      {setupProgress === 100 ? (
                        <>
                          🎉 <strong>Setup 100% Completed!</strong> You have successfully completed your school configuration and unlocked <strong>{rewardDays} days of free usage</strong>! Claim them below to instantly extend your access.
                        </>
                      ) : (
                        <>
                          🎁 <strong>Trial Extension Incentive:</strong> Complete 100% of your school setup (classes, subjects, and teacher allocations) to unlock <strong>{rewardDays} days of free usage</strong>! You are currently at <strong>{setupProgress}%</strong>. Complete it to claim your reward before you pay!
                        </>
                      )}
                    </div>
                  )}
                  <p className="mt-3">
                    To ensure uninterrupted access to the admin dashboard, gradebooks, financial records, and reports for all your teachers and students, please activate a license.
                  </p>
                </>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {isOnboarding ? 'Onboarding Benefits:' : 'Included Features:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-600">
                {isOnboarding ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Free Setup Guidance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Staff Training & Demos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Bulk Data Upload Help</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Direct WhatsApp Support</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Gradebooks & Report Cards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Tuition & Fee Ledger</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Teacher & Student Portals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Daily Attendance & Schedules</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {!rewardClaimed && setupProgress === 100 && onClaimReward ? (
              <Button
                className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all duration-200 py-6 text-base rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-emerald-600/10 animate-pulse"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await onClaimReward();
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                )}
                Claim {rewardDays} Free Days Now!
              </Button>
            ) : (
              <Button
                className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all duration-200 py-6 text-base rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-emerald-600/10"
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
            )}
            {!isMandatory && (
              <Button
                variant="ghost"
                className="w-full sm:w-auto hover:bg-slate-100 text-slate-500 hover:text-slate-800 font-medium py-6 text-sm rounded-xl"
                onClick={onSnooze}
              >
                <Clock className="h-4 w-4 mr-2" />
                Remind me in 3 days
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
