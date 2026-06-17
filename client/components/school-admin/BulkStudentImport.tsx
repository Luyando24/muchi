import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { syncFetch } from '@/lib/syncService';

interface ImportedStudent {
  name: string;
  email?: string;
  grade: string;
  gender: string;
  guardian?: string;
  status: 'Pending' | 'Success' | 'Error' | 'Duplicate';
  message?: string;
  forceCreate?: boolean;
}

export default function BulkStudentImport({ onImportSuccess }: { onImportSuccess: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<ImportedStudent[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const downloadTemplate = () => {
        const template = [
            { 'Full Name': 'John Doe', 'Email Address': 'john.doe@example.com', 'Grade': 'Grade 10', 'Gender': 'Male', 'Guardian': 'Jane Doe' },
            { 'Full Name': 'Jane Smith', 'Email Address': '', 'Grade': 'Grade 11', 'Gender': 'Female', 'Guardian': 'Robert Smith' },
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "student_import_template.xlsx");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseExcel(selectedFile);
        }
    };

    const parseExcel = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                if (jsonData.length === 0) {
                    toast({
                        title: "Empty File",
                        description: "No data found in the uploaded file.",
                        variant: "destructive"
                    });
                    return;
                }

                const normalizeGender = (val: string): string => {
                    const v = String(val).toLowerCase().trim();
                    if (v.startsWith('m')) return 'Male';
                    if (v.startsWith('f')) return 'Female';
                    if (v === 'other' || v === 'o' || v.includes('other')) return 'Other';
                    // Default to 'Male' if we can't decide, or keep original for debugging if not sure?
                    // Actually, the database is STRICT. So we should pick one or return as-is to see the error.
                    // Let's be smart: if it's 'm'/'f' or contains 'boy'/'girl'/'man'/'woman'
                    if (v.includes('boy') || v.includes('man')) return 'Male';
                    if (v.includes('girl') || (v.includes('woman') && !v.includes('man'))) return 'Female';
                    
                    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase(); // Try Capital Case
                };

                const students: ImportedStudent[] = jsonData.map((row: any) => {
                    const findValue = (possibleKeys: string[]) => {
                        const rowKeys = Object.keys(row);
                        const key = rowKeys.find(k => {
                            const normalizedK = k.toLowerCase().trim().replace(/[\s_-]/g, '');
                            return possibleKeys.some(pk => {
                                const normalizedPk = pk.toLowerCase().trim().replace(/[\s_-]/g, '');
                                return normalizedK === normalizedPk || normalizedK.includes(normalizedPk);
                            });
                        });
                        return key ? row[key] : '';
                    };

                    const rawGender = String(findValue(['Gender', 'Sex', 'Gender Identity', 'M/F']) || '');
                    const rawGrade = String(findValue(['Grade', 'Class', 'Level', 'Form', 'Grade Level', 'Year Group']) || '');

                    return {
                        name: String(findValue(['Name', 'Student Name', 'Full Name', 'Student']) || '').trim(),
                        email: String(findValue(['Email', 'Email Address', 'Mail']) || '').trim(),
                        grade: rawGrade.trim(),
                        gender: normalizeGender(rawGender),
                        guardian: String(findValue(['Guardian', 'Parent', 'Next of Kin', 'Sponsor']) || '').trim(),
                        status: 'Pending' as const
                    };
                }).filter((s: ImportedStudent) => s.name && String(s.name).trim() !== '');

                setPreviewData(students);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to parse excel file.",
                    variant: "destructive"
                });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;

        setIsImporting(true);
        setImportProgress(0);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setIsImporting(false);
            return;
        }

        const BATCH_SIZE = 10;
        let successCount = 0;
        let errorCount = 0;
        let duplicateCount = 0;
        const updatedData = [...previewData];

        // Filter down to rows we want to send (Pending or ones with forceCreate set)
        const studentsToSend = updatedData.map((s, idx) => ({ ...s, originalIndex: idx }))
          .filter(s => s.status === 'Pending' || (s.status === 'Duplicate' && s.forceCreate));

        if (studentsToSend.length === 0) {
          setIsImporting(false);
          return;
        }

        const totalToSend = studentsToSend.length;

        for (let i = 0; i < totalToSend; i += BATCH_SIZE) {
            const batch = studentsToSend.slice(i, i + BATCH_SIZE);
            const batchPayload = batch.map(({ originalIndex, ...rest }) => rest);
            
            try {
                const result = await syncFetch('/api/school/students/bulk', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ students: batchPayload })
                });

                if (result.offline) {
                    successCount += batch.length;
                    batch.forEach((b) => {
                        updatedData[b.originalIndex].status = 'Success';
                        updatedData[b.originalIndex].message = 'Queued offline';
                    });
                } else {
                    successCount += result.importedCount;
                    
                    if (result.results && Array.isArray(result.results)) {
                        result.results.forEach((res: any, resIndex: number) => {
                            const originalIndex = batch[resIndex]?.originalIndex;
                            if (originalIndex !== undefined && updatedData[originalIndex]) {
                                updatedData[originalIndex].status = res.status;
                                updatedData[originalIndex].message = res.message;
                                if (res.status === 'Error') {
                                    errorCount++;
                                } else if (res.status === 'Duplicate') {
                                    duplicateCount++;
                                }
                            }
                        });
                    } else {
                        batch.forEach((b) => {
                            updatedData[b.originalIndex].status = 'Success';
                        });
                    }
                }
            } catch (error: any) {
                console.error(`Batch import error:`, error);
                errorCount += batch.length;
                batch.forEach((b) => {
                    updatedData[b.originalIndex].status = 'Error';
                    updatedData[b.originalIndex].message = error.message;
                });
            }

            const currentProgress = Math.min(Math.round(((i + batch.length) / totalToSend) * 100), 100);
            setImportProgress(currentProgress);
        }

        setIsImporting(false);
        setPreviewData(updatedData);

        if (errorCount === 0 && duplicateCount === 0) {
            toast({
                title: "Import Successful",
                description: `Successfully imported ${successCount} students.`
            });
            onImportSuccess();
            setFile(null);
            setPreviewData([]);
        } else {
            toast({
                title: "Import Finished with Remarks",
                description: `Imported ${successCount} students. ${errorCount} failed. ${duplicateCount} potential duplicates found requiring review.`,
                variant: duplicateCount > 0 ? 'default' : 'destructive'
            });
        }
    };

    const displayData = previewData.slice(0, 100);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                        <Upload className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Upload Excel File</h3>
                        <p className="text-sm text-slate-500">Supported formats: .xlsx, .xls, .csv</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={downloadTemplate} className="flex-1 md:flex-none">
                        <Download className="mr-2 h-4 w-4" />
                        Template
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                    />
                    <Button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none">
                        {file ? 'Change File' : 'Select File'}
                    </Button>
                </div>
            </div>

            {file && previewData.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white">Preview Data</h4>
                            <p className="text-xs text-slate-500">
                                Found {previewData.length} students. {previewData.length > 100 ? 'Showing first 100 rows.' : ''}
                            </p>
                        </div>
                        <Button
                            onClick={handleImport}
                            disabled={isImporting}
                            className={isImporting ? "bg-slate-400" : "bg-green-600 hover:bg-green-700"}
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Importing... {importProgress}%
                                </>
                            ) : (
                                <>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Start Import
                                </>
                            )}
                        </Button>
                    </div>

                    {isImporting && (
                        <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/50">
                            <div className="flex justify-between items-end mb-1">
                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Importing Students...</p>
                                <p className="text-xs font-mono font-medium text-blue-600">
                                    {Math.min(Math.floor((importProgress / 100) * previewData.length), previewData.length)} / {previewData.length}
                                </p>
                            </div>
                            <Progress value={importProgress} className="h-2.5 bg-blue-100 dark:bg-blue-900/40" />
                            <p className="text-[10px] text-center text-slate-500 font-medium">
                                Processing batch... please stay on this page until completion.
                            </p>
                        </div>
                    )}

                    <Card className="max-h-[400px] overflow-auto border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="font-bold">Name</TableHead>
                                        <TableHead className="font-bold">Email</TableHead>
                                        <TableHead className="font-bold">Grade</TableHead>
                                        <TableHead className="font-bold">Gender</TableHead>
                                        <TableHead className="font-bold">Guardian</TableHead>
                                        <TableHead className="font-bold">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayData.map((student, index) => (
                                        <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell className="text-slate-500 text-xs">
                                              {student.email || <span className="text-slate-400 italic">Auto-generated</span>}
                                            </TableCell>
                                            <TableCell>{student.grade}</TableCell>
                                            <TableCell>{student.gender}</TableCell>
                                            <TableCell>{student.guardian}</TableCell>
                                            <TableCell>
                                                {student.status === 'Success' && <Check className="h-4 w-4 text-green-500" />}
                                                {student.status === 'Duplicate' && (
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                                            <span className="text-[10px] font-semibold">Potential Duplicate</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 max-w-[180px] leading-tight block">{student.message}</span>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="h-6 text-[10px] py-1 px-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
                                                            onClick={() => {
                                                                const updated = [...previewData];
                                                                const indexInPreview = previewData.indexOf(student);
                                                                if (indexInPreview !== -1) {
                                                                    updated[indexInPreview] = {
                                                                        ...updated[indexInPreview],
                                                                        forceCreate: true,
                                                                        status: 'Pending'
                                                                    };
                                                                    setPreviewData(updated);
                                                                }
                                                            }}
                                                        >
                                                            Approve & Import
                                                        </Button>
                                                    </div>
                                                )}
                                                {student.status === 'Error' && (
                                                    <div className="flex items-center gap-1 text-red-500">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <span className="text-[10px] truncate max-w-[100px]">{student.message}</span>
                                                    </div>
                                                )}
                                                {student.status === 'Pending' && <span className="text-slate-400 text-xs">Pending</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    
                    {previewData.length > 100 && (
                        <p className="text-xs text-center text-slate-400 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                           And {previewData.length - 100} more students...
                        </p>
                    )}

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Note</AlertTitle>
                        <AlertDescription>
                            Students with missing emails will have one auto-generated based on their student number.
                            A temporary simple password will be created for each new student.
                        </AlertDescription>
                    </Alert>
                </div>
            )}
        </div>
    );
}
