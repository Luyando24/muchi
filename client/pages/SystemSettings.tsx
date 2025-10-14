import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Save, 
  ArrowLeft,
  Shield,
  Mail,
  Database,
  Bell,
  Server,
  FileText,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Plus,
  Edit,
  Search,
  Filter,
  Clock,
  Lock,
  Globe,
  Palette,
  Users,
  HardDrive
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json' | 'encrypted';
  category: string;
  description: string;
  is_public: boolean;
  is_editable: boolean;
  validation_rules?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

interface EmailSettings {
  id: string;
  provider: string;
  host: string;
  port: number;
  username: string;
  from_email: string;
  from_name: string;
  reply_to: string;
  use_tls: boolean;
  use_ssl: boolean;
  is_active: boolean;
  test_email: string;
}

interface SecuritySettings {
  id: string;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_symbols: boolean;
  password_expiry_days: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  session_timeout_minutes: number;
  two_factor_required: boolean;
  ip_whitelist?: string[];
}

interface BackupSettings {
  id: string;
  auto_backup_enabled: boolean;
  backup_frequency: string;
  backup_time: string;
  retention_days: number;
  backup_location: string;
  encryption_enabled: boolean;
  notification_emails?: string[];
  last_backup_at?: string;
  last_backup_status?: string;
}

const SystemSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // State for different setting categories
  const [generalSettings, setGeneralSettings] = useState<SystemSetting[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [backupSettings, setBackupSettings] = useState<BackupSettings | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<SystemSetting[]>([]);
  
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [editValue, setEditValue] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [generalRes, emailRes, securityRes, backupRes, notificationRes] = await Promise.all([
        fetch('/api/system-settings?category=general'),
        fetch('/api/system-settings/email'),
        fetch('/api/system-settings/security'),
        fetch('/api/system-settings/backup'),
        fetch('/api/system-settings?category=notifications')
      ]);

      if (generalRes.ok) {
        const generalData = await generalRes.json();
        setGeneralSettings(generalData);
      }

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setEmailSettings(emailData);
      }

      if (securityRes.ok) {
        const securityData = await securityRes.json();
        setSecuritySettings(securityData);
      }

      if (backupRes.ok) {
        const backupData = await backupRes.json();
        setBackupSettings(backupData);
      }

      if (notificationRes.ok) {
        const notificationData = await notificationRes.json();
        setNotificationSettings(notificationData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (settingKey: string, value: any, category?: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setting_key: settingKey,
          setting_value: value,
          category: category || 'general'
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Setting updated successfully' });
        fetchSettings();
      } else {
        throw new Error('Failed to update setting');
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      setMessage({ type: 'error', text: 'Failed to update setting' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmailSettings = async (settings: Partial<EmailSettings>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/system-settings/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email settings updated successfully' });
        fetchSettings();
      } else {
        throw new Error('Failed to update email settings');
      }
    } catch (error) {
      console.error('Error updating email settings:', error);
      setMessage({ type: 'error', text: 'Failed to update email settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/system-settings/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: testEmail }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test email sent successfully' });
        setIsTestEmailDialogOpen(false);
        setTestEmail('');
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({ type: 'error', text: 'Failed to send test email' });
    } finally {
      setSaving(false);
    }
  };

  const handleBackupNow = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/system-settings/backup/trigger', {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Backup initiated successfully' });
        setIsBackupDialogOpen(false);
        fetchSettings();
      } else {
        throw new Error('Failed to initiate backup');
      }
    } catch (error) {
      console.error('Error initiating backup:', error);
      setMessage({ type: 'error', text: 'Failed to initiate backup' });
    } finally {
      setSaving(false);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Application Settings
          </CardTitle>
          <CardDescription>
            Configure basic application settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {generalSettings.filter(s => ['app_name', 'timezone', 'date_format', 'currency', 'language'].includes(s.setting_key)).map((setting) => (
            <div key={setting.id} className="grid grid-cols-3 items-center gap-4">
              <Label className="text-sm font-medium">{setting.description}</Label>
              <div className="col-span-2">
                {setting.setting_type === 'boolean' ? (
                  <Switch
                    checked={setting.setting_value === 'true'}
                    onCheckedChange={(checked) => 
                      handleUpdateSetting(setting.setting_key, checked.toString(), setting.category)
                    }
                  />
                ) : setting.setting_key === 'timezone' ? (
                  <Select
                    value={setting.setting_value}
                    onValueChange={(value) => 
                      handleUpdateSetting(setting.setting_key, value, setting.category)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Lusaka">Africa/Lusaka</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                    </SelectContent>
                  </Select>
                ) : setting.setting_key === 'currency' ? (
                  <Select
                    value={setting.setting_value}
                    onValueChange={(value) => 
                      handleUpdateSetting(setting.setting_key, value, setting.category)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZMW">ZMW - Zambian Kwacha</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={setting.setting_value}
                    onChange={(e) => {
                      const updatedSettings = generalSettings.map(s => 
                        s.id === setting.id ? { ...s, setting_value: e.target.value } : s
                      );
                      setGeneralSettings(updatedSettings);
                    }}
                    onBlur={(e) => 
                      handleUpdateSetting(setting.setting_key, e.target.value, setting.category)
                    }
                    disabled={!setting.is_editable}
                  />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            File Upload Settings
          </CardTitle>
          <CardDescription>
            Configure file upload limits and allowed file types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {generalSettings.filter(s => ['max_file_upload_size', 'allowed_file_types'].includes(s.setting_key)).map((setting) => (
            <div key={setting.id} className="grid grid-cols-3 items-center gap-4">
              <Label className="text-sm font-medium">{setting.description}</Label>
              <div className="col-span-2">
                {setting.setting_key === 'max_file_upload_size' ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={Math.round(parseInt(setting.setting_value) / 1024 / 1024)}
                      onChange={(e) => {
                        const bytes = parseInt(e.target.value) * 1024 * 1024;
                        handleUpdateSetting(setting.setting_key, bytes.toString(), setting.category);
                      }}
                    />
                    <span className="text-sm text-muted-foreground">MB</span>
                  </div>
                ) : (
                  <Textarea
                    value={setting.setting_value}
                    onChange={(e) => {
                      const updatedSettings = generalSettings.map(s => 
                        s.id === setting.id ? { ...s, setting_value: e.target.value } : s
                      );
                      setGeneralSettings(updatedSettings);
                    }}
                    onBlur={(e) => 
                      handleUpdateSetting(setting.setting_key, e.target.value, setting.category)
                    }
                    placeholder="Enter allowed file extensions as JSON array"
                    rows={3}
                  />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Configure SMTP settings for sending emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailSettings && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Provider</Label>
                  <Select
                    value={emailSettings.provider}
                    onValueChange={(value) => 
                      setEmailSettings({ ...emailSettings, provider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smtp">SMTP</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="ses">Amazon SES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input
                    value={emailSettings.host}
                    onChange={(e) => 
                      setEmailSettings({ ...emailSettings, host: e.target.value })
                    }
                    placeholder="smtp.gmail.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={emailSettings.port}
                    onChange={(e) => 
                      setEmailSettings({ ...emailSettings, port: parseInt(e.target.value) })
                    }
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={emailSettings.username}
                    onChange={(e) => 
                      setEmailSettings({ ...emailSettings, username: e.target.value })
                    }
                    placeholder="your-email@domain.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={emailSettings.from_email}
                    onChange={(e) => 
                      setEmailSettings({ ...emailSettings, from_email: e.target.value })
                    }
                    placeholder="noreply@yourschool.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={emailSettings.from_name}
                    onChange={(e) => 
                      setEmailSettings({ ...emailSettings, from_name: e.target.value })
                    }
                    placeholder="MUCHI School System"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={emailSettings.use_tls}
                    onCheckedChange={(checked) => 
                      setEmailSettings({ ...emailSettings, use_tls: checked })
                    }
                  />
                  <Label>Use TLS</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={emailSettings.use_ssl}
                    onCheckedChange={(checked) => 
                      setEmailSettings({ ...emailSettings, use_ssl: checked })
                    }
                  />
                  <Label>Use SSL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={emailSettings.is_active}
                    onCheckedChange={(checked) => 
                      setEmailSettings({ ...emailSettings, is_active: checked })
                    }
                  />
                  <Label>Active</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleUpdateEmailSettings(emailSettings)}
                  disabled={saving}
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Email Settings
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsTestEmailDialogOpen(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Test Email
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Password Policy
          </CardTitle>
          <CardDescription>
            Configure password requirements and security policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {securitySettings && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Password Length</Label>
                  <Input
                    type="number"
                    value={securitySettings.password_min_length}
                    onChange={(e) => 
                      setSecuritySettings({ 
                        ...securitySettings, 
                        password_min_length: parseInt(e.target.value) 
                      })
                    }
                    min="6"
                    max="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password Expiry (Days)</Label>
                  <Input
                    type="number"
                    value={securitySettings.password_expiry_days}
                    onChange={(e) => 
                      setSecuritySettings({ 
                        ...securitySettings, 
                        password_expiry_days: parseInt(e.target.value) 
                      })
                    }
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Password Requirements</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={securitySettings.password_require_uppercase}
                      onCheckedChange={(checked) => 
                        setSecuritySettings({ 
                          ...securitySettings, 
                          password_require_uppercase: checked 
                        })
                      }
                    />
                    <Label>Require Uppercase</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={securitySettings.password_require_lowercase}
                      onCheckedChange={(checked) => 
                        setSecuritySettings({ 
                          ...securitySettings, 
                          password_require_lowercase: checked 
                        })
                      }
                    />
                    <Label>Require Lowercase</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={securitySettings.password_require_numbers}
                      onCheckedChange={(checked) => 
                        setSecuritySettings({ 
                          ...securitySettings, 
                          password_require_numbers: checked 
                        })
                      }
                    />
                    <Label>Require Numbers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={securitySettings.password_require_symbols}
                      onCheckedChange={(checked) => 
                        setSecuritySettings({ 
                          ...securitySettings, 
                          password_require_symbols: checked 
                        })
                      }
                    />
                    <Label>Require Symbols</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={securitySettings.max_login_attempts}
                    onChange={(e) => 
                      setSecuritySettings({ 
                        ...securitySettings, 
                        max_login_attempts: parseInt(e.target.value) 
                      })
                    }
                    min="1"
                    max="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lockout Duration (Minutes)</Label>
                  <Input
                    type="number"
                    value={securitySettings.lockout_duration_minutes}
                    onChange={(e) => 
                      setSecuritySettings({ 
                        ...securitySettings, 
                        lockout_duration_minutes: parseInt(e.target.value) 
                      })
                    }
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session Timeout (Minutes)</Label>
                  <Input
                    type="number"
                    value={securitySettings.session_timeout_minutes}
                    onChange={(e) => 
                      setSecuritySettings({ 
                        ...securitySettings, 
                        session_timeout_minutes: parseInt(e.target.value) 
                      })
                    }
                    min="5"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={securitySettings.two_factor_required}
                    onCheckedChange={(checked) => 
                      setSecuritySettings({ 
                        ...securitySettings, 
                        two_factor_required: checked 
                      })
                    }
                  />
                  <Label>Require Two-Factor Authentication</Label>
                </div>
              </div>

              <Button 
                onClick={() => handleUpdateEmailSettings(securitySettings as any)}
                disabled={saving}
                className="mt-4"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Security Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderBackupSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Backup Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic backup settings and schedule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {backupSettings && (
            <>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={backupSettings.auto_backup_enabled}
                  onCheckedChange={(checked) => 
                    setBackupSettings({ ...backupSettings, auto_backup_enabled: checked })
                  }
                />
                <Label>Enable Automatic Backups</Label>
              </div>

              {backupSettings.auto_backup_enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Backup Frequency</Label>
                      <Select
                        value={backupSettings.backup_frequency}
                        onValueChange={(value) => 
                          setBackupSettings({ ...backupSettings, backup_frequency: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Backup Time</Label>
                      <Input
                        type="time"
                        value={backupSettings.backup_time}
                        onChange={(e) => 
                          setBackupSettings({ ...backupSettings, backup_time: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Retention Period (Days)</Label>
                      <Input
                        type="number"
                        value={backupSettings.retention_days}
                        onChange={(e) => 
                          setBackupSettings({ 
                            ...backupSettings, 
                            retention_days: parseInt(e.target.value) 
                          })
                        }
                        min="1"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        checked={backupSettings.encryption_enabled}
                        onCheckedChange={(checked) => 
                          setBackupSettings({ ...backupSettings, encryption_enabled: checked })
                        }
                      />
                      <Label>Enable Encryption</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Backup Location</Label>
                    <Input
                      value={backupSettings.backup_location}
                      onChange={(e) => 
                        setBackupSettings({ ...backupSettings, backup_location: e.target.value })
                      }
                      placeholder="/path/to/backup/directory"
                    />
                  </div>
                </>
              )}

              {backupSettings.last_backup_at && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Last Backup</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(backupSettings.last_backup_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant={backupSettings.last_backup_status === 'success' ? 'default' : 'destructive'}
                    >
                      {backupSettings.last_backup_status}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleUpdateEmailSettings(backupSettings as any)}
                  disabled={saving}
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Backup Settings
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsBackupDialogOpen(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Backup Now
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">System Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure system-wide settings and preferences
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Admin Panel
            </Badge>
          </div>
        </div>
          {message && (
            <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="backup" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Backup
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
            </TabsList>

          <TabsContent value="general">
            {renderGeneralSettings()}
          </TabsContent>

          <TabsContent value="email">
            {renderEmailSettings()}
          </TabsContent>

          <TabsContent value="security">
            {renderSecuritySettings()}
          </TabsContent>

          <TabsContent value="backup">
            {renderBackupSettings()}
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure notification preferences and templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Notification settings will be implemented in the next phase
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Test Email Dialog */}
        <Dialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Test Email</DialogTitle>
              <DialogDescription>
                Send a test email to verify your email configuration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Test Email Address</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTestEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleTestEmail} disabled={!testEmail || saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Send Test Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Backup Dialog */}
        <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Initiate Backup</DialogTitle>
              <DialogDescription>
                This will create an immediate backup of your system data
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                The backup process may take several minutes depending on the size of your data.
                You will be notified when the backup is complete.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBackupDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBackupNow} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Start Backup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SystemSettings;