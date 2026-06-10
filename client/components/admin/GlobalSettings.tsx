
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Save, Loader2, Globe, Mail, Shield, Server, MessageCircle, Settings, RefreshCw, Gift, Phone, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface SystemSettings {
  systemName: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  supportEmail: string;
  defaultLanguage: string;
  sessionTimeout: number; // in minutes
  whatsappNumber: string;
  defaultCurrency: string;
  supportedCurrencies: string;
  setupCompletionRewardDays: number;
  contactPhone: string;
  contactEmail: string;
  contactOffice: string;
}

const defaultSettings: SystemSettings = {
  systemName: "MUCHI Central",
  maintenanceMode: false,
  registrationOpen: true,
  supportEmail: "support@muchi.com",
  defaultLanguage: "en",
  sessionTimeout: 60,
  whatsappNumber: "260570260374",
  defaultCurrency: "ZMW",
  supportedCurrencies: '["ZMW", "USD", "ZAR"]',
  setupCompletionRewardDays: 30,
  contactPhone: "+260 97 1234567",
  contactEmail: "info@muchi.edu.zm",
  contactOffice: "45 Independence Avenue\nLusaka\nZambia"
};

import ConfigurationManagement from './ConfigurationManagement';
import EmailSettings from './EmailSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function GlobalSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      
      // Map API snake_case to frontend camelCase
      const mappedSettings: SystemSettings = {
        systemName: data.system_name || defaultSettings.systemName,
        maintenanceMode: data.maintenance_mode === 'true',
        registrationOpen: data.registration_open === 'true',
        supportEmail: data.support_email || defaultSettings.supportEmail,
        defaultLanguage: data.default_language || defaultSettings.defaultLanguage,
        sessionTimeout: parseInt(data.session_timeout) || defaultSettings.sessionTimeout,
        whatsappNumber: data.whatsapp_number || defaultSettings.whatsappNumber,
        defaultCurrency: data.default_currency || defaultSettings.defaultCurrency,
        supportedCurrencies: data.supported_currencies || defaultSettings.supportedCurrencies,
        setupCompletionRewardDays: parseInt(data.setup_completion_reward_days) || defaultSettings.setupCompletionRewardDays,
        contactPhone: data.contact_phone || defaultSettings.contactPhone,
        contactEmail: data.contact_email || defaultSettings.contactEmail,
        contactOffice: data.contact_office || defaultSettings.contactOffice
      };

      setSettings(mappedSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load system settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Map frontend camelCase to API snake_case
      const apiSettings = {
        system_name: settings.systemName,
        maintenance_mode: String(settings.maintenanceMode),
        registration_open: String(settings.registrationOpen),
        support_email: settings.supportEmail,
        default_language: settings.defaultLanguage,
        session_timeout: String(settings.sessionTimeout),
        whatsapp_number: settings.whatsappNumber,
        default_currency: settings.defaultCurrency,
        supported_currencies: settings.supportedCurrencies,
        setup_completion_reward_days: String(settings.setupCompletionRewardDays),
        contact_phone: settings.contactPhone,
        contact_email: settings.contactEmail,
        contact_office: settings.contactOffice
      };

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(apiSettings)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save settings');
      }
      
      toast({
        title: "Settings saved",
        description: "Global system configuration has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center mb-4">
          <TabsList className="flex overflow-x-auto w-full sm:w-auto h-auto gap-1 bg-slate-100 p-1 dark:bg-slate-800 rounded-lg border scrollbar-none">
            <TabsTrigger value="general" className="font-bold text-sm py-2.5 px-4 shrink-0 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General Settings
            </TabsTrigger>
            <TabsTrigger value="metadata" className="font-bold text-sm py-2.5 px-4 shrink-0 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Metadata Management
            </TabsTrigger>
            <TabsTrigger value="email" className="font-bold text-sm py-2.5 px-4 shrink-0 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0 w-full sm:w-auto">
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </TabsContent>
        </div>

        <TabsContent value="general" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Global Settings</h2>
              <p className="text-slate-600 dark:text-slate-400">Manage system-wide configurations and preferences.</p>
            </div>
          </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              General Configuration
            </CardTitle>
            <CardDescription>Basic system identity and localization settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="systemName">System Name</Label>
              <Input 
                id="systemName" 
                value={settings.systemName} 
                onChange={(e) => setSettings({...settings, systemName: e.target.value})}
              />
              <p className="text-xs text-slate-500">Displayed in browser title and emails.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Default Language</Label>
              <select 
                id="language"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={settings.defaultLanguage}
                onChange={(e) => setSettings({...settings, defaultLanguage: e.target.value})}
              >
                <option value="en">English (US)</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Default Currency</Label>
              <Input 
                id="defaultCurrency" 
                value={settings.defaultCurrency} 
                onChange={(e) => setSettings({...settings, defaultCurrency: e.target.value.toUpperCase()})}
                placeholder="e.g. ZMW"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supportedCurrencies">Supported Currencies (JSON array)</Label>
              <Input 
                id="supportedCurrencies" 
                value={settings.supportedCurrencies} 
                onChange={(e) => setSettings({...settings, supportedCurrencies: e.target.value})}
                placeholder='e.g. ["ZMW", "USD"]'
              />
              <p className="text-xs text-slate-500">List of currencies allowed for fees.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  id="supportEmail" 
                  className="pl-9"
                  value={settings.supportEmail} 
                  onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp Support Number</Label>
              <div className="relative">
                <MessageCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-green-500" />
                <Input 
                  id="whatsappNumber" 
                  className="pl-9"
                  value={settings.whatsappNumber} 
                  onChange={(e) => setSettings({...settings, whatsappNumber: e.target.value})}
                  placeholder="e.g. 260970000000"
                />
              </div>
              <p className="text-xs text-slate-500">Number for WhatsApp integration (include country code without +)</p>
            </div>

            <Separator className="my-4" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">Public Contact Information</h3>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  id="contactPhone" 
                  className="pl-9"
                  value={settings.contactPhone} 
                  onChange={(e) => setSettings({...settings, contactPhone: e.target.value})}
                  placeholder="e.g. +260 97 1234567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  id="contactEmail" 
                  className="pl-9"
                  value={settings.contactEmail} 
                  onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                  placeholder="e.g. info@muchi.edu.zm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactOffice">Office Address</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <textarea 
                  id="contactOffice" 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={settings.contactOffice} 
                  onChange={(e) => setSettings({...settings, contactOffice: e.target.value})}
                  placeholder="e.g. 45 Independence Avenue..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-orange-500" />
              System Status & Access
            </CardTitle>
            <CardDescription>Control system availability and registration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label className="text-base">Maintenance Mode</Label>
                <p className="text-sm text-slate-500">
                  Prevent user access during maintenance
                </p>
              </div>
              <Switch 
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
              />
            </div>
            {settings.maintenanceMode && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  System is currently in maintenance mode. Only admins can log in.
                </AlertDescription>
              </Alert>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label className="text-base">Allow New Registrations</Label>
                <p className="text-sm text-slate-500">
                  Enable new schools/users to sign up
                </p>
              </div>
              <Switch 
                checked={settings.registrationOpen}
                onCheckedChange={(checked) => setSettings({...settings, registrationOpen: checked})}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              Security Policies
            </CardTitle>
            <CardDescription>Configure security thresholds and timeouts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input 
                id="sessionTimeout" 
                type="number"
                value={settings.sessionTimeout} 
                onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value) || 30})}
              />
              <p className="text-xs text-slate-500">Auto-logout inactive users after this period.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-indigo-500" />
              Setup Completion Rewards
            </CardTitle>
            <CardDescription>Configure trial extensions awarded when a school completes their initial setup.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="setupCompletionRewardDays">Free Trial Extension Reward (Days)</Label>
              <Input 
                id="setupCompletionRewardDays" 
                type="number"
                min="0"
                value={settings.setupCompletionRewardDays} 
                onChange={(e) => setSettings({...settings, setupCompletionRewardDays: parseInt(e.target.value) || 0})}
              />
              <p className="text-xs text-slate-500">Number of free usage days added to their trial/license on 100% setup completion.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>

    <TabsContent value="metadata">
      <ConfigurationManagement />
    </TabsContent>

    <TabsContent value="email" className="space-y-6">
      <EmailSettings />
    </TabsContent>
  </Tabs>
</div>
);
}
