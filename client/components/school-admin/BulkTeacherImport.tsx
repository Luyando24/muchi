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

interface ImportedTeacher {
  name: string;
  email: string;
  phone: string;
  department: string;
  subjects: string[];
  status: 'Pending' | 'Success' | 'Error';
  message?: string;
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
      { 'Full Name': 'John Smith', 'Email': 'john.smith@school.com', 'Phone': '0971234567', 'Department': 'Science', 'Subjects': 'Biology, Chemistry' },
      { 'Full Name': 'Jane Doe', 'Email': 'jane.doe@school.com', 'Phone': '0967654321', 'Department': 'Mathematics', 'Subjects': 'Algebra, Geometry' },
      { 'Full Name': 'Robert Brown', 'Email': 'robert.b@school.com', 'Phone': '0955123456', 'Department': 'Languages', 'Subjects': 'English, Literature' },
      { 'Full Name': 'Alice White', 'Email': 'alice.w@school.com', 'Phone': '0944987654', 'Department': 'Humanities', 'Subjects': 'History, Geography' },
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

          return {
            name: String(findValue(['Name', 'Teacher Name', 'Full Name']) || '').trim(),
            email: String(findValue(['Email', 'Email Address', 'Mail']) || '').trim(),
            phone: String(findValue(['Phone', 'Phone Number', 'Telephone', 'Contact']) || '').trim(),
            department: String(findValue(['Department', 'Dept', 'Faculty']) || '').trim(),
            subjects: subjects,
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

    const BATCH_SIZE = 50;
    const totalTeachers = previewData.length;
    let successCount = 0;
    let errorCount = 0;

    const updatedData = [...previewData];

    for (let i = 0; i < totalTeachers; i += BATCH_SIZE) {
        const batch = updatedData.slice(i, i + BATCH_SIZE);
        
        try {
            const response = await fetch('/api/school/teachers/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ teachers: batch })
            });

            const result = await response.json();

            if (response.ok) {
                successCount += result.importedCount;
                
                // Map results back to the original rows
                if (result.results && Array.isArray(result.results)) {
                    result.results.forEach((res: any, resIndex: number) => {
                        const targetIndex = i + resIndex;
                        if (updatedData[targetIndex]) {
                            updatedData[targetIndex].status = res.status;
                            updatedData[targetIndex].message = res.message;
                            if (res.status === 'Error') {
                                errorCount++;
                            }
                        }
                    });
                } else {
                    // Fallback for unexpected response format
                    for (let j = 0; j < batch.length; j++) {
                        updatedData[i + j].status = 'Success';
                    }
                }
            } else {
                errorCount += batch.length;
                for (let j = 0; j < batch.length; j++) {
                    updatedData[i + j].status = 'Error';
                    updatedData[i + j].message = result.message || 'Batch failed';
                }
            }
        } catch (error: any) {
            console.error(`Batch import error:`, error);
            errorCount += batch.length;
            for (let j = 0; j < batch.length; j++) {
                updatedData[i + j].status = 'Error';
                updatedData[i + j].message = error.message;
            }
        }

        const currentProgress = Math.min(Math.round(((i + batch.length) / totalTeachers) * 100), 100);
        setImportProgress(currentProgress);
    }

    setIsImporting(false);

    if (errorCount === 0) {
        toast({
            title: "Import Successful",
            description: `Successfully imported ${successCount} teachers.`,
        });
        onImportSuccess();
        setFile(null);
        setPreviewData([]);
    } else {
        toast({
            title: "Import Completed with Errors",
            description: `Imported ${successCount} teachers. ${errorCount} failed.`,
            variant: 'destructive'
        });
        setPreviewData(updatedData);
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
                                <TableCell>{teacher.department}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {teacher.subjects.map((s, i) => (
                                            <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {teacher.status === 'Success' && <Check className="h-4 w-4 text-green-500" />}
                                    {teacher.status === 'Error' && (
                                        <div className="flex items-center gap-1 text-red-500">
                                            <AlertCircle className="h-4 w-4" />
                                            <span className="text-[10px] truncate max-w-[100px]">{teacher.message}</span>
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
