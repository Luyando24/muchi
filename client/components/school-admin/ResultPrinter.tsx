import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
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
    CheckCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    const [isPrinting, setIsPrinting] = useState(false);
    const [batchData, setBatchData] = useState<any[]>([]);
    const [previewData, setPreviewData] = useState<any | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [printMode, setPrintMode] = useState<'pdf' | 'hardcopy'>('hardcopy');
    const [simplifiedAssessmentMode, setSimplifiedAssessmentMode] = useState<boolean>(false);

    // Progress overlay state
    const [printPhase, setPrintPhase] = useState<'idle' | 'fetching' | 'rendering' | 'ready'>('idle');
    const [printProgressMsg, setPrintProgressMsg] = useState('');
    const [progressPct, setProgressPct] = useState(0);
    const [elapsedSec, setElapsedSec] = useState(0);
    const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // State for print blocker dialog
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

    const { toast } = useToast();

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Clean up batch data after print dialog closes
    useEffect(() => {
        const handleAfterPrint = () => {
            setBatchData([]);
            setIsPrinting(false);
            setPrintPhase('idle');
        };
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    // Drive animated progress bar and elapsed counter while printing
    useEffect(() => {
        if (printPhase === 'idle') {
            setProgressPct(0);
            setElapsedSec(0);
            if (progressRef.current) clearInterval(progressRef.current);
            if (elapsedRef.current) clearInterval(elapsedRef.current);
            return;
        }

        // Elapsed seconds counter
        elapsedRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);

        // Smoothly advance the bar based on phase targets
        // fetching: 0→45, rendering: 45→85, ready: 85→100
        const targets: Record<string, number> = { fetching: 45, rendering: 85, ready: 100 };
        const target = targets[printPhase] ?? 100;
        progressRef.current = setInterval(() => {
            setProgressPct(p => {
                if (p >= target) { clearInterval(progressRef.current!); return p; }
                // Ease-out: bigger jumps early, smaller near target
                const step = Math.max(0.4, (target - p) * 0.06);
                return Math.min(p + step, target);
            });
        }, 50);

        return () => {
            if (progressRef.current) clearInterval(progressRef.current);
            if (elapsedRef.current) clearInterval(elapsedRef.current);
        };
    }, [printPhase]);

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
        if (filters.classId && filters.academicYear) {
            fetchStudents();
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

    const handleBulkPrint = async () => {
        if (!filters.classId || !filters.term || !filters.examType || !filters.academicYear) {
            toast({ title: "Incomplete Selection", description: "Please select Class, Term, Assessment Type and Year.", variant: "destructive" });
            return;
        }

        setIsPrinting(true);
        setPrintPhase('fetching');
        setPrintProgressMsg('Checking for data issues…');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Check if class has anomalies before printing
            const anomaliesRes = await fetch('/api/school/grades/anomalies', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const anomaliesData = anomaliesRes.ok ? await anomaliesRes.json() : [];
            if (anomaliesData && anomaliesData.length > 0) {
                const studentIds = [...new Set(anomaliesData.map((a: any) => a.studentId))].filter(Boolean);
                if (studentIds.length > 0) {
                    const { data: anomalousEnrollments } = await supabase
                        .from('enrollments')
                        .select('student_id, class_id')
                        .in('student_id', studentIds)
                        .eq('class_id', filters.classId)
                        .eq('academic_year', filters.academicYear);
                    if (anomalousEnrollments && anomalousEnrollments.length > 0) {
                        setBlockerMessage("Cannot print report cards. There are grade anomalies (scores > 100%) in this class. Please resolve them in the Data Audit section first.");
                        setIsBlockerOpen(true);
                        setIsPrinting(false);
                        setPrintPhase('idle');
                        return;
                    }
                }
            }

            setPrintProgressMsg('Fetching report card data…');

            const dataRes = await fetch(
                `/api/school/results/batch-report-cards?classId=${filters.classId}&term=${encodeURIComponent(filters.term)}&examType=${encodeURIComponent(filters.examType)}&academicYear=${encodeURIComponent(filters.academicYear)}`,
                { headers: { 'Authorization': `Bearer ${session.access_token}` } }
            );

            if (!dataRes.ok) {
                const err = await dataRes.json().catch(() => ({ message: 'Server error' }));
                throw new Error(err.message || 'Failed to fetch report cards');
            }

            const data: any[] = await dataRes.json();

            if (!data || data.length === 0) {
                toast({ title: "No Data", description: "No published results found for this selection." });
                setIsPrinting(false);
                setPrintPhase('idle');
                return;
            }

            setPrintPhase('rendering');
            setPrintProgressMsg(`Preparing ${data.length} report cards…`);

            // Use pre-warmed base64 images if available, otherwise convert now
            const schoolWithImages = preWarmedSchoolRef.current
                ? { ...preWarmedSchoolRef.current, ...Object.fromEntries(
                    Object.entries(data[0]?.school || {}).filter(([k]) =>
                        !['logo_url','seal_url','signature_url','coat_of_arms_url'].includes(k)
                    ))
                  }
                : await preloadSchoolImages(data[0]?.school);

            const dataWithImages = data.map((card: any) => ({ ...card, school: schoolWithImages }));

            // Set document title for PDF filename
            const originalTitle = document.title;
            const safeTerm = filters.term.replace(/\s+/g, '_');
            document.title = `${selectedClassName}_${safeTerm}_${filters.academicYear}_Reports`;

            setBatchData(dataWithImages);

            // Wait two animation frames for React to flush the DOM, then print.
            // Two rAFs ensure the browser has painted at least once after the state update.
            // This is more reliable than a fixed timeout for any class size.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setPrintPhase('ready');
                    setPrintProgressMsg('Opening print dialog…');
                    // Small yield so the 'ready' state renders before the dialog blocks the thread
                    setTimeout(() => {
                        window.print();
                        document.title = originalTitle;
                        // afterprint event handler will reset isPrinting + batchData
                    }, 120);
                });
            });

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            setIsPrinting(false);
            setPrintPhase('idle');
        }
    };

    const handleIndividualPrint = async (studentId: string) => {
        setIsPrinting(true);
        setPrintPhase('fetching');
        setPrintProgressMsg('Loading report card…');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Check if student has anomalies before printing
            const anomaliesRes = await fetch('/api/school/grades/anomalies', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const anomaliesData = anomaliesRes.ok ? await anomaliesRes.json() : [];
            if (anomaliesData) {
                const studentHasAnomaly = anomaliesData.some((a: any) => a.studentId === studentId && a.academicYear === filters.academicYear);
                if (studentHasAnomaly) {
                    setBlockerMessage("Cannot print report card. This student has grade anomalies (scores > 100%). Please resolve them in the Data Audit section first.");
                    setIsBlockerOpen(true);
                    setIsPrinting(false);
                    setPrintPhase('idle');
                    return;
                }
            }

            const dataRes = await fetch(
                `/api/school/results/report-card/${studentId}?term=${encodeURIComponent(filters.term)}&examType=${encodeURIComponent(filters.examType)}&academicYear=${encodeURIComponent(filters.academicYear)}`,
                { headers: { 'Authorization': `Bearer ${session.access_token}` } }
            );
            if (!dataRes.ok) throw new Error('Failed to load report card');
            const data = await dataRes.json();

            setPrintPhase('rendering');
            setPrintProgressMsg('Preparing report card…');

            const schoolWithImages = preWarmedSchoolRef.current || await preloadSchoolImages(data.school);
            const dataWithImages = { ...data, school: schoolWithImages };

            setBatchData([dataWithImages]);

            const originalTitle = document.title;
            const studentName = (data.student.name || 'Student').replace(/\s+/g, '_');
            const safeTerm = filters.term.replace(/\s+/g, '_');
            document.title = `${studentName}_${safeTerm}_${filters.academicYear}_Report`;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setPrintPhase('ready');
                    setPrintProgressMsg('Opening print dialog…');
                    setTimeout(() => {
                        window.print();
                        document.title = originalTitle;
                    }, 120);
                });
            });

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            setIsPrinting(false);
            setPrintPhase('idle');
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

    const handleOpenPrinterSettings = () => {
        // Only works on Windows if the browser allows it (usually does via ms-settings protocol)
        window.open('ms-settings:printers');
        toast({
            title: "System Settings",
            description: "Opening Windows Printer & Scanner settings. Add your printer there if it's missing.",
        });
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const selectedClassName = classes.find(c => c.id === filters.classId)?.name || '';

    return (
        <div className="space-y-6">
            {/* ─── Print Progress Overlay ──────────────────────────────────── */}
            {isPrinting && printPhase !== 'idle' && (
                <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

                        {/* Colour strip at top — changes by phase */}
                        <div className={`h-1.5 w-full transition-all duration-500 ${
                            printPhase === 'ready' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                            style={{ width: `${Math.round(progressPct)}%`, transition: 'width 0.15s ease-out' }}
                        />

                        <div className="p-7 space-y-5">
                            {/* Icon + headline */}
                            <div className="flex items-center gap-4">
                                {printPhase === 'ready' ? (
                                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                                        <CheckCheck className="h-6 w-6 text-green-500" />
                                    </div>
                                ) : (
                                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                                        {printPhase === 'ready' ? 'Ready to print!' : 'Preparing report cards'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {printPhase === 'ready' ? 'Opening print dialog now…' : `${elapsedSec}s elapsed`}
                                    </p>
                                </div>
                                {/* Percentage badge */}
                                <div className="ml-auto text-2xl font-black tabular-nums text-slate-800 dark:text-slate-100">
                                    {Math.round(progressPct)}%
                                </div>
                            </div>

                            {/* Progress bar track */}
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-150 ease-out ${
                                        printPhase === 'ready' ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.round(progressPct)}%` }}
                                />
                            </div>

                            {/* Step list */}
                            <ol className="space-y-2.5">
                                {([
                                    { id: 'fetching',  label: 'Checking & fetching data',    detail: 'Validating grades, rankings & images' },
                                    { id: 'rendering', label: 'Building report cards',        detail: 'Laying out all student pages in memory' },
                                    { id: 'ready',     label: 'Sending to print',             detail: 'Handing off to the print dialog' },
                                ] as const).map((step, i) => {
                                    const phases = ['fetching', 'rendering', 'ready'];
                                    const stepIdx = phases.indexOf(step.id);
                                    const curIdx  = phases.indexOf(printPhase);
                                    const done    = curIdx > stepIdx;
                                    const active  = curIdx === stepIdx;
                                    return (
                                        <li key={step.id} className="flex items-start gap-3">
                                            {/* Step circle */}
                                            <div className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors duration-300 ${
                                                done   ? 'bg-green-500 text-white' :
                                                active ? 'bg-blue-500 text-white ring-2 ring-blue-200 dark:ring-blue-800' :
                                                         'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                            }`}>
                                                {done ? <CheckCheck className="h-3 w-3" /> : i + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-semibold leading-tight ${
                                                    done   ? 'text-green-600 dark:text-green-400' :
                                                    active ? 'text-slate-900 dark:text-white' :
                                                             'text-slate-400'
                                                }`}>{step.label}</p>
                                                {active && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5 animate-pulse">{step.detail}</p>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>

                            {/* Tip */}
                            {printPhase === 'fetching' && (
                                <p className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4">
                                    💡 Tip: For large classes the data fetch may take 10–30 seconds. Do not close this tab.
                                </p>
                            )}
                            {printPhase === 'rendering' && (
                                <p className="text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4">
                                    💡 Tip: In the print dialog, set <b>Destination</b> to <b>Save as PDF</b> to get a digital copy, or choose your printer for hardcopies.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Printer className="h-6 w-6" />
                        Print Results
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">Print student report cards individually or in bulk.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleOpenPrinterSettings}
                        className="border-slate-200"
                    >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add/Manage Printer
                    </Button>
                    <Button
                        onClick={handleBulkPrint}
                        disabled={isPrinting || !filters.classId}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isPrinting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                        Bulk Print {printMode === 'hardcopy' ? 'Hardcopies' : 'PDFs'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Filter Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 uppercase">Class</label>
                                <Select
                                    value={filters.classId}
                                    onValueChange={(val) => setFilters(prev => ({ ...prev, classId: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 uppercase">Term</label>
                                <Select
                                    value={filters.term}
                                    onValueChange={(val) => setFilters(prev => ({ ...prev, term: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Term" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Term 1">Term 1</SelectItem>
                                        <SelectItem value="Term 2">Term 2</SelectItem>
                                        <SelectItem value="Term 3">Term 3</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {!simplifiedAssessmentMode && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-500 uppercase">Assessment</label>
                                    <Select
                                        value={filters.examType}
                                        onValueChange={(val) => setFilters(prev => ({ ...prev, examType: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableExamTypes.map(type => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 uppercase">Academic Year</label>
                                <Input
                                    value={filters.academicYear}
                                    onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                                    placeholder="2024"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                            <p className="text-xs text-slate-500 italic">Showing students in {selectedClassName || 'selected class'}</p>
                            <Button variant="outline" size="sm" onClick={() => fetchStudents()}>
                                <Filter className="h-4 w-4 mr-2" />
                                Refresh List
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50/50 border-dashed border-2 border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Printer Setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Button
                                variant={printMode === 'hardcopy' ? 'default' : 'outline'}
                                className="w-full justify-start"
                                onClick={() => setPrintMode('hardcopy')}
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                Print Hardcopies
                            </Button>
                            <Button
                                variant={printMode === 'pdf' ? 'default' : 'outline'}
                                className="w-full justify-start"
                                onClick={() => setPrintMode('pdf')}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Save as Digital PDF
                            </Button>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm text-[11px] text-slate-600 space-y-2">
                            <p className="font-bold uppercase text-[9px] text-slate-400 tracking-widest">Helpful Tip</p>
                            <p>For hardcopies, ensure your printer is powered on and connected via USB or Wi-Fi. In the print dialog, select your printer name from the <b>Destination</b> list.</p>
                            <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600 font-bold"
                                onClick={handleOpenPrinterSettings}
                            >
                                Not seeing your printer? Add it here.
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

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
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handlePreview(student.id)}
                                                className="text-blue-600 hover:text-blue-700"
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Preview
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleIndividualPrint(student.id)}
                                                disabled={isPrinting}
                                                className="text-slate-600 hover:text-slate-900"
                                            >
                                                {printMode === 'hardcopy' ? <Printer className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                                                {printMode === 'hardcopy' ? 'Print' : 'PDF'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Print Area - Rendered at root level via portal to avoid layout conflicts */}
            {isPrinting && batchData.length > 0 && ReactDOM.createPortal(
                <div id="school-print-portal" className="font-sans">
                    <style>
                        {`
                        @media screen {
                            #school-print-portal {
                                display: none !important;
                            }
                        }
                        @media print {
                            @page {
                                size: A4;
                                margin: 10mm;
                            }
                            #root, .radix-portal, [data-radix-portal], header, nav, aside {
                                display: none !important;
                                visibility: hidden !important;
                            }
                            body {
                                background: white !important;
                                margin: 0;
                                padding: 0;
                            }
                            #school-print-portal {
                                display: block !important;
                                visibility: visible !important;
                                position: static !important;
                                width: 100% !important;
                                z-index: 999999 !important;
                                background: white !important;
                            }
                            .page-break {
                                break-before: page;
                                page-break-before: always;
                                display: block !important;
                                clear: both;
                            }
                            .report-card-wrapper {
                                width: 100% !important;
                                min-height: 280mm; /* Close to A4 but allowing for margins */
                                break-inside: avoid;
                                margin: 0 auto;
                                padding: 0 !important;
                                background: white !important;
                                display: flex;
                                flex-direction: column;
                            }
                            /* Force black text for print */
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                color-adjust: exact !important;
                            }
                        }
                        `}
                    </style>
                    <div className="w-full">
                        {batchData.map((data, index) => (
                            <div
                                key={index}
                                className={`${index > 0 ? "page-break" : ""} report-card-wrapper`}
                            >
                                <ReportCardContent
                                    data={data}
                                    term={filters.term}
                                    examType={filters.examType}
                                    academicYear={filters.academicYear}
                                    className="border-none shadow-none w-full max-w-none p-0 !bg-white !text-black"
                                />
                            </div>
                        ))}
                    </div>
                </div>,
                document.body
            )}

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Report Card Preview</DialogTitle>
                        <DialogDescription>
                            Review the report card before printing.
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
                        <Button
                            onClick={() => {
                                setIsPreviewOpen(false);
                                handleIndividualPrint(previewData.student.id || previewData.student.studentId);
                            }}
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Now
                        </Button>
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
        </div>
    );
}
