import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquare, Key, User, Phone, Send, Loader2, Save, 
  RefreshCw, CheckCircle, AlertCircle, MessageCircle, Sliders 
} from 'lucide-react';

export default function CommunicationSettings() {
  const { toast } = useToast();
  
  // Credentials
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  const [waNumber, setWaNumber] = useState('');
  
  // Channel switches
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);

  // Test form
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('This is a test notification from MUCHI.');

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
        throw new Error('Failed to fetch communication settings');
      }

      const data = await response.json();
      
      setUsername(data.africastalking_username || '');
      setApiKey(data.africastalking_apikey || '');
      setSenderId(data.africastalking_sms_sender_id || '');
      setWaNumber(data.africastalking_whatsapp_number || '');
      setSmsEnabled(data.africastalking_sms_enabled === 'true');
      setWhatsappEnabled(data.africastalking_whatsapp_enabled === 'true');
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load settings.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        africastalking_username: username,
        africastalking_apikey: apiKey,
        africastalking_sms_sender_id: senderId,
        africastalking_whatsapp_number: waNumber,
        africastalking_sms_enabled: String(smsEnabled),
        africastalking_whatsapp_enabled: String(whatsappEnabled),
      };

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save communication settings');
      }

      toast({
        title: 'Settings Saved',
        description: "Africa's Talking configurations updated successfully.",
      });
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone || !testMessage) {
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: 'Please specify a test phone number and message.',
      });
      return;
    }

    setTestingSms(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/communication/test-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ to: testPhone, message: testMessage })
      });

      const data = await response.json();
      if (!response.ok) {
        const detail = data.error ? (typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error)) : '';
        const errMsg = detail ? `Failed to send test SMS: ${detail}` : (data.message || 'Failed to send test SMS');
        throw new Error(errMsg);
      }

      toast({
        title: '✅ Test SMS Sent',
        description: `SMS dispatched successfully to ${testPhone}.`,
      });
    } catch (error: any) {
      console.error('Test SMS error:', error);
      toast({
        variant: 'destructive',
        title: 'Test SMS Failed',
        description: error.message,
      });
    } finally {
      setTestingSms(false);
    }
  };

  const handleTestWhatsapp = async () => {
    if (!testPhone || !testMessage) {
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: 'Please specify a test phone number and message.',
      });
      return;
    }

    setTestingWhatsapp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/communication/test-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ to: testPhone, message: testMessage })
      });

      const data = await response.json();
      if (!response.ok) {
        const detail = data.error ? (typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error)) : '';
        const errMsg = detail ? `Failed to send test WhatsApp message: ${detail}` : (data.message || 'Failed to send test WhatsApp message');
        throw new Error(errMsg);
      }

      toast({
        title: '✅ Test WhatsApp Sent',
        description: `WhatsApp message dispatched successfully to ${testPhone}.`,
      });
    } catch (error: any) {
      console.error('Test WhatsApp error:', error);
      toast({
        variant: 'destructive',
        title: 'Test WhatsApp Failed',
        description: error.message,
      });
    } finally {
      setTestingWhatsapp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const isCredentialsConfigured = username && apiKey;
  const isSandbox = username.toLowerCase() === 'sandbox';

  return (
    <div className="space-y-6">
      {/* Configuration Status Banner */}
      <Alert className={isCredentialsConfigured ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'}>
        {isCredentialsConfigured ? (
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        )}
        <AlertTitle className={isCredentialsConfigured ? 'text-green-900 dark:text-green-300 font-bold' : 'text-amber-900 dark:text-amber-300 font-bold'}>
          {isCredentialsConfigured ? "Africa's Talking Credentials Configured" : "Action Required: Credentials Missing"}
        </AlertTitle>
        <AlertDescription className={isCredentialsConfigured ? 'text-green-800 dark:text-green-400 text-sm' : 'text-amber-800 dark:text-amber-400 text-sm'}>
          {isCredentialsConfigured ? (
            <>
              API connectivity is active. Running in <strong>{isSandbox ? 'Sandbox Mode' : 'Production Mode'}</strong>.
              <ul className="list-disc list-inside mt-2 text-xs opacity-90 space-y-1">
                <li>SMS Status: <span className={smsEnabled ? 'text-green-600 font-bold' : 'text-slate-500 font-bold'}>{smsEnabled ? 'Enabled' : 'Disabled'}</span></li>
                <li>WhatsApp Status: <span className={whatsappEnabled ? 'text-green-600 font-bold' : 'text-slate-500 font-bold'}>{whatsappEnabled ? 'Enabled' : 'Disabled'}</span></li>
              </ul>
            </>
          ) : (
            "Please configure your Africa's Talking Username and API Key to enable system-wide SMS and WhatsApp notifications."
          )}
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* API Credentials */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              Africa's Talking API Credentials
            </CardTitle>
            <CardDescription>Configure connection credentials for API access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="at-username">Username</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="at-username" 
                  placeholder="e.g. sandbox or your_at_username" 
                  className="pl-9"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">Use 'sandbox' to run delivery in the test sandbox environment.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="at-apikey">API Key</Label>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="at-apikey" 
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••••" 
                  className="pl-9"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">Ensure this matches your environment (Sandbox keys start with atsk_ and must be used with the 'sandbox' username).</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="at-whatsapp-number">WhatsApp Number (waNumber)</Label>
              <div className="relative">
                <MessageCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="at-whatsapp-number" 
                  placeholder="e.g. +260971234567" 
                  className="pl-9"
                  value={waNumber}
                  onChange={e => setWaNumber(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">Your registered WhatsApp channel phone number on Africa's Talking.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="at-senderid">SMS Sender ID / Shortcode</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="at-senderid" 
                  placeholder="e.g. MUCHI" 
                  className="pl-9"
                  value={senderId}
                  onChange={e => setSenderId(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">Approved alphanumeric Sender ID or Shortcode. Leave empty to use default.</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Channels Toggle */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-600" />
                Channel Activation
              </CardTitle>
              <CardDescription>Activate individual communication streams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">SMS Notifications</Label>
                  <p className="text-xs text-slate-500">Dispatch alerts via standard SMS carrier messaging</p>
                </div>
                <Switch 
                  checked={smsEnabled} 
                  onCheckedChange={setSmsEnabled} 
                  disabled={!isCredentialsConfigured}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">WhatsApp Notifications</Label>
                  <p className="text-xs text-slate-500">Dispatch alerts via Africa's Talking WhatsApp channel</p>
                </div>
                <Switch 
                  checked={whatsappEnabled} 
                  onCheckedChange={setWhatsappEnabled} 
                  disabled={!isCredentialsConfigured || !waNumber}
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Center */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-600" />
                Communication Test Center
              </CardTitle>
              <CardDescription>Verify integration and API response in real-time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-100 dark:border-amber-900/30">
                ⚠️ Note: Tests are executed using your saved settings. If you changed credentials, please click "Save Configurations" first.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="test-phone">Test Phone Number</Label>
                <Input 
                  id="test-phone" 
                  placeholder="e.g. +260971234567" 
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  disabled={!isCredentialsConfigured}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-msg">Message Content</Label>
                <Textarea 
                  id="test-msg" 
                  placeholder="Type test message..." 
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  disabled={!isCredentialsConfigured}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={handleTestSms} 
                  disabled={testingSms || !isCredentialsConfigured || !testPhone} 
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {testingSms ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  ) : (
                    <Send className="h-4 w-4 text-blue-500" />
                  )}
                  Test SMS
                </Button>
                <Button 
                  onClick={handleTestWhatsapp} 
                  disabled={testingWhatsapp || !isCredentialsConfigured || !testPhone || !waNumber} 
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {testingWhatsapp ? (
                    <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-green-500" />
                  )}
                  Test WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Save Action Bar */}
      <div className="flex gap-3 pt-4 border-t dark:border-slate-800">
        <Button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Configurations
        </Button>
        <Button variant="ghost" onClick={fetchSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload
        </Button>
      </div>
    </div>
  );
}
