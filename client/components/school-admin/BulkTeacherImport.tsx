import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

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
  const [isUploading, setIsUploading] = useState(false);
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
            const key = Object.keys(row).find(k => 
              possibleKeys.some(pk => k.toLowerCase().trim() === pk.toLowerCase().trim())
            );
            return key ? row[key] : '';
          };

          const rawSubjects = findValue(['Subjects', 'Subject List', 'Teaching Subjects']);
          const subjects = typeof rawSubjects === 'string' 
            ? rawSubjects.split(',').map(s => s.trim()).filter(Boolean)
            : [];

          return {
            name: findValue(['Name', 'Teacher Name', 'Full Name']),
            email: findValue(['Email', 'Email Address', 'Mail']),
            phone: findValue(['Phone', 'Phone Number', 'Telephone', 'Contact']),
            department: findValue(['Department', 'Dept', 'Faculty']),
            subjects: subjects,
            status: 'Pending' as const
          };
        }).filter((t: ImportedTeacher) => t.name && t.email);

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

  const handleUpload = async () => {
    if (previewData.length === 0) return;
    setIsUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        toast({ title: "Authentication Error", description: "Please login again.", variant: "destructive" });
        setIsUploading(false);
        return;
    }

    try {
        const response = await fetch('/api/school/teachers/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ teachers: previewData })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to upload teachers');
        }

        toast({
            title: "Import Successful",
            description: `Successfully imported ${result.importedCount} teachers.`,
        });
        
        onImportSuccess();
        setFile(null);
        setPreviewData([]);
    } catch (error: any) {
        toast({
            title: "Import Failed",
            description: error.message,
            variant: "destructive"
        });
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <Card className="w-full border-none shadow-none">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bulk Teacher Import</CardTitle>
            <CardDescription>Upload an Excel file to register multiple teachers at once.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-0 pb-0">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-10 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
            <FileSpreadsheet className="h-12 w-12 text-slate-400 mb-4" />
            <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Click to upload or drag and drop</h3>
                <p className="text-sm text-slate-500">Excel files (.xlsx, .xls) only</p>
            </div>
            <Input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                id="teacher-file-upload"
                onChange={handleFileChange}
            />
            <Button variant="outline" className="mt-6" onClick={() => document.getElementById('teacher-file-upload')?.click()}>
                Select File
            </Button>
            {file && (
                <div className="mt-4 flex items-center gap-2 text-sm text-green-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    {file.name}
                </div>
            )}
        </div>

        {previewData.length > 0 && (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Preview ({previewData.length} teachers)</h3>
                    <Button onClick={handleUpload} disabled={isUploading}>
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Import Teachers
                            </>
                        )}
                    </Button>
                </div>
                
                <div className="border rounded-md max-h-[400px] overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Subjects</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewData.map((teacher, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{teacher.name}</TableCell>
                                    <TableCell>{teacher.email}</TableCell>
                                    <TableCell className="text-xs">{teacher.phone || 'N/A'}</TableCell>
                                    <TableCell>{teacher.department}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {teacher.subjects.map((s, i) => (
                                                <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                
                <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Password Info</AlertTitle>
                    <AlertDescription className="text-xs">
                        Passwords will be set to "Teacher123" by default. Teachers should change their passwords after first login.
                    </AlertDescription>
                </Alert>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
