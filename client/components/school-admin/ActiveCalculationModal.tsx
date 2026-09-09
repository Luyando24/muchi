import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  Building2,
  Layers,
  Activity,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ActiveWorkerProgressData {
  isCalculating: boolean;
  currentSchoolId: string | null;
  currentSchoolName: string | null;
  currentClassLabel: string | null;
  queuedSchoolsCount: number;
  isCompilingPdf?: boolean;
  activePdfSchoolId?: string | null;
  activePdfClassLabel?: string | null;
  activeSchoolStatus: {
    schoolId: string;
    schoolName: string;
    totalClasses: number;
    calculatedClasses: number;
    remainingClasses: number;
    progressPercentage: number;
    isCompleted: boolean;
    isCurrentlyCalculating: boolean;
    currentClassLabel: string | null;
    estimatedTimeText: string;
    // PDF build process metrics
    totalPdfs?: number;
    builtPdfs?: number;
    remainingPdfs?: number;
    pdfProgressPercentage?: number;
    isPdfCompleted?: boolean;
    isCurrentlyBuildingPdf?: boolean;
    activePdfLabel?: string | null;
    estPdfTimeText?: string;
    terms: {
      term: string;
      academicYear: string;
      totalClasses: number;
      calculatedClasses: number;
      remainingClasses: number;
      classes: {
        classId: string;
        className: string;
        examType: string;
        isCalculated: boolean;
        isPdfReady?: boolean;
        cachedAt: string | null;
        studentCount: number;
      }[];
    }[];
  } | null;
}

interface ActiveCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpointUrl?: string; // default '/api/school/results/active-worker-progress'
}

export default function ActiveCalculationModal({
  isOpen,
  onClose,
  endpointUrl = '/api/school/results/active-worker-progress',
}: ActiveCalculationModalProps) {
  const [data, setData] = useState<ActiveWorkerProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProgress = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(endpointUrl, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch active worker progress:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProgress();
      const interval = setInterval(fetchProgress, 2500);
      return () => clearInterval(interval);
    }
  }, [isOpen, endpointUrl]);

  const activeStatus = data?.activeSchoolStatus;
  const isCalculating = data?.isCalculating || !!data?.currentSchoolName;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 gap-0 border-indigo-200 dark:border-indigo-900 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white border-b border-indigo-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Real-Time Calculation Progress
                  {isCalculating && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-indigo-200 text-xs mt-0.5">
                  Live background worker stream calculating student scores, rankings, and report cards
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProgress}
              disabled={isLoading}
              className="border-indigo-400/40 text-indigo-100 hover:bg-white/10 hover:text-white text-xs h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950">
          {!isCalculating && !activeStatus ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Calculation Worker Idle</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                All submitted classes and school report cards across the system are currently up to date.
              </p>
            </div>
          ) : (
            <>
              {/* Active School Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 font-bold px-2 py-0.5 text-xs">
                        <Zap className="h-3 w-3 mr-1 fill-amber-500" /> Active School
                      </Badge>
                      {data?.queuedSchoolsCount ? (
                        <span className="text-xs text-slate-500">
                          {data.queuedSchoolsCount} more schools queued
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      {data?.currentSchoolName || activeStatus?.schoolName || 'Active School'}
                    </h3>
                  </div>

                  {data?.currentClassLabel && (
                    <div className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 rounded-lg flex items-center gap-2.5 self-start sm:self-auto">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="text-left">
                        <div className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400">Computing Class</div>
                        <div className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[220px]">
                          {data.currentClassLabel}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stage 1: Calculation Progress bar */}
                {activeStatus && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Stage 1: Scores & Rankings ({activeStatus.calculatedClasses} of {activeStatus.totalClasses} classes calculated)
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {activeStatus.progressPercentage}%
                      </span>
                    </div>
                    <Progress value={activeStatus.progressPercentage} className="h-2.5 bg-slate-100 dark:bg-slate-800" />
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>{activeStatus.remainingClasses} classes remaining</span>
                      <span>Est: {activeStatus.estimatedTimeText}</span>
                    </div>
                  </div>
                )}

                {/* Stage 2: Background PDF Compilation bar */}
                {activeStatus && (
                  <div className="space-y-2 pt-2 border-t border-purple-100 dark:border-purple-900/40">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300">
                        <span>Stage 2: Pre-Built PDFs ({activeStatus.builtPdfs ?? 0} of {activeStatus.totalClasses} compiled)</span>
                        {(activeStatus.isCurrentlyBuildingPdf || data?.isCompilingPdf) && (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center gap-1 font-semibold animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" /> Compiling: {activeStatus.activePdfLabel || data?.activePdfClassLabel}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {activeStatus.pdfProgressPercentage ?? 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          activeStatus.isPdfCompleted ? 'bg-emerald-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${activeStatus.pdfProgressPercentage ?? 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>{activeStatus.remainingPdfs ?? 0} PDFs remaining</span>
                      <span>Est: {activeStatus.estPdfTimeText || 'Calculating…'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Class by Class Checklist for the Active School */}
              {activeStatus && activeStatus.terms && activeStatus.terms.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-500" />
                      Class Breakdown for {activeStatus.schoolName}
                    </h4>
                    <span className="text-xs text-slate-400">
                      Live auto-updates every 2.5s
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {activeStatus.terms.map((termGroup) => (
                      <div
                        key={`${termGroup.term}-${termGroup.academicYear}`}
                        className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2.5"
                      >
                        <div className="flex justify-between items-center text-xs border-b pb-2 dark:border-slate-800">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {termGroup.term} ({termGroup.academicYear})
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {termGroup.calculatedClasses} / {termGroup.totalClasses} calculated
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {termGroup.classes.map((cls) => {
                            const isBeingComputedNow = data?.currentClassLabel?.includes(cls.className);

                            return (
                              <div
                                key={`${cls.classId}-${cls.examType}`}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                                  cls.isCalculated
                                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-300'
                                    : isBeingComputedNow
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 animate-pulse'
                                    : 'bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  {cls.isCalculated ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  ) : isBeingComputedNow ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 shrink-0" />
                                  ) : (
                                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  )}
                                  <span className="font-semibold truncate">{cls.className}</span>
                                  <span className="text-[10px] text-slate-400 shrink-0">({cls.examType})</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {cls.isPdfReady && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                      PDF ⚡
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold uppercase">
                                    {cls.isCalculated ? 'Ready' : isBeingComputedNow ? 'Calculating' : 'Waiting'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button onClick={onClose} variant="outline" size="sm" className="font-semibold">
            Close Monitor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
