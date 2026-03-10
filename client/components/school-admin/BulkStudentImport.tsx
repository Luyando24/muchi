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

interface ImportedStudent {
  name: string;
  email?: string;
  grade: string;
  gender: string;
  guardian?: string;
  status: 'Pending' | 'Success' | 'Error';
  message?: string;
}

export default function BulkStudentImport({ onImportSuccess }: { onImportSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportedStudent[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      { 'Full Name': 'John Doe', 'Email Address': 'john.doe@example.com', 'Grade': 'Grade 10', 'Gender': 'Male', 'Guardian': 'Jane Doe' },
      { 'Full Name': 'Alice Smith', 'Email Address': 'alice.smith@example.com', 'Grade': 'Grade 10', 'Gender': 'Female', 'Guardian': 'Robert Smith' },
      { 'Full Name': 'Michael Brown', 'Email Address': '', 'Grade': 'Grade 11', 'Gender': 'Male', 'Guardian': 'Sarah Brown' },
      { 'Full Name': 'Emily Davis', 'Email Address': 'emily.d@example.com', 'Grade': 'Grade 11', 'Gender': 'Female', 'Guardian': 'Mark Davis' },
      { 'Full Name': 'David Wilson', 'Email Address': '', 'Grade': 'Grade 12', 'Gender': 'Male', 'Guardian': 'Linda Wilson' },
      { 'Full Name': 'Sophia Taylor', 'Email Address': 'sophia.t@example.com', 'Grade': 'Grade 12', 'Gender': 'Female', 'Guardian': 'James Taylor' },
      { 'Full Name': 'James Miller', 'Email Address': 'james.m@example.com', 'Grade': 'Grade 10', 'Gender': 'Male', 'Guardian': 'Karen Miller' },
      { 'Full Name': 'Olivia Garcia', 'Email Address': '', 'Grade': 'Grade 11', 'Gender': 'Female', 'Guardian': 'Thomas Garcia' },
      { 'Full Name': 'Robert Martinez', 'Email Address': 'robert.m@example.com', 'Grade': 'Grade 12', 'Gender': 'Male', 'Guardian': 'Maria Martinez' },
      { 'Full Name': 'Isabella Anderson', 'Email Address': 'isabella.a@example.com', 'Grade': 'Grade 10', 'Gender': 'Female', 'Guardian': 'William Anderson' }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students Template");
    XLSX.writeFile(wb, "Student_Import_Template.xlsx");
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

        const students: ImportedStudent[] = jsonData.map((row: any) => {
          // Normalize keys to handle variations in column names
          const findValue = (possibleKeys: string[]) => {
            const key = Object.keys(row).find(k => 
              possibleKeys.some(pk => k.toLowerCase().trim() === pk.toLowerCase().trim())
            );
            return key ? row[key] : '';
          };

          return {
            name: findValue(['Name', 'Student Name', 'Full Name', 'Student']),
            email: findValue(['Email', 'Email Address', 'Mail']),
            grade: String(findValue(['Grade', 'Class', 'Level', 'Form']) || ''),
            gender: findValue(['Gender', 'Sex']),
            guardian: findValue(['Guardian', 'Parent', 'Next of Kin', 'Sponsor']),
            status: 'Pending' as const
          };
        }).filter((s: ImportedStudent) => s.name && String(s.name).trim() !== '');

        setPreviewData(students);
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
    setUploadProgress(0);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        toast({ title: "Authentication Error", description: "Please login again.", variant: "destructive" });
        setIsUploading(false);
        return;
    }

    // We'll upload in batches or one by one to track progress
    // For simplicity, let's send the whole array and let the backend handle it, 
    // but showing progress is nice.
    // Let's send all at once for transaction safety if possible, or simple loop.
    // Given the previous requirement "bulk import", backend handling is better.

    try {
        const response = await fetch('/api/school/students/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ students: previewData })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to upload students');
        }

        toast({
            title: "Import Successful",
            description: `Successfully imported ${result.importedCount} students.`,
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bulk Student Import</CardTitle>
            <CardDescription>Upload an Excel file (.xlsx, .xls) to import students in bulk.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-10 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
            <FileSpreadsheet className="h-12 w-12 text-slate-400 mb-4" />
            <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Click to upload or drag and drop</h3>
                <p className="text-sm text-slate-500">Excel files only (Max 5MB)</p>
            </div>
            <Input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                id="file-upload"
                onChange={handleFileChange}
            />
            <Button variant="outline" className="mt-6" onClick={() => document.getElementById('file-upload')?.click()}>
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
                    <h3 className="font-semibold">Preview ({previewData.length} students)</h3>
                    <Button onClick={handleUpload} disabled={isUploading}>
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Import Students
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
                                <TableHead>Grade</TableHead>
                                <TableHead>Gender</TableHead>
                                <TableHead>Guardian</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewData.map((student, index) => (
                                <TableRow key={index}>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{student.email || <span className="text-slate-400 italic">Auto-generated</span>}</TableCell>
                                    <TableCell>{student.grade}</TableCell>
                                    <TableCell>{student.gender}</TableCell>
                                    <TableCell>{student.guardian}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Note</AlertTitle>
                    <AlertDescription>
                        Students with missing emails will have one auto-generated based on their student number.
                        Passwords will be set to a default value (e.g., "Student123") which they should change on first login.
                    </AlertDescription>
                </Alert>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
