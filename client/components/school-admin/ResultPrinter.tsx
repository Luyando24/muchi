import React, { useState, useEffect } from 'react';
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
    PlusCircle
} from 'lucide-react';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
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
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const [batchData, setBatchData] = useState<any[]>([]);
    const [previewData, setPreviewData] = useState<any | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [printMode, setPrintMode] = useState<'pdf' | 'hardcopy'>('hardcopy');

    const [filters, setFilters] = useState({
        classId: '',
        term: '',
        academicYear: new Date().getFullYear().toString()
    });

    const { toast } = useToast();

    useEffect(() => {
        fetchInitialData();
    }, []);

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
            const response = await fetch('/api/school/settings', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (response.ok) {
                const settings = await response.json();
                setFilters(prev => ({
                    ...prev,
                    term: settings.current_term,
                    academicYear: settings.academic_year
                }));
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
        if (!filters.classId || !filters.term || !filters.academicYear) {
            toast({ title: "Incomplete Selection", description: "Please select Class, Term and Year.", variant: "destructive" });
            return;
        }

        setIsPrinting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`/api/school/results/batch-report-cards?classId=${filters.classId}&term=${encodeURIComponent(filters.term)}&academicYear=${encodeURIComponent(filters.academicYear)}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch batch report cards');

            const data = await response.json();
            if (data.length === 0) {
                toast({ title: "No Data", description: "No published results found for this selection." });
                return;
            }

            setBatchData(data);

            // Set document title for PDF filename
            const originalTitle = document.title;
            const safeTerm = filters.term.replace(/\s+/g, '_');
            document.title = `${selectedClassName}_${safeTerm}_${filters.academicYear}_Reports`;

            // Allow DOM to update before printing
            setTimeout(() => {
                window.print();
                document.title = originalTitle;
                setIsPrinting(false);
            }, 500);

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            setIsPrinting(false);
        }
    };

    const handleIndividualPrint = async (studentId: string) => {
        setIsPrinting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`/api/school/results/report-card/${studentId}?term=${encodeURIComponent(filters.term)}&academicYear=${encodeURIComponent(filters.academicYear)}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!response.ok) throw new Error('Failed to load report card');

            const data = await response.json();
            setBatchData([data]);

            // Set document title for PDF filename
            const originalTitle = document.title;
            const studentName = (data.student.name || 'Student').replace(/\s+/g, '_');
            const safeTerm = filters.term.replace(/\s+/g, '_');
            document.title = `${studentName}_${safeTerm}_${filters.academicYear}_Report`;

            // Allow DOM to update and images to load before printing
            setTimeout(() => {
                window.print();
                document.title = originalTitle;
                setIsPrinting(false);
            }, 2000);

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            setIsPrinting(false);
        }
    };

    const handlePreview = async (studentId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`/api/school/results/report-card/${studentId}?term=${encodeURIComponent(filters.term)}&academicYear=${encodeURIComponent(filters.academicYear)}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!response.ok) throw new Error('Failed to load report card');

            const data = await response.json();
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
    );
}
