import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Mail, Server, Send, CheckCircle, XCircle, Loader2, Save, Eye, Plus, Edit, Trash2,
  Play, Pause, RefreshCw, Clock, Users, Zap, FileText, AlertCircle, Info, Bot
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SmtpConfig {
  host: string; port: number; secure: boolean;
  username: string; password: string;
  from_name: string; from_email: string;
  is_active: boolean;
  notification_emails?: string;
  last_tested_at?: string; last_test_status?: string; last_test_error?: string;
}

interface EmailTemplate {
  id: string; key: string; name: string; audience: string;
  subject: string; html_body: string; text_body: string;
  variables: { name: string; description: string; example: string }[];
  is_active: boolean; created_at: string; updated_at: string;
}

interface AutomationRule {
  id: string; name: string; trigger_event: string; audience: string;
  template_id: string | null; delay_hours: number;
  conditions: Record<string, any>; is_active: boolean;
  frequency: string;
  last_run_at?: string; created_at: string;
  email_templates?: { id: string; key: string; name: string; audience: string } | null;
}

interface EmailLog {
  id: string; recipient: string; subject: string;
  template_key?: string; status: 'sent' | 'failed' | 'test';
  error?: string; sent_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const AUDIENCES = ['student', 'school_admin', 'teacher', 'government', 'system_admin', 'parent'];

const AUDIENCE_LABELS: Record<string, string> = {
  student: 'Student', school_admin: 'School Admin', teacher: 'Teacher',
  government: 'Government', system_admin: 'System Admin', parent: 'Parent',
};

const AUDIENCE_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-800 border-blue-200',
  school_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  teacher: 'bg-green-100 text-green-800 border-green-200',
  government: 'bg-orange-100 text-orange-800 border-orange-200',
  system_admin: 'bg-slate-100 text-slate-800 border-slate-200',
  parent: 'bg-pink-100 text-pink-800 border-pink-200',
};

const TRIGGER_EVENTS = [
  { key: 'school_created', label: 'School Registered', audience: 'school_admin' },
  { key: 'teacher_created', label: 'Teacher Account Created', audience: 'teacher' },
  { key: 'student_created', label: 'Student Account Created', audience: 'student' },
  { key: 'results_published', label: 'Results Published', audience: 'student' },
  { key: 'school_setup_incomplete_3d', label: 'School Setup Incomplete (3 days)', audience: 'school_admin' },
  { key: 'school_setup_incomplete_7d', label: 'School Setup Incomplete (7 days)', audience: 'school_admin' },
  { key: 'subscription_expiring_7d', label: 'Subscription Expiring (7 days)', audience: 'school_admin' },
  { key: 'subscription_expiring_3d', label: 'Subscription Expiring (3 days)', audience: 'school_admin' },
  { key: 'subscription_expired', label: 'Subscription Expired', audience: 'school_admin' },
  { key: 'password_reset', label: 'Password Reset Requested', audience: 'student' },
];

