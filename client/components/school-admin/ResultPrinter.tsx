import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Printer,
    Download,
    Search,
    Filter,
    Loader2,
    FileCheck,
    CheckCircle2,
    AlertCircle,
    Eye,
    Settings,
    PlusCircle,
    CheckCheck,
    Zap,
    Clock,
    Hourglass,
    ArrowRight,
    Gauge,
    RefreshCw,
    Layers,
    Sparkles,
    Activity,
    Lock,
    FileText,
    Check,
    Archive,
    FolderArchive
} from 'lucide-react';
import ActiveCalculationModal from '@/components/school-admin/ActiveCalculationModal';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { syncFetch } from '@/lib/syncService';
import { ReportCardContent } from '@/components/shared/ReportCardContent';

interface Class {
    id: string;
    name: string;
}

interface Student {
    id: string;
    full_name: string;
    student_number: string;
}

export default function ResultPrinter() {
    const navigate = useNavigate();
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [availableExamTypes, setAvailableExamTypes] = useState<string[]>(['Mid Term', 'End of Term']);
    const [isLoading, setIsLoading] = useState(true);
    const [previewData, setPreviewData] = useState<any | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [simplifiedAssessmentMode, setSimplifiedAssessmentMode] = useState<boolean>(false);
    const [isBlockerOpen, setIsBlockerOpen] = useState(false);
    const [blockerMessage, setBlockerMessage] = useState("");

    // Cache for pre-warmed school images (base64), loaded during fetchInitialData
    const preWarmedSchoolRef = useRef<any>(null);

    const [filters, setFilters] = useState({
        classId: '',
        term: '',
        examType: 'End of Term',
        academicYear: new Date().getFullYear().toString()
    });

    const [isCacheWarm, setIsCacheWarm] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<'progress' | 'printer'>('progress');
    const [precomputeStatus, setPrecomputeStatus] = useState<any | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
    const [isPrioritizing, setIsPrioritizing] = useState<boolean>(false);
    const [isActiveModalOpen, setIsActiveModalOpen] = useState<boolean>(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

    const { toast } = useToast();

    const fetchPrecomputeStatus = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/school/results/precompute-status', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPrecomputeStatus(data);
            }
        } catch (err) {
            console.error('Error fetching precompute status:', err);
        } finally {
            setIsLoadingStatus(false);
        }
    };

    // Poll calculation status every 2.5s
    useEffect(() => {
        fetchPrecomputeStatus();
        const interval = setInterval(() => {
            fetchPrecomputeStatus();
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const handlePrioritize = async () => {
        setIsPrioritizing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/school/results/prioritize-precompute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({})
            });
            if (res.ok) {
                const data = await res.json();
                setPrecomputeStatus(data);
                toast({
                    title: "Next Priority Set ⚡",
                    description: "Your school has been moved to #1 Next in line and will be calculated and compiled next!",
                });
            }
        } catch (err) {
            toast({
                title: "Priority Request Failed",
                description: "Unable to prioritize at this moment.",
                variant: "destructive"
            });
        } finally {
            setIsPrioritizing(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const [directClassPdfReady, setDirectClassPdfReady] = useState<boolean>(false);

    // Auto-resolve examType when class or term changes if present in precomputeStatus
    useEffect(() => {
        if (!filters.classId || !precomputeStatus?.terms) return;
        for (const termGroup of precomputeStatus.terms) {
            if ((!filters.term || termGroup.term === filters.term) && termGroup.academicYear === filters.academicYear) {
                const match = termGroup.classes?.find((c: any) => c.classId === filters.classId);
                if (match?.examType && match.examType !== filters.examType) {
                    setFilters(prev => ({ ...prev, examType: match.examType }));
                    break;
                }
            }
        }
    }, [filters.classId, filters.term, filters.academicYear, precomputeStatus]);

    // Check if selected class pre-built PDF is ready on disk
    useEffect(() => {
        if (!filters.classId || filters.classId === 'ALL_CLASSES' || !filters.term || !filters.academicYear) {
            setDirectClassPdfReady(false);
            return;
        }
        let cancelled = false;
        const checkPdf = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                let examTypeToUse = filters.examType || 'End of Term';
                if (precomputeStatus?.terms) {
                    for (const termGroup of precomputeStatus.terms) {
                        if (termGroup.term === filters.term && termGroup.academicYear === filters.academicYear) {
                            const match = termGroup.classes?.find((c: any) => c.classId === filters.classId);
                            if (match?.examType) {
                                examTypeToUse = match.examType;
                                break;
                            }
                        }
                    }
                }

                const query = new URLSearchParams({
                    classId: filters.classId,
                    term: filters.term,
                    examType: examTypeToUse,
                    academicYear: filters.academicYear,
                });
                const res = await fetch(`/api/school/results/class-pdf-status?${query.toString()}`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setDirectClassPdfReady(!!data?.ready);
                }
            } catch {
                if (!cancelled) setDirectClassPdfReady(false);
            }
        };
        checkPdf();
        const interval = setInterval(checkPdf, 2500);
        return () => { cancelled = true; clearInterval(interval); };
    }, [filters.classId, filters.term, filters.examType, filters.academicYear, precomputeStatus]);

    const termClasses = useMemo(() => {
        const termGroup = precomputeStatus?.terms?.find(
            (t: any) => t.term === filters.term && String(t.academicYear) === String(filters.academicYear)
        );
        const computedClasses = termGroup?.classes || [];
        const computedMap = new Map<string, any>();
        computedClasses.forEach((c: any) => computedMap.set(c.classId, c));

        if (classes && classes.length > 0) {
            return classes.map(c => {
                const existing = computedMap.get(c.id);
                return {
                    classId: c.id,
                    className: c.name,
                    studentCount: existing?.studentCount ?? 0,
                    examType: existing?.examType || filters.examType || 'End of Term',
                    isCalculated: existing?.isCalculated ?? false,
                    isPdfReady: existing?.isPdfReady ?? false,
                };
            });
        }
        return computedClasses;
    }, [precomputeStatus, filters.term, filters.academicYear, filters.examType, classes]);

    const readyClassesInTerm = useMemo(() => {
        return termClasses.filter((c: any) => c.isPdfReady);
    }, [termClasses]);

    const isCurrentClassPdfReady = useMemo(() => {
        if (!filters.classId) return false;
        if (filters.classId === 'ALL_CLASSES') {
            return readyClassesInTerm.length > 0;
        }
        if (directClassPdfReady) return true;
        if (!precomputeStatus?.terms) return false;
        for (const termGroup of precomputeStatus.terms) {
            if (termGroup.term === filters.term && termGroup.academicYear === filters.academicYear) {
                const match = termGroup.classes?.find(
                    (c: any) => c.classId === filters.classId && (!filters.examType || c.examType === filters.examType)
                ) || termGroup.classes?.find((c: any) => c.classId === filters.classId);
                if (match?.isPdfReady) return true;
            }
        }
        return false;
    }, [filters.classId, filters.term, filters.examType, filters.academicYear, precomputeStatus, directClassPdfReady, readyClassesInTerm]);

    const isAllPdfsReady = useMemo(() => {
        return !!precomputeStatus?.isCompleted &&
            !!precomputeStatus?.isPdfCompleted &&
            (precomputeStatus?.totalPdfs ?? 0) > 0 &&
            (precomputeStatus?.builtPdfs ?? 0) >= (precomputeStatus?.totalPdfs ?? 0);
    }, [precomputeStatus]);

    const isPdfsBuilding = useMemo(() => {
        return !!precomputeStatus?.isCompleted && !isAllPdfsReady;
    }, [precomputeStatus, isAllPdfsReady]);
    const isPdfWorkerActive = isPdfsBuilding && (
        !!precomputeStatus?.isCurrentlyBuildingPdf || !!precomputeStatus?.isPdfWorkerActive
    );
    const hasPdfStorageError = isPdfsBuilding && !!precomputeStatus?.pdfStorageError;

    /**
     * Converts an image URL to a base64 data URI.
     * Returns null on failure so missing images degrade gracefully.
     */
    const urlToBase64 = async (url: string): Promise<string | null> => {
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch {
            return null;
        }
    };

    /**
     * Given a school object, fetches all its image URLs in parallel and
     * returns a copy of the school with URLs replaced by base64 data URIs.
     * Already-embedded data URIs and missing fields are left untouched.
     */
    const preloadSchoolImages = async (school: any): Promise<any> => {
        if (!school) return school;
        const IMAGE_FIELDS = ['logo_url', 'seal_url', 'signature_url', 'coat_of_arms_url'] as const;
        const entries = await Promise.all(
            IMAGE_FIELDS.map(async (field) => {
                const url: string | undefined = school[field];
                if (!url || url.startsWith('data:')) return [field, url];
                const b64 = await urlToBase64(url);
                return [field, b64 ?? url];
            })
        );
        return { ...school, ...Object.fromEntries(entries) };
    };

    useEffect(() => {
        if (filters.classId && filters.classId !== 'ALL_CLASSES' && filters.academicYear) {
            fetchStudents();
        } else if (filters.classId === 'ALL_CLASSES') {
            setStudents([]);
        }
    }, [filters.classId, filters.academicYear]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // 1. Fetch Classes
            const { data: classData } = await supabase
                .from('classes')
                .select('id, name')
                .order('name');

            if (classData) setClasses(classData);

            // 2. Fetch Settings for Term/Year
            const settingsRes = await fetch('/api/school/settings', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const settings = settingsRes.ok ? await settingsRes.json() : null;
            if (settings) {
                const isSimplified = !!settings.simplified_assessment_mode;
                setSimplifiedAssessmentMode(isSimplified);

                let examTypes = ['Mid Term', 'End of Term'];
                if (settings.exam_types && settings.exam_types.length > 0) {
                    examTypes = settings.exam_types;
                }
                setAvailableExamTypes(examTypes);

                const defaultExamType = isSimplified
                    ? 'Term'
                    : (examTypes.includes('End of Term') ? 'End of Term' : examTypes[0]);

                setFilters(prev => ({
                    ...prev,
                    term: settings.current_term,
                    examType: defaultExamType,
                    academicYear: settings.academic_year
                }));

                // 3. Pre-warm school images NOW (not at print time) so base64 cache is ready
                if (settings.school) {
                    preloadSchoolImages(settings.school).then(warmed => {
                        preWarmedSchoolRef.current = warmed;
                    });
                } else {
                    // Fetch school details separately for image pre-warming
                    fetch('/api/school/details', {
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                    }).then(r => r.ok ? r.json() : null).then(school => {
                        if (school) {
                            preloadSchoolImages(school).then(warmed => {
                                preWarmedSchoolRef.current = warmed;
                            });
                        }
                    }).catch(() => {});
                }
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const { data: enrollmentData } = await supabase
                .from('enrollments')
                .select('student_id, profiles(id, full_name, student_number)')
                .eq('class_id', filters.classId)
                .eq('academic_year', filters.academicYear);

            if (enrollmentData) {
                const studentList = enrollmentData.map((e: any) => ({
                    id: e.profiles.id,
                    full_name: e.profiles.full_name,
                    student_number: e.profiles.student_number
                }));
                setStudents(studentList);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const handleDownloadCompiledPdf = async () => {
        if (!filters.classId || !filters.term || !filters.academicYear) {
            toast({ title: "Incomplete Selection", description: "Please select Class, Term and Year.", variant: "destructive" });
            return;
        }

        setIsDownloadingPdf(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            let examTypeToUse = filters.examType || 'End of Term';
            if (precomputeStatus?.terms) {
                for (const termGroup of precomputeStatus.terms) {
                    if (termGroup.term === filters.term && termGroup.academicYear === filters.academicYear) {
                        const match = termGroup.classes?.find((c: any) => c.classId === filters.classId);
                        if (match?.examType) {
                            examTypeToUse = match.examType;
                            break;
                        }
                    }
                }
            }

            const query = new URLSearchParams({
                classId: filters.classId,
                term: filters.term,
                examType: examTypeToUse,
                academicYear: filters.academicYear,
            });

            const res = await fetch(`/api/school/results/download-class-pdf?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Download failed' }));
                throw new Error(err.message || 'Failed to download pre-built PDF');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const currentClassName = classes.find(c => c.id === filters.classId)?.name || 'Class';
            const safeTerm = filters.term.replace(/\s+/g, '_');
            a.download = `${currentClassName}_${safeTerm}_${filters.academicYear}_ReportCards.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "PDF Ready & Downloaded ⚡",
                description: "Pre-compiled report card PDF downloaded successfully with zero browser preview delays.",
            });
        } catch (err: any) {
            toast({
                title: "PDF Download Error",
                description: err.message || "Failed to download pre-built PDF.",
                variant: "destructive"
            });
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleDownloadAllClassesZip = async () => {
        if (!filters.term || !filters.academicYear) {
            toast({ title: "Incomplete Selection", description: "Please select Term and Year.", variant: "destructive" });
            return;
        }

        if (readyClassesInTerm.length === 0) {
            toast({ title: "No PDFs Ready", description: "PDFs for this term are still being compiled.", variant: "destructive" });
            return;
        }

        setIsDownloadingPdf(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const query = new URLSearchParams({
                term: filters.term,
                academicYear: filters.academicYear,
            });

            const res = await fetch(`/api/school/results/download-all-classes-zip?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Download failed' }));
                throw new Error(err.message || 'Failed to download zipped classes');
            }

            const blob = await res.blob();
            const safeTerm = filters.term.replace(/\s+/g, '_');
            const filename = `Report_Cards_All_Classes_${safeTerm}_${filters.academicYear}.zip`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Zipped Folder Downloaded 📦⚡",
                description: `Successfully downloaded ZIP containing ${readyClassesInTerm.length} class report card PDFs.`,
            });
        } catch (err: any) {
            toast({
                title: "ZIP Download Error",
                description: err.message || "Failed to download zipped folder.",
                variant: "destructive"
            });
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleDownloadSingleClassFromList = async (cls: any) => {
        setIsDownloadingPdf(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const query = new URLSearchParams({
                classId: cls.classId,
                term: filters.term,
                examType: cls.examType || 'End of Term',
                academicYear: filters.academicYear,
            });

            const res = await fetch(`/api/school/results/download-class-pdf?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Download failed' }));
                throw new Error(err.message || 'Failed to download PDF');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const currentClassName = cls.className || 'Class';
            const safeTerm = filters.term.replace(/\s+/g, '_');
            a.download = `${currentClassName}_${safeTerm}_${filters.academicYear}_ReportCards.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            toast({
                title: "PDF Download Error",
                description: err.message || "Failed to download class PDF.",
                variant: "destructive"
            });
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handlePreview = async (studentId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const dataRes = await fetch(
                `/api/school/results/report-card/${studentId}?term=${encodeURIComponent(filters.term)}&examType=${encodeURIComponent(filters.examType)}&academicYear=${encodeURIComponent(filters.academicYear)}`,
                { headers: { 'Authorization': `Bearer ${session.access_token}` } }
            );
            if (!dataRes.ok) throw new Error('Failed to load report card');
            const data = await dataRes.json();

            setPreviewData(data);
            setIsPreviewOpen(true);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const selectedClassName = classes.find(c => c.id === filters.classId)?.name || '';

    return (
        <div className="space-y-6">

            {/* VIEW MODE 1: Report Card Calculation Progress Screen */}
            {viewMode === 'progress' && (
                <div className="space-y-6 print:hidden">
                    {/* Hero Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700/80 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200 dark:shadow-none flex-shrink-0">
                                <Gauge className="h-7 w-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                        Report Card Calculation Progress
                                    </h2>
                                    {precomputeStatus?.isCompleted ? (
                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2.5 py-0.5">
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> All Classes Ready
                                        </Badge>
                                    ) : precomputeStatus?.isCurrentlyCalculating ? (
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 font-bold px-2.5 py-0.5 animate-pulse">
                                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin text-blue-600" /> Calculating Now
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 font-bold px-2.5 py-0.5">
                                            <Clock className="h-3.5 w-3.5 mr-1 text-amber-600" /> In Queue
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    Background pre-computation across all terms for <span className="font-semibold text-slate-800 dark:text-slate-200">{precomputeStatus?.schoolName || 'your school'}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
                            {/* Button to review real-time progress & PDF build progress of the active school */}
                            {(() => {
                                const active = precomputeStatus?.activeSchoolMetrics;
                                const isCalculating = precomputeStatus?.isCurrentlyCalculating || !!precomputeStatus?.currentRunningSchoolName;
                                const activeName = active?.schoolName || precomputeStatus?.currentRunningSchoolName;
                                const calcPct = active?.calcPercentage ?? (precomputeStatus?.isCurrentlyCalculating ? precomputeStatus?.progressPercentage : 0) ?? 0;
                                const pdfBuilt = active?.builtPdfs ?? (precomputeStatus?.builtPdfs ?? 0);
                                const pdfTotal = active?.totalPdfs ?? (precomputeStatus?.totalPdfs ?? 0);
                                const pdfPct = active?.pdfPercentage ?? (precomputeStatus?.pdfProgressPercentage ?? (pdfTotal > 0 ? Math.round((pdfBuilt / pdfTotal) * 100) : 0));
                                const isBuildingPdf = active?.isCurrentlyBuildingPdf || precomputeStatus?.isCurrentlyBuildingPdf;
                                const isPdfDone = active?.isPdfCompleted || (pdfTotal > 0 && pdfBuilt >= pdfTotal);

                                return (
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsActiveModalOpen(true)}
                                        className="border-indigo-300 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 font-bold text-xs shadow-sm h-auto py-1.5 px-3 transition-all flex items-center gap-2"
                                        title="Click to review live calculation and PDF build progress"
                                    >
                                        <Activity className={`h-4 w-4 shrink-0 ${isCalculating || isBuildingPdf ? 'text-indigo-600 animate-pulse' : 'text-slate-400'}`} />
                                        <div className="flex items-center gap-2 flex-wrap text-left">
                                            <span className="font-extrabold text-slate-800 dark:text-slate-100">
                                                {activeName ? `Active: ${activeName}` : 'Review Active School Progress'}
                                            </span>

                                            {isCalculating && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 text-[11px] font-semibold">
                                                    <Loader2 className="h-3 w-3 animate-spin text-blue-600 shrink-0" />
                                                    Calc: {calcPct}%
                                                </span>
                                            )}

                                            {(pdfTotal > 0 || isBuildingPdf) && (
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                                    isBuildingPdf
                                                        ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/70 dark:text-purple-200 border border-purple-300 dark:border-purple-700 animate-pulse'
                                                        : isPdfDone
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                                        : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                                }`}>
                                                    {isBuildingPdf ? (
                                                        <Loader2 className="h-3 w-3 animate-spin text-purple-600 shrink-0" />
                                                    ) : isPdfDone ? (
                                                        <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                                    ) : (
                                                        <FileText className="h-3 w-3 text-purple-600 shrink-0" />
                                                    )}
                                                    PDF: {pdfBuilt}/{pdfTotal} ({pdfPct}%)
                                                </span>
                                            )}
                                        </div>
                                    </Button>
                                );
                            })()}                            {/* Option to Set Next Priority for this School */}
                            {precomputeStatus?.isPriorityQueued || precomputeStatus?.isNextPriority ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 shadow-sm">
                                    <Zap className="h-3.5 w-3.5 text-amber-600 fill-current" />
                                    Next in Line (#1 Priority)
                                </div>
                            ) : (
                                <Button
                                    onClick={handlePrioritize}
                                    disabled={isPrioritizing || precomputeStatus?.isCurrentlyCalculating || isAllPdfsReady}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm h-9 flex items-center gap-1.5"
                                    title="Set your school as #1 Next in the calculation and PDF build queue"
                                >
                                    {isPrioritizing ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Zap className="h-3.5 w-3.5 fill-current" />
                                    )}
                                    Set Next Priority ⚡
                                </Button>
                            )}
                            {/* Print button ONLY APPEARS IF ALL PDFS ARE READY */}
                            {isAllPdfsReady && (
                                <Button
                                    variant="default"
                                    onClick={() => setViewMode('printer')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm h-9 flex items-center gap-1.5"
                                >
                                    Continue to Print
                                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 4 KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1: Calculated Classes */}
                        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Classes Calculated</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                        {precomputeStatus?.calculatedClasses ?? 0} <span className="text-sm font-semibold text-slate-400">/ {precomputeStatus?.totalClasses ?? 0}</span>
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                                        {precomputeStatus?.progressPercentage ?? 0}% pre-computed
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <CheckCheck className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2: Classes Remaining */}
                        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Classes Remaining</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                        {precomputeStatus?.remainingClasses ?? 0}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {(precomputeStatus?.remainingClasses ?? 0) === 0 ? "Zero classes pending" : "Pending calculation"}
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:blue-400 flex items-center justify-center">
                                    <Clock className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3: Est. Completion Time */}
                        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Est. Completion Time</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                        {precomputeStatus?.estimatedTimeText || "Calculating…"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {precomputeStatus?.isCompleted ? "Instant export ready" : "Automated background calculation"}
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Hourglass className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* 4: Queue Status */}
                        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Queue Status</p>
                                    <p className="text-base font-black text-slate-900 dark:text-white mt-1 truncate">
                                        {precomputeStatus?.isCompleted
                                            ? "Completed ✓"
                                            : precomputeStatus?.isCurrentlyCalculating
                                            ? "Calculating Now"
                                            : `Position ${precomputeStatus?.queuePosition || 1}`}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 truncate" title={precomputeStatus?.waitStatusText}>
                                        {precomputeStatus?.waitStatusText || "Ready"}
                                    </p>
                                </div>
                                <div className={`h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center ${
                                    precomputeStatus?.isCompleted
                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                        : precomputeStatus?.isCurrentlyCalculating
                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                }`}>
                                    {precomputeStatus?.isCurrentlyCalculating ? (
                                        <RefreshCw className="h-6 w-6 animate-spin" />
                                    ) : precomputeStatus?.isCompleted ? (
                                        <CheckCircle2 className="h-6 w-6" />
                                    ) : (
                                        <Zap className="h-6 w-6" />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Progress Bar & Live Activity */}
                    <Card className="border-slate-200/80 overflow-hidden shadow-sm">
                        <CardContent className="p-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {precomputeStatus?.isCurrentlyCalculating && (
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                        </span>
                                    )}
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        {precomputeStatus?.isCompleted
                                            ? "Calculation Complete — Instant Export Ready"
                                            : precomputeStatus?.isCurrentlyCalculating
                                            ? precomputeStatus.currentClassLabel
                                                ? `Currently calculating: ${precomputeStatus.currentClassLabel}`
                                                : "Pre-computing report cards for this school…"
                                            : precomputeStatus?.waitStatusText || "Waiting in queue…"}
                                    </span>
                                </div>
                                <span className="text-base font-black tabular-nums text-slate-800 dark:text-white">
                                    {precomputeStatus?.progressPercentage ?? 0}%
                                </span>
                            </div>

                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                                        precomputeStatus?.isCompleted ? "bg-emerald-500" : "bg-blue-600"
                                    }`}
                                    style={{ width: `${precomputeStatus?.progressPercentage ?? 0}%` }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                <span>{precomputeStatus?.calculatedClasses ?? 0} of {precomputeStatus?.totalClasses ?? 0} classes pre-computed</span>
                                <span>{precomputeStatus?.remainingClasses ?? 0} classes left</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stage 2: Pre-Built PDF Compilation Progress Card */}
                    <Card className="border-purple-200/80 dark:border-purple-900/50 overflow-hidden shadow-sm bg-gradient-to-r from-purple-50/40 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900">
                        <CardContent className="p-6 space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    {precomputeStatus?.isCurrentlyBuildingPdf ? (
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                                        </span>
                                    ) : (
                                        <FileCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    )}
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                                        <span>Pre-Built PDF Compilation:</span>
                                        <span className="font-normal text-slate-600 dark:text-slate-300">
                                            {precomputeStatus?.isPdfCompleted
                                                ? "All class PDFs compiled & ready for instant download ✓"
                                                : precomputeStatus?.pdfStorageError
                                                ? `Storage unavailable: ${precomputeStatus.pdfStorageError}`
                                                : isPdfWorkerActive
                                                ? precomputeStatus.activePdfLabel
                                                    ? `Compiling PDF: ${precomputeStatus.activePdfLabel}`
                                                    : "Processing queued PDF batch"
                                                : precomputeStatus?.isCompleted
                                                ? "Queued for the next background worker run"
                                                : "Starts automatically after each class is calculated"}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-2.5 py-0.5 rounded-full">
                                        {precomputeStatus?.builtPdfs ?? 0} / {precomputeStatus?.totalPdfs ?? 0} PDFs Ready
                                    </span>
                                    <span className="text-base font-black tabular-nums text-purple-700 dark:text-purple-300">
                                        {precomputeStatus?.pdfProgressPercentage ?? 0}%
                                    </span>
                                </div>
                            </div>

                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                                        precomputeStatus?.isPdfCompleted ? "bg-emerald-500" : "bg-purple-600"
                                    }`}
                                    style={{ width: `${precomputeStatus?.pdfProgressPercentage ?? 0}%` }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                <span>
                                    {precomputeStatus?.remainingPdfs === 0
                                        ? "All classes have private PDFs stored in Supabase."
                                        : `${precomputeStatus?.remainingPdfs ?? 0} class PDFs remaining to compile`}
                                </span>
                                <span>
                                    {precomputeStatus?.isPdfCompleted
                                        ? "Instant download ready"
                                        : `Adaptive batching • up to ${precomputeStatus?.pdfBatchSize ?? 8} jobs per run`}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* All Terms Breakdown */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-slate-500" />
                                    Submitted Classes Across All Terms
                                </h3>
                                <p className="text-xs text-slate-500">
                                    All terms and classes with submitted subject grades in this school
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={fetchPrecomputeStatus} className="text-xs border-slate-200">
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Status
                            </Button>
                        </div>

                        {(!precomputeStatus?.terms || precomputeStatus.terms.length === 0) ? (
                            <Card className="border-dashed border-2 border-slate-200 p-8 text-center">
                                <p className="text-slate-500 text-sm font-medium">No submitted grades found yet for this school.</p>
                                <p className="text-xs text-slate-400 mt-1">When teachers submit grades from the Gradebook, background calculation for each class will start automatically.</p>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {precomputeStatus.terms.map((termGroup: any) => (
                                    <Card key={`${termGroup.term}-${termGroup.academicYear}`} className="border-slate-200 shadow-sm overflow-hidden">
                                        <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-3.5 px-5 flex flex-row items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <span className="font-bold text-slate-900 dark:text-white text-base">{termGroup.term}</span>
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                    {termGroup.academicYear}
                                                </span>
                                            </div>
                                            <div className="text-xs font-semibold">
                                                {termGroup.calculatedClasses === termGroup.totalClasses ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> All {termGroup.totalClasses} classes ready
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 dark:text-slate-400">
                                                        {termGroup.calculatedClasses} of {termGroup.totalClasses} classes calculated
                                                    </span>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                {termGroup.classes.map((c: any) => (
                                                    <div
                                                        key={`${c.classId}-${c.examType}`}
                                                        className={`p-3 rounded-xl border transition-colors ${
                                                            c.isCalculated
                                                                ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/50"
                                                                : "bg-slate-50/60 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700"
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{c.className}</p>
                                                                <p className="text-[11px] text-slate-400 mt-0.5">{c.examType}</p>
                                                            </div>
                                                            {c.isCalculated ? (
                                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-slate-500 border-slate-300 dark:border-slate-600 text-[10px] font-medium px-2 py-0.5">
                                                                    <Clock className="h-3 w-3 mr-1" /> Pending
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {c.isCalculated && c.studentCount > 0 && (
                                                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                                                                    ✓ {c.studentCount} student cards cached
                                                                </p>
                                                                {c.isPdfReady && (
                                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                                                        PDF Ready ⚡
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className={`sticky bottom-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 backdrop-blur-md rounded-2xl border-2 shadow-xl transition-all ${
                        isAllPdfsReady
                            ? "bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700"
                            : hasPdfStorageError
                            ? "bg-red-50/95 dark:bg-red-950/90 border-red-300 dark:border-red-800"
                            : isPdfWorkerActive
                            ? "bg-purple-50/95 dark:bg-purple-950/90 border-purple-300 dark:border-purple-700"
                            : isPdfsBuilding
                            ? "bg-amber-50/95 dark:bg-amber-950/90 border-amber-300 dark:border-amber-800"
                            : "bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800"
                    }`}>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                                {isAllPdfsReady ? (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                        <span>All report cards and pre-built PDFs are ready!</span>
                                    </>
                                ) : hasPdfStorageError ? (
                                    <>
                                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                        <span>PDF storage is unavailable</span>
                                    </>
                                ) : isPdfWorkerActive ? (
                                    <>
                                        <Loader2 className="h-5 w-5 text-purple-600 animate-spin flex-shrink-0" />
                                        <span>Calculations Complete • Pre-building PDFs ({precomputeStatus?.builtPdfs ?? 0} of {precomputeStatus?.totalPdfs ?? 0} ready - {precomputeStatus?.pdfProgressPercentage ?? 0}%)</span>
                                    </>
                                ) : isPdfsBuilding ? (
                                    <>
                                        <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                        <span>Calculations Complete • PDFs queued ({precomputeStatus?.builtPdfs ?? 0} of {precomputeStatus?.totalPdfs ?? 0} ready)</span>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="h-5 w-5 text-amber-500 animate-spin flex-shrink-0" />
                                        <span>Background calculation in progress ({precomputeStatus?.calculatedClasses ?? 0} of {precomputeStatus?.totalClasses ?? 0} classes ready)</span>
                                    </>
                                )}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {isAllPdfsReady
                                    ? "All submitted classes and high-speed vector PDFs are ready. You can now proceed to export."
                                    : hasPdfStorageError
                                    ? precomputeStatus.pdfStorageError
                                    : isPdfWorkerActive
                                    ? "The worker is compiling and uploading a private PDF to Supabase Storage."
                                    : isPdfsBuilding
                                    ? "The next worker run will continue compiling private PDFs in Supabase Storage."
                                    : "PDF export is locked until all submitted classes and subjects have been calculated and compiled."}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            {isPdfsBuilding && !hasPdfStorageError && (
                                <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold ${
                                    isPdfWorkerActive
                                        ? "bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800 animate-pulse"
                                        : "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800"
                                }`}>
                                    {isPdfWorkerActive
                                        ? <Loader2 className="h-4 w-4 animate-spin text-purple-600 shrink-0" />
                                        : <Clock className="h-4 w-4 text-amber-600 shrink-0" />}
                                    <span>{isPdfWorkerActive ? "Compiling" : "Queued"} ({precomputeStatus?.builtPdfs ?? 0}/{precomputeStatus?.totalPdfs ?? 0})</span>
                                </div>
                            )}

                            {isAllPdfsReady && (
                                <Button
                                    onClick={() => setViewMode('printer')}
                                    size="lg"
                                    className="w-full sm:w-auto font-black px-8 text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-pointer transition-all"
                                >
                                    Continue to Print
                                    <ArrowRight className="h-5 w-5 ml-2" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW MODE 2: Pre-Built PDF Export & Preview Screen */}
            {viewMode === 'printer' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between print:hidden">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="h-6 w-6 text-emerald-600" />
                                Export Report Cards
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400">Download pre-compiled high-speed vector PDF report cards.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setViewMode('progress')}
                                className="border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 text-xs h-9 font-bold"
                            >
                                <Gauge className="h-4 w-4 mr-1.5 text-indigo-600 dark:text-indigo-400" />
                                Calculation Status ({precomputeStatus?.progressPercentage ?? 100}%)
                            </Button>

                            {/* The print button must not appear if PDFs are not ready */}
                            {filters.classId && isCurrentClassPdfReady ? (
                                filters.classId === 'ALL_CLASSES' ? (
                                    <Button
                                        onClick={handleDownloadAllClassesZip}
                                        disabled={isDownloadingPdf}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm text-xs h-9"
                                    >
                                        {isDownloadingPdf ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <FolderArchive className="h-4 w-4 mr-2" />
                                        )}
                                        Download All Classes (ZIP) ⚡
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleDownloadCompiledPdf}
                                        disabled={isDownloadingPdf}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm text-xs h-9"
                                    >
                                        {isDownloadingPdf ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4 mr-2" />
                                        )}
                                        Download Pre-Built PDF ⚡
                                    </Button>
                                )
                            ) : filters.classId ? (
                                <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold animate-pulse">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                                    <span>
                                        {filters.classId === 'ALL_CLASSES'
                                            ? `Compiling Class PDFs in Background (0 of ${termClasses.length} ready)…`
                                            : "PDF Compiling in Background…"}
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Filter className="h-5 w-5" />
                                    Select Parameters
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Class</label>
                                        <Select
                                            value={filters.classId}
                                            onValueChange={(val) => setFilters(prev => ({ ...prev, classId: val }))}
                                        >
                                            <SelectTrigger className="h-9 text-xs">
                                                <SelectValue placeholder="Select Class" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL_CLASSES" className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                    📦 All Classes (Zipped Folder)
                                                </SelectItem>
                                                {classes.map(c => (
                                                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Term</label>
                                        <Select
                                            value={filters.term}
                                            onValueChange={(val) => setFilters(prev => ({ ...prev, term: val }))}
                                        >
                                            <SelectTrigger className="h-9 text-xs">
                                                <SelectValue placeholder="Select Term" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Term 1" className="text-xs">Term 1</SelectItem>
                                                <SelectItem value="Term 2" className="text-xs">Term 2</SelectItem>
                                                <SelectItem value="Term 3" className="text-xs">Term 3</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Academic Year</label>
                                        <Input
                                            value={filters.academicYear}
                                            onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pre-Built PDF Export Info Card */}
                        <Card className="bg-gradient-to-br from-emerald-50/60 to-white dark:from-slate-900 dark:to-slate-800/80 border-emerald-200/80 dark:border-slate-700 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                    {filters.classId === 'ALL_CLASSES' ? (
                                        <FolderArchive className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <FileText className="h-4 w-4 text-emerald-600" />
                                    )}
                                    {filters.classId === 'ALL_CLASSES' ? 'Zipped Class PDFs Export' : 'Pre-Built PDF Export'}
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500">
                                    {filters.classId === 'ALL_CLASSES'
                                        ? 'Bundles all ready class report cards into a single downloadable .zip archive.'
                                        : 'Ultra-fast vector report cards generated directly on server.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {filters.classId ? (
                                    filters.classId === 'ALL_CLASSES' ? (
                                        isCurrentClassPdfReady ? (
                                            <div className="space-y-2.5">
                                                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                    <span>{readyClassesInTerm.length} of {termClasses.length} classes ready in package</span>
                                                </div>
                                                <Button
                                                    onClick={handleDownloadAllClassesZip}
                                                    disabled={isDownloadingPdf}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-sm"
                                                >
                                                    {isDownloadingPdf ? (
                                                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                                    ) : (
                                                        <FolderArchive className="h-3.5 w-3.5 mr-2" />
                                                    )}
                                                    Download All Classes (ZIP) ⚡
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs space-y-1.5 animate-pulse">
                                                <div className="flex items-center gap-2 font-bold">
                                                    <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                                                    <span>Compiling Class PDFs in Background…</span>
                                                </div>
                                                <p className="text-[11px] text-purple-700 dark:text-purple-400">
                                                    The ZIP download button will appear as soon as classes complete compiling.
                                                </p>
                                            </div>
                                        )
                                    ) : isCurrentClassPdfReady ? (
                                        <div className="space-y-2.5">
                                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                                <span>Pre-compiled A4 PDF ready for download</span>
                                            </div>
                                            <Button
                                                onClick={handleDownloadCompiledPdf}
                                                disabled={isDownloadingPdf}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-sm"
                                            >
                                                {isDownloadingPdf ? (
                                                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                                ) : (
                                                    <Download className="h-3.5 w-3.5 mr-2" />
                                                )}
                                                Download Class PDF ⚡
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs space-y-1.5 animate-pulse">
                                            <div className="flex items-center gap-2 font-bold">
                                                <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                                                <span>Compiling Pre-Built PDF…</span>
                                            </div>
                                            <p className="text-[11px] text-purple-700 dark:text-purple-400">
                                                The download button will appear as soon as compilation completes.
                                            </p>
                                        </div>
                                    )
                                ) : (
                                    <p className="text-xs text-slate-500 italic">
                                        Select a class to view its pre-built PDF status.
                                    </p>
                                )}
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-[11px] text-slate-600 dark:text-slate-400">
                                    <p className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Need Paper Copies?</p>
                                    <p>Open the downloaded vector PDF and print directly from your browser or PDF viewer.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {filters.classId === 'ALL_CLASSES' ? (
                        <Card className="print:hidden">
                            <CardHeader className="py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <FolderArchive className="h-4 w-4 text-emerald-600" />
                                        All Classes Status ({readyClassesInTerm.length} of {termClasses.length} Ready for Download)
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        You can download the entire package as a ZIP archive, or download individual class PDFs below.
                                    </CardDescription>
                                </div>
                                {readyClassesInTerm.length > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={handleDownloadAllClassesZip}
                                        disabled={isDownloadingPdf}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 shadow-sm"
                                    >
                                        <FolderArchive className="h-3.5 w-3.5 mr-1.5" />
                                        Download Ready ({readyClassesInTerm.length}) as ZIP
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Class Name</TableHead>
                                            <TableHead>Students</TableHead>
                                            <TableHead>PDF Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {termClasses.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                                    No classes found for this term.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            termClasses.map((cls: any) => (
                                                <TableRow key={cls.classId}>
                                                    <TableCell className="font-bold text-slate-900 dark:text-white">
                                                        {cls.className}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 dark:text-slate-400 text-xs">
                                                        {cls.studentCount > 0 ? `${cls.studentCount} students` : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {cls.isPdfReady ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 text-[11px] font-semibold gap-1">
                                                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                                Ready for Print
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-300 text-[11px] gap-1 animate-pulse">
                                                                <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                                                                Compiling…
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {cls.isPdfReady ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDownloadSingleClassFromList(cls)}
                                                                disabled={isDownloadingPdf}
                                                                className="text-emerald-700 hover:text-emerald-800 border-emerald-200 hover:bg-emerald-50 text-xs h-8 font-semibold"
                                                            >
                                                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                                                Download PDF
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">In progress</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="print:hidden">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                                                    {filters.classId ? "No students found in this class." : "Please select a class to see students."}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            students.map(student => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="font-medium">{student.full_name}</TableCell>
                                                    <TableCell className="text-slate-500 font-mono text-xs">{student.student_number}</TableCell>
                                                    <TableCell className="text-right flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handlePreview(student.id)}
                                                            className="text-indigo-600 hover:text-indigo-700 border-indigo-200 text-xs h-8 font-medium"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                            Preview Report Card
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Report Card Preview</DialogTitle>
                        <DialogDescription>
                            Review student report card before exporting.
                        </DialogDescription>
                    </DialogHeader>
                    {previewData && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                            <ReportCardContent
                                data={previewData}
                                term={filters.term}
                                examType={filters.examType}
                                academicYear={filters.academicYear}
                            />
                        </div>
                    )}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                        {isCurrentClassPdfReady && (
                            <Button
                                onClick={() => {
                                    setIsPreviewOpen(false);
                                    handleDownloadCompiledPdf();
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download Class PDF ⚡
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Print Blocker Dialog */}
            <AlertDialog open={isBlockerOpen} onOpenChange={setIsBlockerOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            Printing Blocked
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600">
                            {blockerMessage}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsBlockerOpen(false)}>Close</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                setIsBlockerOpen(false);
                                navigate('/school-admin/data-audit');
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Go to Data Audit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal to review real-time calculation progress of the currently active school */}
            <ActiveCalculationModal
                isOpen={isActiveModalOpen}
                onClose={() => setIsActiveModalOpen(false)}
                onPrioritized={() => {
                    fetchPrecomputeStatus();
                }}
            />
        </div>
    );
}
