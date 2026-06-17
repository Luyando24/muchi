import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, Check, Loader2, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { syncFetch } from '@/lib/syncService';

interface ImportedTeacher {
  name: string;
  email: string;
  phone: string;
  department?: string;
  subjects?: string[];
  classes?: string[];
  status: 'Pending' | 'Success' | 'Error' | 'Duplicate';
  message?: string;
  forceCreate?: boolean;
}

export default function BulkTeacherImport({ onImportSuccess }: { onImportSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportedTeacher[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      { 'Full Name': 'John Smith', 'Email': 'john.smith@school.com', 'Phone': '0971234567', 'Department': 'Science', 'Classes': 'Grade 10A, Grade 11B', 'Subjects': 'Biology, Chemistry' },
      { 'Full Name': 'Jane Doe', 'Email': 'jane.doe@school.com', 'Phone': '0967654321', 'Department': 'Mathematics', 'Classes': 'Grade 8A, Grade 9B', 'Subjects': 'Algebra, Geometry' },
      { 'Full Name': 'Robert Brown', 'Email': 'robert.b@school.com', 'Phone': '0955123456', 'Department': '', 'Classes': '', 'Subjects': '' },
      { 'Full Name': 'Alice White', 'Email': 'alice.w@school.com', 'Phone': '0944987654', 'Department': 'Humanities', 'Classes': 'Grade 10A', 'Subjects': 'History, Geography' },
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers Template");
    XLSX.writeFile(wb, "Teacher_Import_Template.xlsx");
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
                description: "The uploaded file contains no data.",
                variant: "destructive"
            });
            return;
        }

        const teachers: ImportedTeacher[] = jsonData.map((row: any) => {
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

          const rawSubjects = findValue(['Subjects', 'Subject List', 'Teaching Subjects']);
          const subjects = typeof rawSubjects === 'string' 
            ? rawSubjects.split(',').map(s => s.trim()).filter(Boolean)
            : [];

          const rawClasses = findValue(['Classes', 'Class', 'Class List', 'Teaching Classes']);
          const classes = typeof rawClasses === 'string'
            ? rawClasses.split(',').map(c => c.trim()).filter(Boolean)
            : [];

          return {
            name: String(findValue(['Name', 'Teacher Name', 'Full Name']) || '').trim(),
            email: String(findValue(['Email', 'Email Address', 'Mail']) || '').trim(),
            phone: String(findValue(['Phone', 'Phone Number', 'Telephone', 'Contact']) || '').trim(),
            department: String(findValue(['Department', 'Dept', 'Faculty']) || '').trim() || undefined,
            subjects: subjects.length > 0 ? subjects : undefined,
            classes: classes.length > 0 ? classes : undefined,
            status: 'Pending' as const
          };
        }).filter((t: ImportedTeacher) => t.name && String(t.name).trim() !== '');

        setPreviewData(teachers);
      } catch (error) {
        console.error("Error parsing Excel:", error);
        toast({
            title: "Parse Error",
            description: "Failed to parse the Excel file. Please ensure it's a valid format.",
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
        toast({ title: "Authentication Error", description: "Please login again.", variant: "destructive" });
        setIsImporting(false);
        return;
    }

    const BATCH_SIZE = 10;
    const totalTeachers = previewData.length;
    let successCount = 0;
    let errorCount = 0;

    let duplicateCount = 0;
    const updatedData = [...previewData];

    // Filter down to rows we want to send (Pending or ones with forceCreate set)
    const teachersToSend = updatedData.map((t, idx) => ({ ...t, originalIndex: idx }))
      .filter(t => t.status === 'Pending' || (t.status === 'Duplicate' && t.forceCreate));

    if (teachersToSend.length === 0) {
      setIsImporting(false);
      return;
    }

    const totalToSend = teachersToSend.length;

    for (let i = 0; i < totalToSend; i += BATCH_SIZE) {
        const batch = teachersToSend.slice(i, i + BATCH_SIZE);
        const batchPayload = batch.map(({ originalIndex, ...rest }) => rest);
        
        try {
            const result = await syncFetch('/api/school/teachers/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ teachers: batchPayload })
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
            description: `Successfully imported ${successCount} teachers.`,
        });
        onImportSuccess();
        setFile(null);
        setPreviewData([]);
        // Auto refresh page to show fresh data
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } else {
        toast({
            title: "Import Finished with Remarks",
            description: `Imported ${successCount} teachers. ${errorCount} failed. ${duplicateCount} potential duplicates found requiring review.`,
            variant: duplicateCount > 0 ? 'default' : 'destructive'
        });
        // Update lists in background for successfully imported rows
        onImportSuccess();
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
            <p className="text-sm text-slate-500">Supported formats: .xlsx, .xls</p>
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
            accept=".xlsx, .xls"
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
                    Found {previewData.length} teachers. {previewData.length > 100 ? 'Showing first 100 rows.' : ''}
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
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Importing Teachers...</p>
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
                            <TableHead className="font-bold">Phone</TableHead>
                            <TableHead className="font-bold">Department</TableHead>
                            <TableHead className="font-bold">Classes</TableHead>
                            <TableHead className="font-bold">Subjects</TableHead>
                            <TableHead className="font-bold">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayData.map((teacher, index) => (
                            <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <TableCell className="font-medium">{teacher.name}</TableCell>
                                <TableCell className="text-slate-500 text-xs">
                                  {teacher.email || <span className="text-slate-400 italic">Auto-generated</span>}
                                </TableCell>
                                <TableCell className="text-xs">{teacher.phone || 'N/A'}</TableCell>
                                <TableCell>{teacher.department || '-'}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {teacher.classes && teacher.classes.map((c, i) => (
                                            <Badge key={i} variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50/50">{c}</Badge>
                                        ))}
                                        {!teacher.classes && '-'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {teacher.subjects && teacher.subjects.map((s, i) => (
                                            <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                                        ))}
                                        {!teacher.subjects && '-'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                     {teacher.status === 'Success' && <Check className="h-4 w-4 text-green-500" />}
                                     {teacher.status === 'Duplicate' && (
                                         <div className="flex flex-col gap-1.5 items-start">
                                             <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                                 <AlertCircle className="h-4 w-4 shrink-0" />
                                                 <span className="text-[10px] font-semibold">Potential Duplicate</span>
                                             </div>
                                             <span className="text-[10px] text-slate-500 max-w-[180px] leading-tight block">{teacher.message}</span>
                                             <Button 
                                                 size="sm" 
                                                 variant="outline" 
                                                 className="h-6 text-[10px] py-1 px-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
                                                 onClick={() => {
                                                     const updated = [...previewData];
                                                     const indexInPreview = previewData.indexOf(teacher);
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
                                     {teacher.status === 'Error' && (
                                         <div className="flex items-start gap-1 text-red-500">
                                             <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                             <span className="text-[10px] leading-tight break-words max-w-[160px]" title={teacher.message}>{teacher.message || 'Request failed'}</span>
                                         </div>
                                     )}
                                     {teacher.status === 'Pending' && <span className="text-slate-400 text-xs">Pending</span>}
                                 </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>

          {previewData.length > 100 && (
                <p className="text-xs text-center text-slate-400 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                   And {previewData.length - 100} more teachers...
                </p>
            )}

          <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                    Teachers with missing emails will have one auto-generated based on their staff number.
                    A temporary simple password will be created for each new teacher.
                </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
