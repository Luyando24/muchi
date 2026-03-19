import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, Loader2, Download, AlertCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportedDepartment {
  name: string;
}

interface ImportedSubject {
  name: string;
  code: string;
  department: string;
}

interface ImportedClass {
  name: string;
  level: string;
  room: string;
  capacity: string;
}

interface ImportResult {
  importedCount: number;
  skippedCount: number;
  errors: { row: number; name: string; message: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findValue(row: any, keys: string[]): string {
  const key = Object.keys(row).find(k =>
    keys.some(pk => k.toLowerCase().trim() === pk.toLowerCase().trim())
  );
  return key ? String(row[key] ?? '') : '';
}

// ─── Result Banner ─────────────────────────────────────────────────────────────

function ResultBanner({ result }: { result: ImportResult | null }) {
  if (!result) return null;
  return (
    <div className="space-y-3 mt-4">
      <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Import Complete</AlertTitle>
        <AlertDescription className="text-sm">
          {result.importedCount} imported · {result.skippedCount} skipped (already existed)
        </AlertDescription>
      </Alert>

      {result.errors.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{result.errors.length} rows failed</AlertTitle>
          <AlertDescription>
            <ul className="text-xs mt-1 space-y-1 list-disc pl-4">
              {result.errors.map((e, i) => (
                <li key={i}>Row {e.row} "{e.name}": {e.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ─── Generic Upload Box ───────────────────────────────────────────────────────

function UploadBox({ id, file, onFileChange }: { id: string; file: File | null; onFileChange: (f: File) => void }) {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
      <FileSpreadsheet className="h-10 w-10 text-slate-400 mb-3" />
      <p className="text-sm font-medium">Click to upload or drag and drop</p>
      <p className="text-xs text-slate-500 mt-1">Excel files (.xlsx, .xls)</p>
      <Input
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        id={id}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f); }}
      />
      <Button variant="outline" size="sm" className="mt-4" onClick={() => document.getElementById(id)?.click()}>
        Select File
      </Button>
      {file && (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-600 font-medium">
          <CheckCircle2 className="h-3 w-3" /> {file.name}
        </div>
      )}
    </div>
  );
}

// ─── Departments Panel ────────────────────────────────────────────────────────

function DepartmentsPanel({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportedDepartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Department Name': 'Science' },
      { 'Department Name': 'Mathematics' },
      { 'Department Name': 'Languages' },
      { 'Department Name': 'Humanities' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Departments');
    XLSX.writeFile(wb, 'Departments_Import_Template.xlsx');
  };

  const parse = (f: File) => {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      setPreview(
        rows
          .map(r => ({ name: findValue(r, ['Department Name', 'Name', 'Department']) }))
          .filter(d => d.name)
      );
    };
    reader.readAsArrayBuffer(f);
  };

  const upload = async () => {
    if (!preview.length) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch('/api/school/departments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ departments: preview }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setResult(json);
      toast({ title: 'Import Done', description: `${json.importedCount} departments imported.` });
      if (json.importedCount > 0) onSuccess();
      setPreview([]);
      setFile(null);
    } catch (err: any) {
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" /> Template
        </Button>
      </div>
      <UploadBox id="dept-upload" file={file} onFileChange={parse} />

      {preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Preview — {preview.length} department{preview.length !== 1 ? 's' : ''}</span>
            <Button size="sm" onClick={upload} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</> : <><Upload className="mr-2 h-4 w-4" />Import</>}
            </Button>
          </div>
          <div className="border rounded-md max-h-64 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Department Name</TableHead></TableRow></TableHeader>
              <TableBody>
                {preview.map((d, i) => (
                  <TableRow key={i}><TableCell>{d.name}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ResultBanner result={result} />
    </div>
  );
}

// ─── Subjects Panel ───────────────────────────────────────────────────────────

function SubjectsPanel({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportedSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Subject Name': 'Mathematics', 'Code': 'MAT101', 'Department': 'Mathematics' },
      { 'Subject Name': 'Biology', 'Code': 'BIO101', 'Department': 'Science' },
      { 'Subject Name': 'English Language', 'Code': 'ENG101', 'Department': 'Languages' },
      { 'Subject Name': 'History', 'Code': 'HIS101', 'Department': 'Humanities' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subjects');
    XLSX.writeFile(wb, 'Subjects_Import_Template.xlsx');
  };

  const parse = (f: File) => {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      setPreview(
        rows
          .map(r => ({
            name: findValue(r, ['Subject Name', 'Name', 'Subject']),
            code: findValue(r, ['Code', 'Subject Code']),
            department: findValue(r, ['Department', 'Dept', 'Faculty']),
          }))
          .filter(s => s.name)
      );
    };
    reader.readAsArrayBuffer(f);
  };

  const upload = async () => {
    if (!preview.length) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch('/api/school/subjects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ subjects: preview }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setResult(json);
      toast({ title: 'Import Done', description: `${json.importedCount} subjects imported.` });
      if (json.importedCount > 0) onSuccess();
      setPreview([]);
      setFile(null);
    } catch (err: any) {
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" /> Template
        </Button>
      </div>
      <UploadBox id="subj-upload" file={file} onFileChange={parse} />

      {preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Preview — {preview.length} subject{preview.length !== 1 ? 's' : ''}</span>
            <Button size="sm" onClick={upload} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</> : <><Upload className="mr-2 h-4 w-4" />Import</>}
            </Button>
          </div>
          <div className="border rounded-md max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.code || <span className="text-slate-400 text-xs">—</span>}</TableCell>
                    <TableCell>{s.department || <span className="text-slate-400 text-xs">—</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ResultBanner result={result} />
    </div>
  );
}

// ─── Classes Panel ────────────────────────────────────────────────────────────

function ClassesPanel({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportedClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Class Name': 'Grade 8A', 'Level': '8', 'Room': '101', 'Capacity': 40 },
      { 'Class Name': 'Grade 8B', 'Level': '8', 'Room': '102', 'Capacity': 40 },
      { 'Class Name': 'Grade 9A', 'Level': '9', 'Room': '201', 'Capacity': 35 },
      { 'Class Name': 'Grade 10 Science', 'Level': '10', 'Room': '301', 'Capacity': 30 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Classes');
    XLSX.writeFile(wb, 'Classes_Import_Template.xlsx');
  };

  const parse = (f: File) => {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      setPreview(
        rows
          .map(r => ({
            name: findValue(r, ['Class Name', 'Name', 'Class']),
            level: findValue(r, ['Level', 'Grade Level', 'Year']),
            room: findValue(r, ['Room', 'Room Number', 'Classroom']),
            capacity: findValue(r, ['Capacity', 'Max Students', 'Size']),
          }))
          .filter(c => c.name)
      );
    };
    reader.readAsArrayBuffer(f);
  };

  const upload = async () => {
    if (!preview.length) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch('/api/school/classes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ classes: preview }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setResult(json);
      toast({ title: 'Import Done', description: `${json.importedCount} classes imported.` });
      if (json.importedCount > 0) onSuccess();
      setPreview([]);
      setFile(null);
    } catch (err: any) {
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" /> Template
        </Button>
      </div>
      <UploadBox id="class-upload" file={file} onFileChange={parse} />

      {preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Preview — {preview.length} class{preview.length !== 1 ? 'es' : ''}</span>
            <Button size="sm" onClick={upload} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</> : <><Upload className="mr-2 h-4 w-4" />Import</>}
            </Button>
          </div>
          <div className="border rounded-md max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.level || <span className="text-slate-400 text-xs">—</span>}</TableCell>
                    <TableCell>{c.room || <span className="text-slate-400 text-xs">—</span>}</TableCell>
                    <TableCell>{c.capacity || '40'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ResultBanner result={result} />
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function BulkAcademicImport({
  onImportSuccess,
  defaultTab = 'departments',
}: {
  onImportSuccess: () => void;
  defaultTab?: 'departments' | 'subjects' | 'classes';
}) {
  return (
    <Card className="w-full border-none shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Bulk Academic Import</CardTitle>
        <CardDescription>
          Upload Excel files to import departments, subjects, or classes in bulk.
          <br />
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            ⚡ Tip: Import departments first, then subjects, then classes for best results.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
          </TabsList>
          <TabsContent value="departments">
            <DepartmentsPanel onSuccess={onImportSuccess} />
          </TabsContent>
          <TabsContent value="subjects">
            <SubjectsPanel onSuccess={onImportSuccess} />
          </TabsContent>
          <TabsContent value="classes">
            <ClassesPanel onSuccess={onImportSuccess} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
