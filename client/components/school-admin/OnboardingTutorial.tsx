import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Users, 
  GraduationCap, 
  Settings, 
  Globe, 
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  PartyPopper,
  Play,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface Step {
  title: string;
  description: string;
  icon: any;
  targetId?: string;
  tab?: string;
}

const steps: Step[] = [
  {
    title: "Welcome to MUCHI!",
    description: "We are happy to have your institution on board. This quick tour will help you set up your school for success.",
    icon: PartyPopper,
    tab: "dashboard"
  },
  {
    title: "Import Students",
    description: "The first step is adding your students. Navigate to the 'Students' tab to bulk import your entire student body via Excel.",
    icon: Users,
    targetId: "sidebar-students",
    tab: "students"
  },
  {
    title: "Manage Teachers",
    description: "Add your teaching staff and assign them to subjects and classes in the 'Teachers' module.",
    icon: GraduationCap,
    targetId: "sidebar-teachers",
    tab: "teachers"
  },
  {
    title: "Academics & Results",
    description: "Set up your academic structure. Manage subjects, grading scales, and examination results to keep track of student performance.",
    icon: BookOpen,
    targetId: "sidebar-academics",
    tab: "academics"
  },
  {
    title: "Institutional Branding",
    description: "Make the platform yours! Go to 'Settings' to add your school logo, motto, and contact details for official reports.",
    icon: Settings,
    targetId: "sidebar-settings",
    tab: "settings"
  },
  {
    title: "Your School Website",
    description: "Every school on MUCHI gets its own public website. Use the 'Website' tab to manage your public presence.",
    icon: Globe,
    targetId: "sidebar-website",
    tab: "website"
  }
];

interface OnboardingTutorialProps {
  onComplete: () => void;
  onStepChange?: (tab: string) => void;
  userId: string;
}

export default function OnboardingTutorial({ onComplete, onStepChange, userId }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [coords, setCoords] = useState<{ x: number, y: number, w: number, h: number, centered: boolean }>({ x: 0, y: 0, w: 0, h: 0, centered: true });

  const calculatePosition = () => {
    const activeStep = steps[currentStep];
    if (!activeStep.targetId) {
      setCoords({ x: 0, y: 0, w: 0, h: 0, centered: true });
      return;
    }

    const element = document.getElementById(activeStep.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      const isMobile = window.innerWidth < 1024;

      if (isMobile) {
        setCoords({ x: rect.left, y: rect.top, w: rect.width, h: rect.height, centered: true });
      } else {
        setCoords({ 
          x: rect.left, 
          y: rect.top, 
          w: rect.width,
          h: rect.height,
          centered: false 
        });
      }
    } else {
      setCoords({ x: 0, y: 0, w: 0, h: 0, centered: true });
    }
  };

  useEffect(() => {
    const timer = setTimeout(calculatePosition, 400); 
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [currentStep]);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      
      if (onStepChange && steps[nextStepIndex].tab) {
        onStepChange(steps[nextStepIndex].tab!);
      }
    } else {
      setIsFinishing(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ has_completed_onboarding: true })
          .eq('id', userId);
        
        if (error) throw error;
        
        if (onStepChange) onStepChange('dashboard');
        onComplete();
      } catch (error) {
        console.error('Error completing onboarding:', error);
        if (onStepChange) onStepChange('dashboard');
        onComplete();
      }
    }
  };

  const activeStep = steps[currentStep];

  const modalHeightEstimate = 500; 
  const margin = 20;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  const clampedY = coords.centered 
    ? vh / 2 
    : Math.max(
        modalHeightEstimate / 2 + margin,
        Math.min(
          coords.y + coords.h / 2,
          vh - modalHeightEstimate / 2 - margin
        )
      );

  const cardX = coords.centered ? '50%' : (coords.x + coords.w + 40);
  const cardY = clampedY;
  const arrowYOffset = !coords.centered ? (coords.y + coords.h / 2) - clampedY : 0;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
      {/* 
          SVG Mask System for 100% Clarity 
          We use an SVG mask to define the 'hole'. 
          The hole is black (transparent in mask) and the rest is white (opaque in mask).
      */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            {/* The white part covers the whole screen (showing the overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* The black part creates the transparency (the 'hole') */}
            {!coords.centered && (
              <motion.rect
                initial={false}
                animate={{
                  x: coords.x - 12,
                  y: coords.y - 12,
                  width: coords.w + 24,
                  height: coords.h + 24,
                }}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* We apply the mask to a rect that has both color and backdrop-blur */}
        <rect 
          x="0" 
          y="0" 
          width="100%" 
          height="100%" 
          fill="rgba(15, 23, 42, 0.75)" 
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Pulsing Pointer */}
      {!coords.centered && (
        <motion.div
          initial={false}
          animate={{
            top: coords.y + coords.h / 2,
            left: coords.x + coords.w + 15,
          }}
          className="absolute z-[102] w-8 h-8 -translate-y-1/2 flex items-center justify-center pointer-events-none"
        >
          <div className="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-70" />
          <div className="absolute w-4 h-4 bg-blue-600 rounded-full shadow-2xl shadow-blue-500/80 border-2 border-white" />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            left: cardX,
            top: cardY,
            translateX: coords.centered ? '-50%' : '0%',
            translateY: '-50%'
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", damping: 25, stiffness: 150 }}
          className="fixed w-full max-w-sm pointer-events-auto z-[103]"
        >
          <Card className="border-none shadow-2xl shadow-blue-500/40 overflow-hidden rounded-[32px] relative bg-white dark:bg-slate-900 max-h-[calc(100vh-40px)] flex flex-col">
            {!coords.centered && (
              <div 
                style={{ top: `calc(50% + ${arrowYOffset}px)` }}
                className="absolute left-[-8px] -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-900 rotate-45 border-l border-b border-slate-100 dark:border-slate-800 z-10" 
              />
            )}
            
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            
            <CardHeader className="text-center pt-8 pb-4 relative px-6">
              <div className="absolute top-3 right-4 text-[11px] font-black text-slate-400 bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-slate-200 dark:border-zinc-700">
                Step {currentStep + 1} of {steps.length}
              </div>
              
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/10 rotate-3">
                <activeStep.icon className="h-8 w-8 text-blue-600" />
              </div>
              
              <CardTitle className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {activeStep.title}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6 pb-10 px-10 overflow-y-auto custom-scrollbar">
              <p className="text-center text-slate-600 dark:text-slate-400 text-lg leading-relaxed font-semibold">
                {activeStep.description}
              </p>
              
              <Button 
                onClick={handleNext}
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xl rounded-2xl shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.98]"
                disabled={isFinishing}
              >
                {isFinishing ? (
                  "Almost there..."
                ) : currentStep === steps.length - 1 ? (
                  "Launch Portal"
                ) : (
                  <>Continue <ArrowRight className="ml-2 h-6 w-6" /></>
                )}
              </Button>
              
              {currentStep === 0 && (
                <div className="flex items-center justify-center gap-2 text-[11px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 py-2 rounded-xl">
                  Mandatory Institution Setup
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
