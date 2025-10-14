import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Save, 
  User,
  School,
  Globe,
  Bell,
  Palette,
  Clock,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Edit,
  Camera,
  Upload,
  Download,
  Moon,
  Sun,
  Monitor,
  Languages,
  DollarSign,
  BookOpen,
  GraduationCap,
  Users
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface UserPreferences {
  id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  currency: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    desktop: boolean;
  };
  dashboard_layout: string;
  sidebar_collapsed: boolean;
}

interface SchoolConfiguration {
  id: string;
  school_name: string;
  school_code: string;
  school_type: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  email: string;
  website: string;
  logo_url?: string;
  principal_name: string;
  deputy_principal_name?: string;
  academic_year_start: string;
  academic_year_end: string;
  terms_per_year: number;
  current_term: number;
  school_motto?: string;
  school_colors?: string[];
  established_year?: number;
  student_capacity: number;
  current_enrollment: number;
}

interface SystemPreferences {
  id: string;
  default_timezone: string;
  default_currency: string;
  default_language: string;
  date_format: string;
  time_format: string;
  week_start_day: number;
  fiscal_year_start: string;
  grading_system: string;
  attendance_tracking: boolean;
  parent_portal_enabled: boolean;
  student_portal_enabled: boolean;
  mobile_app_enabled: boolean;
  sms_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
}

const SchoolSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('user');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // State for different setting categories
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfiguration | null>(null);
  const [systemPreferences, setSystemPreferences] = useState<SystemPreferences | null>(null);
  
  // Dialog states
  const [isLogoDialogOpen, setIsLogoDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Form states
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [userRes, schoolRes, systemRes] = await Promise.all([
        fetch('/api/settings/user'),
        fetch('/api/settings/school'),
        fetch('/api/settings/system')
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUserPreferences(userData);
      }

      if (schoolRes.ok) {
        const schoolData = await schoolRes.json();
        setSchoolConfig(schoolData);
      }

      if (systemRes.ok) {
        const systemData = await systemRes.json();
        setSystemPreferences(systemData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserPreferences = async (updates: Partial<UserPreferences>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'User preferences updated successfully' });
        fetchSettings();
      } else {
        throw new Error('Failed to update user preferences');
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
      setMessage({ type: 'error', text: 'Failed to update user preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSchoolConfig = async (updates: Partial<SchoolConfiguration>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/school', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'School configuration updated successfully' });
        fetchSettings();
      } else {
        throw new Error('Failed to update school configuration');
      }
    } catch (error) {
      console.error('Error updating school configuration:', error);
      setMessage({ type: 'error', text: 'Failed to update school configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSystemPreferences = async (updates: Partial<SystemPreferences>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'System preferences updated successfully' });
        fetchSettings();
      } else {
        throw new Error('Failed to update system preferences');
      }
    } catch (error) {
      console.error('Error updating system preferences:', error);
      setMessage({ type: 'error', text: 'Failed to update system preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setIsPasswordDialogOpen(false);
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const renderUserPreferences = () => (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Manage your personal profile and account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
              <p className="text-sm text-muted-foreground">
                JPG, PNG or GIF. Max size 2MB.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input defaultValue="John" />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input defaultValue="Doe" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" defaultValue="john.doe@school.edu" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" defaultValue="+260 123 456 789" />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <Label className="text-base">Password</Label>
              <p className="text-sm text-muted-foreground">
                Last changed 30 days ago
              </p>
            </div>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
              <Shield className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance & Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance & Preferences
          </CardTitle>
          <CardDescription>
            Customize your interface and display preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userPreferences && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={userPreferences.theme}
                    onValueChange={(value: 'light' | 'dark' | 'system') => 
                      setUserPreferences({ ...userPreferences, theme: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={userPreferences.language}
                    onValueChange={(value) => 
                      setUserPreferences({ ...userPreferences, language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ny">Chichewa</SelectItem>
                      <SelectItem value="bem">Bemba</SelectItem>
                      <SelectItem value="ton">Tonga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select
                    value={userPreferences.date_format}
                    onValueChange={(value) => 
                      setUserPreferences({ ...userPreferences, date_format: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select
                    value={userPreferences.time_format}
                    onValueChange={(value: '12h' | '24h') => 
                      setUserPreferences({ ...userPreferences, time_format: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour</SelectItem>
                      <SelectItem value="24h">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Collapse Sidebar</Label>
                  <p className="text-sm text-muted-foreground">
                    Keep sidebar collapsed by default
                  </p>
                </div>
                <Switch
                  checked={userPreferences.sidebar_collapsed}
                  onCheckedChange={(checked) => 
                    setUserPreferences({ ...userPreferences, sidebar_collapsed: checked })
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userPreferences && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={userPreferences.notifications.email}
                  onCheckedChange={(checked) => 
                    setUserPreferences({ 
                      ...userPreferences, 
                      notifications: { ...userPreferences.notifications, email: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via SMS
                  </p>
                </div>
                <Switch
                  checked={userPreferences.notifications.sms}
                  onCheckedChange={(checked) => 
                    setUserPreferences({ 
                      ...userPreferences, 
                      notifications: { ...userPreferences.notifications, sms: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in browser
                  </p>
                </div>
                <Switch
                  checked={userPreferences.notifications.push}
                  onCheckedChange={(checked) => 
                    setUserPreferences({ 
                      ...userPreferences, 
                      notifications: { ...userPreferences.notifications, push: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show desktop notifications
                  </p>
                </div>
                <Switch
                  checked={userPreferences.notifications.desktop}
                  onCheckedChange={(checked) => 
                    setUserPreferences({ 
                      ...userPreferences, 
                      notifications: { ...userPreferences.notifications, desktop: checked }
                    })
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={() => handleUpdateUserPreferences(userPreferences!)}
          disabled={saving}
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save User Preferences
        </Button>
      </div>
    </div>
  );

  const renderSchoolConfiguration = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            School Information
          </CardTitle>
          <CardDescription>
            Basic information about your school
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schoolConfig && (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={schoolConfig.logo_url || "/placeholder.svg"} />
                  <AvatarFallback>
                    <School className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => setIsLogoDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    PNG or JPG. Max size 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <Input
                    value={schoolConfig.school_name}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, school_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>School Code</Label>
                  <Input
                    value={schoolConfig.school_code}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, school_code: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School Type</Label>
                  <Select
                    value={schoolConfig.school_type}
                    onValueChange={(value) => 
                      setSchoolConfig({ ...schoolConfig, school_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary School</SelectItem>
                      <SelectItem value="secondary">Secondary School</SelectItem>
                      <SelectItem value="combined">Combined School</SelectItem>
                      <SelectItem value="technical">Technical School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Established Year</Label>
                  <Input
                    type="number"
                    value={schoolConfig.established_year || ''}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, established_year: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>School Motto</Label>
                <Input
                  value={schoolConfig.school_motto || ''}
                  onChange={(e) => 
                    setSchoolConfig({ ...schoolConfig, school_motto: e.target.value })
                  }
                  placeholder="Enter school motto"
                />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={schoolConfig.address}
                  onChange={(e) => 
                    setSchoolConfig({ ...schoolConfig, address: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={schoolConfig.city}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Select
                    value={schoolConfig.province}
                    onValueChange={(value) => 
                      setSchoolConfig({ ...schoolConfig, province: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="central">Central</SelectItem>
                      <SelectItem value="copperbelt">Copperbelt</SelectItem>
                      <SelectItem value="eastern">Eastern</SelectItem>
                      <SelectItem value="luapula">Luapula</SelectItem>
                      <SelectItem value="lusaka">Lusaka</SelectItem>
                      <SelectItem value="muchinga">Muchinga</SelectItem>
                      <SelectItem value="northern">Northern</SelectItem>
                      <SelectItem value="northwestern">North-Western</SelectItem>
                      <SelectItem value="southern">Southern</SelectItem>
                      <SelectItem value="western">Western</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    value={schoolConfig.postal_code}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, postal_code: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={schoolConfig.phone}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={schoolConfig.email}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  type="url"
                  value={schoolConfig.website}
                  onChange={(e) => 
                    setSchoolConfig({ ...schoolConfig, website: e.target.value })
                  }
                  placeholder="https://www.yourschool.edu.zm"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Leadership */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            School Leadership
          </CardTitle>
          <CardDescription>
            Information about school leadership
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schoolConfig && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Principal Name</Label>
                  <Input
                    value={schoolConfig.principal_name}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, principal_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deputy Principal Name</Label>
                  <Input
                    value={schoolConfig.deputy_principal_name || ''}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, deputy_principal_name: e.target.value })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Academic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Academic Configuration
          </CardTitle>
          <CardDescription>
            Configure academic year and term settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schoolConfig && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Academic Year Start</Label>
                  <Input
                    type="date"
                    value={schoolConfig.academic_year_start}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, academic_year_start: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Academic Year End</Label>
                  <Input
                    type="date"
                    value={schoolConfig.academic_year_end}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, academic_year_end: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Terms per Year</Label>
                  <Select
                    value={schoolConfig.terms_per_year.toString()}
                    onValueChange={(value) => 
                      setSchoolConfig({ ...schoolConfig, terms_per_year: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Terms</SelectItem>
                      <SelectItem value="3">3 Terms</SelectItem>
                      <SelectItem value="4">4 Terms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Current Term</Label>
                  <Select
                    value={schoolConfig.current_term.toString()}
                    onValueChange={(value) => 
                      setSchoolConfig({ ...schoolConfig, current_term: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: schoolConfig.terms_per_year }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Term {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Student Capacity</Label>
                  <Input
                    type="number"
                    value={schoolConfig.student_capacity}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, student_capacity: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Enrollment</Label>
                  <Input
                    type="number"
                    value={schoolConfig.current_enrollment}
                    onChange={(e) => 
                      setSchoolConfig({ ...schoolConfig, current_enrollment: parseInt(e.target.value) })
                    }
                    disabled
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={() => handleUpdateSchoolConfig(schoolConfig!)}
          disabled={saving}
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save School Configuration
        </Button>
      </div>
    </div>
  );

  const renderSystemPreferences = () => (
    <div className="space-y-6">
      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>
            Configure regional and localization settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemPreferences && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Timezone</Label>
                  <Select
                    value={systemPreferences.default_timezone}
                    onValueChange={(value) => 
                      setSystemPreferences({ ...systemPreferences, default_timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Lusaka">Africa/Lusaka (CAT)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                      <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select
                    value={systemPreferences.default_currency}
                    onValueChange={(value) => 
                      setSystemPreferences({ ...systemPreferences, default_currency: value })
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Select
                    value={systemPreferences.default_language}
                    onValueChange={(value) => 
                      setSystemPreferences({ ...systemPreferences, default_language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ny">Chichewa</SelectItem>
                      <SelectItem value="bem">Bemba</SelectItem>
                      <SelectItem value="ton">Tonga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Week Start Day</Label>
                  <Select
                    value={systemPreferences.week_start_day.toString()}
                    onValueChange={(value) => 
                      setSystemPreferences({ ...systemPreferences, week_start_day: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select
                    value={systemPreferences.date_format}
                    onValueChange={(value) => 
                      setSystemPreferences({ ...systemPreferences, date_format: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select
                    value={systemPreferences.time_format}
                    onValueChange={(value) => 
                      setSystemPreferences({ ...systemPreferences, time_format: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour</SelectItem>
                      <SelectItem value="24h">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fiscal Year Start</Label>
                <Input
                  type="date"
                  value={systemPreferences.fiscal_year_start}
                  onChange={(e) => 
                    setSystemPreferences({ ...systemPreferences, fiscal_year_start: e.target.value })
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Academic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Academic Settings
          </CardTitle>
          <CardDescription>
            Configure academic and grading system settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemPreferences && (
            <>
              <div className="space-y-2">
                <Label>Grading System</Label>
                <Select
                  value={systemPreferences.grading_system}
                  onValueChange={(value) => 
                    setSystemPreferences({ ...systemPreferences, grading_system: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (0-100%)</SelectItem>
                    <SelectItem value="letter">Letter Grades (A-F)</SelectItem>
                    <SelectItem value="points">Points (1-9)</SelectItem>
                    <SelectItem value="gpa">GPA (0.0-4.0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Attendance Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable automatic attendance tracking
                  </p>
                </div>
                <Switch
                  checked={systemPreferences.attendance_tracking}
                  onCheckedChange={(checked) => 
                    setSystemPreferences({ ...systemPreferences, attendance_tracking: checked })
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Portal Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Portal Settings
          </CardTitle>
          <CardDescription>
            Configure access to different portals and features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemPreferences && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Parent Portal</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow parents to access student information
                  </p>
                </div>
                <Switch
                  checked={systemPreferences.parent_portal_enabled}
                  onCheckedChange={(checked) => 
                    setSystemPreferences({ ...systemPreferences, parent_portal_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Student Portal</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow students to access their information
                  </p>
                </div>
                <Switch
                  checked={systemPreferences.student_portal_enabled}
                  onCheckedChange={(checked) => 
                    setSystemPreferences({ ...systemPreferences, student_portal_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Mobile App</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable mobile app access
                  </p>
                </div>
                <Switch
                  checked={systemPreferences.mobile_app_enabled}
                  onCheckedChange={(checked) => 
                    setSystemPreferences({ ...systemPreferences, mobile_app_enabled: checked })
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Communication Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Communication Settings
          </CardTitle>
          <CardDescription>
            Configure notification and communication preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemPreferences && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable SMS notifications system-wide
                  </p>
                </div>
                <Switch
                  checked={systemPreferences.sms_notifications_enabled}
                  onCheckedChange={(checked) => 
                    setSystemPreferences({ ...systemPreferences, sms_notifications_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable email notifications system-wide
                  </p>
                </div>
                <Switch
                  checked={systemPreferences.email_notifications_enabled}
                  onCheckedChange={(checked) => 
                    setSystemPreferences({ ...systemPreferences, email_notifications_enabled: checked })
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={() => handleUpdateSystemPreferences(systemPreferences!)}
          disabled={saving}
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save System Preferences
        </Button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your preferences and school configuration
            </p>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-destructive' : 'border-green-500'}>
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="user" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              User Preferences
            </TabsTrigger>
            <TabsTrigger value="school" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              School Configuration
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              System Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user">
            {renderUserPreferences()}
          </TabsContent>

          <TabsContent value="school">
            {renderSchoolConfiguration()}
          </TabsContent>

          <TabsContent value="system">
            {renderSystemPreferences()}
          </TabsContent>
        </Tabs>

        {/* Password Change Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.current_password}
                    onChange={(e) => 
                      setPasswordForm({ ...passwordForm, current_password: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.new_password}
                    onChange={(e) => 
                      setPasswordForm({ ...passwordForm, new_password: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => 
                    setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePasswordChange} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                Change Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Logo Upload Dialog */}
        <Dialog open={isLogoDialogOpen} onOpenChange={setIsLogoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload School Logo</DialogTitle>
              <DialogDescription>
                Choose a new logo for your school. PNG or JPG format, max 2MB.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your logo here, or click to browse
                </p>
                <Button variant="outline" size="sm">
                  Choose File
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLogoDialogOpen(false)}>
                Cancel
              </Button>
              <Button disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Logo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SchoolSettings;