// ─── Helper ───────────────────────────────────────────────────────────────────
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMTP SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SmtpSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SmtpConfig>({
    host: '', port: 587, secure: false, username: '', password: '',
    from_name: 'MUCHI', from_email: '', is_active: false,
    notification_emails: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestDialog, setShowTestDialog] = useState(false);

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/email/smtp', { headers });
      if (!res.ok) throw new Error('Failed to load SMTP config');
      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/email/smtp', { method: 'PUT', headers, body: JSON.stringify(config) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: 'SMTP Saved', description: 'Email server configuration has been updated.' });
      fetchConfig();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testEmail) return;
    setTesting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/email/smtp/test', { method: 'POST', headers, body: JSON.stringify({ target_email: testEmail }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: '✅ Test Email Sent', description: `Check ${testEmail} for the test message.` });
      setShowTestDialog(false);
      fetchConfig();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Test Failed', description: err.message });
    } finally { setTesting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Alert className={config.is_active ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'}>
        {config.is_active
          ? <CheckCircle className="h-4 w-4 text-green-600" />
          : <AlertCircle className="h-4 w-4 text-amber-600" />
        }
        <AlertDescription className={config.is_active ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}>
          {config.is_active
            ? `SMTP is active. Emails will be sent via ${config.host}:${config.port}`
            : 'SMTP is disabled. Configure and enable it to send emails.'
          }
          {config.last_tested_at && (
            <span className="ml-2 text-xs opacity-70">
              Last test: {config.last_test_status === 'success' ? '✅' : '❌'} {new Date(config.last_tested_at).toLocaleString()}
            </span>
          )}
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Server config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-500" />
              Server Configuration
            </CardTitle>
            <CardDescription>SMTP server connection settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input id="smtp-host" placeholder="smtp.gmail.com" value={config.host}
                onChange={e => setConfig({ ...config, host: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Port</Label>
                <Input id="smtp-port" type="number" placeholder="587" value={config.port}
                  onChange={e => setConfig({ ...config, port: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Encryption</Label>
                <Select value={config.secure ? 'tls' : 'starttls'}
                  onValueChange={v => setConfig({ ...config, secure: v === 'tls', port: v === 'tls' ? 465 : 587 })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starttls">STARTTLS (port 587)</SelectItem>
                    <SelectItem value="tls">SSL/TLS (port 465)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">Username / Email</Label>
              <Input id="smtp-user" placeholder="noreply@yourschool.com" value={config.username}
                onChange={e => setConfig({ ...config, username: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">Password / App Password</Label>
              <Input id="smtp-pass" type="password" placeholder="••••••••" value={config.password}
                onChange={e => setConfig({ ...config, password: e.target.value })} />
              <p className="text-xs text-slate-500">For Gmail, use an App Password from Google Account settings.</p>
            </div>
          </CardContent>
        </Card>

        {/* Sender info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-500" />
              Sender Identity
            </CardTitle>
            <CardDescription>How emails appear in recipients' inboxes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from-name">From Name</Label>
              <Input id="from-name" placeholder="MUCHI Academy" value={config.from_name}
                onChange={e => setConfig({ ...config, from_name: e.target.value })} />
              <p className="text-xs text-slate-500">Appears as the sender display name.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-email">From Email</Label>
              <Input id="from-email" type="email" placeholder="noreply@muchiapp.com" value={config.from_email}
                onChange={e => setConfig({ ...config, from_email: e.target.value })} />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="notification-emails">System Notification Emails</Label>
              <Textarea id="notification-emails" placeholder="admin1@example.com, admin2@example.com" value={config.notification_emails || ''}
                onChange={e => setConfig({ ...config, notification_emails: e.target.value })} rows={3} className="font-mono text-sm" />
              <p className="text-xs text-slate-500">Specify a list of comma-separated email addresses where system notifications (such as mandatory onboarding data completions) should be sent, in addition to accounts with the System Admin role.</p>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Email Sending</Label>
                  <p className="text-sm text-slate-500 mt-0.5">Activate this SMTP config for all system emails</p>
                </div>
                <Switch checked={config.is_active}
                  onCheckedChange={checked => setConfig({ ...config, is_active: checked })} />
              </div>
            </div>

            {/* Quick guide */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2 mt-2">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <Info className="h-3 w-3" /> Common SMTP Providers
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <p><strong>Gmail:</strong> smtp.gmail.com : 587 (STARTTLS) — Use App Password</p>
                <p><strong>Outlook:</strong> smtp.office365.com : 587 (STARTTLS)</p>
                <p><strong>SendGrid:</strong> smtp.sendgrid.net : 587 — User: apikey</p>
                <p><strong>Mailgun:</strong> smtp.mailgun.org : 587</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Configuration
        </Button>
        <Button variant="outline" onClick={() => setShowTestDialog(true)} disabled={!config.host || !config.is_active}>
          <Send className="h-4 w-4 mr-2" />
          Send Test Email
        </Button>
        <Button variant="ghost" onClick={fetchConfig}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload
        </Button>
      </div>

      {/* Test dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-500" /> Send Test Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Send a test email to verify your SMTP configuration is working correctly.
            </p>
            <div className="space-y-2">
              <Label htmlFor="test-email-addr">Recipient Email Address</Label>
              <Input id="test-email-addr" type="email" placeholder="your@email.com" value={testEmail}
                onChange={e => setTestEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>Cancel</Button>
            <Button onClick={handleTest} disabled={testing || !testEmail} className="bg-blue-600 text-white hover:bg-blue-700">
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {testing ? 'Sending…' : 'Send Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES TAB
// ═══════════════════════════════════════════════════════════════════════════════
function EmailTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudience, setSelectedAudience] = useState('all');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [manualSendTemplate, setManualSendTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const url = selectedAudience === 'all' ? '/api/admin/email/templates' : `/api/admin/email/templates?audience=${selectedAudience}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to load templates');
      setTemplates(await res.json());
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally { setLoading(false); }
  }, [selectedAudience]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const isNew = !editingTemplate.id;
      const url = isNew ? '/api/admin/email/templates' : `/api/admin/email/templates/${editingTemplate.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers, body: JSON.stringify(editingTemplate) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: isNew ? 'Template Created' : 'Template Saved', description: `"${editingTemplate.name}" has been saved.` });
      setShowEditor(false);
      fetchTemplates();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally { setSaving(false); }
  };

  const handlePreview = async () => {
    if (!editingTemplate?.id) return;
    setPreviewing(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/email/templates/${editingTemplate.id}/preview`, { method: 'POST', headers, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPreviewHtml(data.html);
      setShowPreview(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Preview Error', description: err.message });
    } finally { setPreviewing(false); }
  };

  const handleToggle = async (template: EmailTemplate) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/admin/email/templates/${template.id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ ...template, is_active: !template.is_active }),
      });
      fetchTemplates();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? Automation rules using it will be affected.')) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/admin/email/templates/${id}`, { method: 'DELETE', headers });
      toast({ title: 'Template Deleted' });
      fetchTemplates();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const openNew = () => setEditingTemplate({ id: '', key: '', name: '', audience: 'student', subject: '', html_body: '', text_body: '', variables: [], is_active: true, created_at: '', updated_at: '' });

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', ...AUDIENCES].map(aud => (
            <Button key={aud} size="sm" variant={selectedAudience === aud ? 'default' : 'outline'}
              onClick={() => setSelectedAudience(aud)}
              className={selectedAudience === aud ? 'bg-slate-900 text-white' : ''}>
              {aud === 'all' ? 'All' : AUDIENCE_LABELS[aud] || aud}
            </Button>
          ))}
        </div>
        <Button onClick={openNew} className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      {loading
        ? <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">No templates found</TableCell></TableRow>
                )}
                {templates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">{t.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{t.key}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${AUDIENCE_COLORS[t.audience] || ''}`}>
                        {AUDIENCE_LABELS[t.audience] || t.audience}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-xs truncate">{t.subject}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={t.is_active} onCheckedChange={() => handleToggle(t)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Send Manually" onClick={() => setManualSendTemplate(t)}>
                          <Send className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingTemplate(t); setShowEditor(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {editingTemplate?.id ? 'Edit Template' : 'New Template'}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input value={editingTemplate.name}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Key (unique identifier)</Label>
                  <Input value={editingTemplate.key} placeholder="e.g. welcome_student"
                    onChange={e => setEditingTemplate({ ...editingTemplate, key: e.target.value })}
                    disabled={!!editingTemplate.id} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select value={editingTemplate.audience}
                    onValueChange={v => setEditingTemplate({ ...editingTemplate, audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map(a => <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input value={editingTemplate.subject} placeholder="Use {{variable}} for dynamic content"
                    onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} />
                </div>
              </div>

              {/* Variables info */}
              {editingTemplate.variables.length > 0 && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Available Variables:</p>
                  <div className="flex flex-wrap gap-2">
                    {editingTemplate.variables.map((v: any) => (
                      <div key={v.name} className="text-xs bg-white dark:bg-slate-700 border rounded px-2 py-1">
                        <code className="text-blue-600 dark:text-blue-400">{'{{' + v.name + '}}'}</code>
                        <span className="text-slate-500 ml-1">— {v.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>HTML Body</Label>
                <Textarea value={editingTemplate.html_body} rows={14} className="font-mono text-sm"
                  placeholder="Enter HTML email content here. Use {{variable}} for dynamic values."
                  onChange={e => setEditingTemplate({ ...editingTemplate, html_body: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Plain Text Fallback</Label>
                <Textarea value={editingTemplate.text_body} rows={4}
                  placeholder="Plain text version for email clients that don't support HTML."
                  onChange={e => setEditingTemplate({ ...editingTemplate, text_body: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancel</Button>
            {editingTemplate?.id && (
              <Button variant="outline" onClick={handlePreview} disabled={previewing}>
                {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                Preview
              </Button>
            )}
            <Button onClick={handleSaveTemplate} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" /> Email Preview
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              title="Email Preview"
              srcDoc={previewHtml}
              className="w-full h-[520px]"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTOMATION RULES TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AutomationRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<AutomationRule> | null>(null);
  const [triggeringRuleId, setTriggeringRuleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleTriggerRule = async (ruleId: string) => {
    setTriggeringRuleId(ruleId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/email/rules/${ruleId}/trigger`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: 'Rule Triggered', description: data.message });
      fetchAll();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Trigger Failed', description: err.message });
    } finally {
      setTriggeringRuleId(null);
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [rulesRes, tplRes] = await Promise.all([
        fetch('/api/admin/email/rules', { headers }),
        fetch('/api/admin/email/templates', { headers }),
      ]);
      setRules(await rulesRes.json());
      setTemplates(await tplRes.json());
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggle = async (rule: AutomationRule) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/admin/email/rules/${rule.id}/toggle`, { method: 'PATCH', headers });
      fetchAll();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handleSave = async () => {
    if (!editingRule) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const isNew = !editingRule.id;
      const url = isNew ? '/api/admin/email/rules' : `/api/admin/email/rules/${editingRule.id}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers, body: JSON.stringify(editingRule) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: isNew ? 'Rule Created' : 'Rule Updated', description: `"${editingRule.name}" saved successfully.` });
      setShowDialog(false);
      fetchAll();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this automation rule?')) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/admin/email/rules/${id}`, { method: 'DELETE', headers });
      toast({ title: 'Rule Deleted' });
      fetchAll();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const openNew = () => setEditingRule({ name: '', trigger_event: '', audience: 'school_admin', template_id: null, delay_hours: 0, conditions: {}, is_active: true, frequency: 'once' });
  const getTriggerLabel = (key: string) => TRIGGER_EVENTS.find(t => t.key === key)?.label || key;
  const filteredTemplates = editingRule ? templates.filter(t => !editingRule.audience || t.audience === editingRule.audience) : templates;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Automated Email Rules</h3>
          <p className="text-sm text-slate-500">Define when and to whom automated emails are sent based on system events.</p>
        </div>
        <Button onClick={() => { openNew(); setShowDialog(true); }} className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> New Rule
        </Button>
      </div>

      {loading
        ? <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        : (
          <div className="space-y-3">
            {rules.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Bot className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">No automation rules configured</p>
                  <p className="text-sm text-slate-400 mt-1">Create rules to automatically send emails based on system events.</p>
                </CardContent>
              </Card>
            )}
            {rules.map(rule => (
              <Card key={rule.id} className={`transition-all ${!rule.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white truncate">{rule.name}</h4>
                        {rule.is_active
                          ? <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Active</Badge>
                          : <Badge variant="outline" className="text-xs">Paused</Badge>
                        }
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" /> {getTriggerLabel(rule.trigger_event)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${AUDIENCE_COLORS[rule.audience] || 'bg-slate-100 text-slate-700'}`}>
                            {AUDIENCE_LABELS[rule.audience] || rule.audience}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {rule.delay_hours === 0 ? 'Immediate' : `${rule.delay_hours}h delay`}
                        </span>
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          {rule.frequency === 'once' ? 'Once' : rule.frequency === 'daily' ? 'Daily' : rule.frequency === 'weekly' ? 'Weekly' : rule.frequency === 'monthly' ? 'Monthly' : rule.frequency}
                        </span>
                        {rule.email_templates && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {rule.email_templates.name}
                          </span>
                        )}
                      </div>
                      {rule.last_run_at && (
                        <p className="text-xs text-slate-400 mt-1">Last run: {new Date(rule.last_run_at).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={rule.is_active} onCheckedChange={() => handleToggle(rule)} />
                      <Button size="sm" variant="ghost" title="Trigger Rule Now" onClick={() => handleTriggerRule(rule.id)} disabled={triggeringRuleId === rule.id}>
                        {triggeringRuleId === rule.id ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Play className="h-4 w-4 text-blue-500" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingRule(rule); setShowDialog(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Rule Editor Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              {editingRule?.id ? 'Edit Rule' : 'New Automation Rule'}
            </DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input value={editingRule.name || ''} placeholder="e.g. Welcome new students"
                  onChange={e => setEditingRule({ ...editingRule, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Trigger Event</Label>
                <Select value={editingRule.trigger_event || ''}
                  onValueChange={v => {
                    const event = TRIGGER_EVENTS.find(t => t.key === v);
                    setEditingRule({ ...editingRule, trigger_event: v, audience: event?.audience || editingRule.audience, template_id: null });
                  }}>
                  <SelectTrigger><SelectValue placeholder="Select a trigger…" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_EVENTS.map(t => (
                      <SelectItem key={t.key} value={t.key}>
                        <div className="flex items-center gap-2">
                          <Zap className="h-3 w-3 text-yellow-500" /> {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={editingRule.audience || 'school_admin'}
                  onValueChange={v => setEditingRule({ ...editingRule, audience: v, template_id: null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map(a => <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email Template</Label>
                <Select value={editingRule.template_id || 'none'}
                  onValueChange={v => setEditingRule({ ...editingRule, template_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select template…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No template —</SelectItem>
                    {filteredTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} <span className="text-xs text-slate-400 ml-1">({t.key})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredTemplates.length === 0 && editingRule.audience && (
                  <p className="text-xs text-amber-600">No templates for this audience yet. Create one in the Templates tab.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delay (hours after event)</Label>
                  <Input type="number" min={0} value={editingRule.delay_hours || 0}
                    onChange={e => setEditingRule({ ...editingRule, delay_hours: Number(e.target.value) })} />
                  <p className="text-xs text-slate-500">Set to 0 to send immediately.</p>
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={editingRule.frequency || 'once'}
                    onValueChange={v => setEditingRule({ ...editingRule, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">How often this should be sent.</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <Label>Active</Label>
                <Switch checked={editingRule.is_active !== false}
                  onCheckedChange={v => setEditingRule({ ...editingRule, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL LOGS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function EmailLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/email/logs?limit=200&status=${statusFilter}`, { headers });
      setLogs(await res.json());
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const statusBadge = (status: string) => {
    if (status === 'sent') return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Sent</Badge>;
    if (status === 'failed') return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Failed</Badge>;
    return <Badge variant="outline" className="text-xs">Test</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'sent', 'failed', 'test'].map(s => (
            <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? 'bg-slate-900 text-white capitalize' : 'capitalize'}>
              {s === 'all' ? 'All' : s}
            </Button>
          ))}
        </div>
        <Button variant="ghost" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        {loading
          ? <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">No email logs yet</TableCell></TableRow>
                )}
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">{log.recipient}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{log.subject}</TableCell>
                    <TableCell><code className="text-xs text-slate-500">{log.template_key || '—'}</code></TableCell>
                    <TableCell>
                      <div>{statusBadge(log.status)}</div>
                      {log.error && <p className="text-xs text-red-500 mt-1 max-w-xs truncate">{log.error}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{new Date(log.sent_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL SEND DIALOG HELPER
// ═══════════════════════════════════════════════════════════════════════════════
function ManualSendDialog({ template, isOpen, onClose }: { template: EmailTemplate | null; isOpen: boolean; onClose: () => void; }) {
  const { toast } = useToast();
  const [to, setTo] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && template) {
      setTo('');
      const initVars: Record<string, string> = {};
      template.variables?.forEach(v => initVars[v.name] = '');
      setVariables(initVars);
    }
  }, [isOpen, template]);

  const handleSend = async () => {
    if (!to || !template) return;
    setSending(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({ to, template_key: template.key, variables })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: 'Email Sent', description: `Successfully sent to ${to}` });
      onClose();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Send Failed', description: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-blue-500" /> Manual Send: {template?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Recipient Email</Label>
            <Input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="student@example.com" />
          </div>
          {template?.variables && template.variables.length > 0 && (
            <div className="space-y-3 border-t pt-3 mt-3">
              <Label className="text-sm font-semibold text-slate-700">Template Variables</Label>
              {template.variables.map(v => (
                <div key={v.name} className="space-y-1">
                  <Label className="text-xs">{v.name}</Label>
                  <Input 
                    value={variables[v.name] || ''} 
                    onChange={e => setVariables({...variables, [v.name]: e.target.value})}
                    placeholder={v.example}
                  />
                  <p className="text-[10px] text-slate-500">{v.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !to} className="bg-blue-600 text-white hover:bg-blue-700">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function EmailSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Email Settings</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Configure SMTP, manage email templates for all user types, and automate email workflows.
        </p>
      </div>

      <Tabs defaultValue="smtp" className="w-full">
        <TabsList className="flex overflow-x-auto w-full sm:w-auto h-auto gap-1 bg-slate-100 p-1 dark:bg-slate-800 rounded-lg border scrollbar-none">
          <TabsTrigger value="smtp" className="font-semibold text-sm py-2.5 px-4 shrink-0 flex items-center gap-2">
            <Server className="h-4 w-4" /> SMTP
          </TabsTrigger>
          <TabsTrigger value="templates" className="font-semibold text-sm py-2.5 px-4 shrink-0 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="automation" className="font-semibold text-sm py-2.5 px-4 shrink-0 flex items-center gap-2">
            <Bot className="h-4 w-4" /> Automation
          </TabsTrigger>
          <TabsTrigger value="logs" className="font-semibold text-sm py-2.5 px-4 shrink-0 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Activity Logs
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="smtp"><SmtpSettings /></TabsContent>
          <TabsContent value="templates"><EmailTemplates /></TabsContent>
          <TabsContent value="automation"><AutomationRules /></TabsContent>
          <TabsContent value="logs"><EmailLogs /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
