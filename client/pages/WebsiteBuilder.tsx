import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Globe, Eye, Settings, Palette, Layout, Save, Upload, Brain, Sparkles, Wand2, MessageCircle, TrendingUp } from 'lucide-react';
import { Api } from '../lib/api';
import type { HospitalWebsite, WebsiteTheme, CreateWebsiteRequest, UpdateWebsiteRequest } from '@shared/api';

interface WebsiteBuilderProps {
  hospitalId: string;
}

// Helper functions for theme-specific content
const getThemeDefaultTitle = (themeId: string) => {
  const titles: Record<string, string> = {
    'modern-hospital': 'Advanced Healthcare for Everyone',
    'pediatric-care': 'Caring for Your Little Ones',
    'dental-clinic': 'Your Smile is Our Priority',
    'specialty-care': 'Excellence in Specialized Medicine',
    'wellness-center': 'Your Journey to Wellness Starts Here',
    'emergency-care': '24/7 Emergency Medical Services',
  };
  return titles[themeId] || 'Welcome to Our Healthcare Facility';
};

const getThemeDefaultDescription = (themeId: string) => {
  const descriptions: Record<string, string> = {
    'modern-hospital': 'State-of-the-art medical care with compassionate service. Our experienced team is dedicated to your health and well-being.',
    'pediatric-care': 'Creating a fun, safe, and nurturing environment for children. Our pediatric specialists make healthcare a positive experience.',
    'dental-clinic': 'Comprehensive dental care using the latest technology. From routine cleanings to advanced procedures, we keep your smile healthy.',
    'specialty-care': 'Leading experts in specialized medical fields. We provide advanced treatments with personalized care for complex conditions.',
    'wellness-center': 'Holistic approach to health and wellness. Preventive care, nutrition counseling, and wellness programs for a healthier you.',
    'emergency-care': 'Immediate medical attention when you need it most. Our emergency team is ready 24/7 to provide life-saving care.',
  };
  return descriptions[themeId] || 'Quality healthcare services with compassionate care.';
};

const getThemePrimaryAction = (themeId: string) => {
  const actions: Record<string, string> = {
    'modern-hospital': 'Schedule Appointment',
    'pediatric-care': 'Book Visit',
    'dental-clinic': 'Book Consultation',
    'specialty-care': 'Request Consultation',
    'wellness-center': 'Start Your Journey',
    'emergency-care': 'Emergency Contact',
  };
  return actions[themeId] || 'Book Appointment';
};

const getThemeServices = (themeId: string) => {
  const services: Record<string, Array<{icon: string, title: string, description: string}>> = {
    'modern-hospital': [
      { icon: '🏥', title: 'Emergency Care', description: '24/7 emergency medical services' },
      { icon: '👨‍⚕️', title: 'Expert Doctors', description: 'Board-certified specialists' },
      { icon: '🔬', title: 'Advanced Diagnostics', description: 'State-of-the-art equipment' },
    ],
    'pediatric-care': [
      { icon: '👶', title: 'Newborn Care', description: 'Specialized care for newborns' },
      { icon: '🎈', title: 'Child-Friendly Environment', description: 'Fun and comfortable spaces' },
      { icon: '💉', title: 'Gentle Procedures', description: 'Minimizing discomfort for kids' },
    ],
    'dental-clinic': [
      { icon: '🦷', title: 'General Dentistry', description: 'Comprehensive oral health care' },
      { icon: '✨', title: 'Cosmetic Dentistry', description: 'Beautiful, confident smiles' },
      { icon: '🔧', title: 'Advanced Technology', description: 'Latest dental innovations' },
    ],
    'specialty-care': [
      { icon: '🧠', title: 'Neurology', description: 'Brain and nervous system care' },
      { icon: '❤️', title: 'Cardiology', description: 'Heart and cardiovascular health' },
      { icon: '🦴', title: 'Orthopedics', description: 'Bone and joint specialists' },
    ],
    'wellness-center': [
      { icon: '🧘', title: 'Holistic Care', description: 'Mind, body, and spirit wellness' },
      { icon: '🥗', title: 'Nutrition Counseling', description: 'Personalized dietary guidance' },
      { icon: '💪', title: 'Fitness Programs', description: 'Customized exercise plans' },
    ],
    'emergency-care': [
      { icon: '🚑', title: 'Ambulance Services', description: 'Rapid emergency transport' },
      { icon: '⚡', title: 'Trauma Care', description: 'Critical injury treatment' },
      { icon: '🏃', title: 'Fast Response', description: 'Immediate medical attention' },
    ],
  };
  return services[themeId] || [
    { icon: '🏥', title: 'Medical Care', description: 'Quality healthcare services' },
    { icon: '👨‍⚕️', title: 'Professional Staff', description: 'Experienced medical team' },
    { icon: '🔬', title: 'Modern Facilities', description: 'Advanced medical equipment' },
  ];
};

export default function WebsiteBuilder({ hospitalId }: WebsiteBuilderProps) {
  const [website, setWebsite] = useState<HospitalWebsite | null>(null);
  const [themes, setThemes] = useState<WebsiteTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'draft' | 'published' | 'error'>('draft');
  const [customDomain, setCustomDomain] = useState('');
  const [sslEnabled, setSslEnabled] = useState(true);
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [lastPublished, setLastPublished] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('settings');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    title?: string;
    description?: string;
    layout?: string;
    seo?: string[];
  }>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    domain: '',
    subdomain: '',
  });

  useEffect(() => {
    loadWebsiteData();
    loadThemes();
  }, [hospitalId]);

  const loadWebsiteData = async () => {
    try {
      const existingWebsite = await Api.getWebsite();
      if (existingWebsite) {
        setWebsite(existingWebsite);
        setFormData({
          name: existingWebsite.name,
          title: existingWebsite.title || '',
          description: existingWebsite.description || '',
          domain: existingWebsite.domain || '',
          subdomain: existingWebsite.subdomain || '',
        });
        setSelectedTheme(existingWebsite.theme_id || '');
      }
    } catch (error) {
      console.error('Failed to load website:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadThemes = async () => {
    try {
      const availableThemes = await Api.getThemes();
      setThemes(availableThemes);
      if (!selectedTheme && availableThemes.length > 0) {
        setSelectedTheme(availableThemes[0].id);
      }
    } catch (error) {
      console.error('Failed to load themes:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (website) {
        // Update existing website
        const updatePayload: UpdateWebsiteRequest = {
          ...formData,
          themeId: selectedTheme,
        };
        const updatedWebsite = await Api.updateWebsite(updatePayload);
        setWebsite(updatedWebsite);
      } else {
        // Create new website
        const createPayload: CreateWebsiteRequest = {
          hospitalId,
          ...formData,
          themeId: selectedTheme,
        };
        const newWebsite = await Api.createWebsite(createPayload);
        setWebsite(newWebsite);
      }
      alert('Website saved successfully!');
    } catch (error) {
      console.error('Failed to save website:', error);
      alert('Failed to save website. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!website) {
      alert('Please save your website first.');
      return;
    }

    setIsPublishing(true);
    setPublishStatus('draft');
    
    try {
        // Update website with domain settings
        const updatedWebsite = {
          ...website,
          domainName: customDomain || website.domainName,
          sslEnabled: sslEnabled,
        };
        
        await Api.updateWebsite(website.id, updatedWebsite);
        const result = await Api.publishWebsite(website.id);
        
        if (result.success) {
          setDeploymentUrl(result.deploymentUrl || '');
          setLastPublished(new Date());
          setPublishStatus('published');
          setWebsite(prev => prev ? { 
            ...prev, 
            isPublished: true, 
            domainName: customDomain || prev.domainName,
            deploymentUrl: result.deploymentUrl,
            publishedAt: new Date().toISOString()
          } : null);
          alert('Website published successfully!');
        }
      } catch (error) {
        console.error('Failed to publish website:', error);
        setPublishStatus('error');
        alert('Failed to publish website. Please try again.');
      } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading website builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Globe className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Website Builder</h1>
              </div>
              {website && (
                <Badge variant={website.is_published ? 'default' : 'secondary'}>
                  {website.is_published ? 'Published' : 'Draft'}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => alert('Preview functionality coming soon!')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing || !website}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isPublishing ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Website Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="settings">General</TabsTrigger>
                    <TabsTrigger value="theme">Theme</TabsTrigger>
                    <TabsTrigger value="ai">AI Assistant</TabsTrigger>
                    <TabsTrigger value="publish">Publish</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="settings" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Website Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="My Hospital Website"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="title">Page Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="Welcome to Our Hospital"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Providing quality healthcare services..."
                        rows={3}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label htmlFor="subdomain">Subdomain</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="subdomain"
                          value={formData.subdomain}
                          onChange={(e) => handleInputChange('subdomain', e.target.value)}
                          placeholder="myhospital"
                        />
                        <span className="text-sm text-gray-500">.flova.com</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="domain">Custom Domain (Optional)</Label>
                      <Input
                        id="domain"
                        value={formData.domain}
                        onChange={(e) => handleInputChange('domain', e.target.value)}
                        placeholder="www.myhospital.com"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="theme" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Choose Theme</Label>
                      <div className="space-y-3">
                        {themes.map((theme) => {
                          const cssVars = theme.css_variables ? JSON.parse(theme.css_variables) : {};
                          const layoutConfig = theme.layout_config ? JSON.parse(theme.layout_config) : {};
                          return (
                            <div
                              key={theme.id}
                              className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                                selectedTheme === theme.id
                                  ? 'border-blue-500 bg-blue-50 shadow-md'
                                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                              }`}
                              onClick={() => setSelectedTheme(theme.id)}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{theme.name}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{theme.description}</p>
                                  </div>
                                  <div className="flex space-x-1 ml-3">
                                    <div
                                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                      style={{ backgroundColor: cssVars.primaryColor || '#3b82f6' }}
                                      title="Primary Color"
                                    ></div>
                                    <div
                                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                      style={{ backgroundColor: cssVars.secondaryColor || '#64748b' }}
                                      title="Secondary Color"
                                    ></div>
                                    {cssVars.accentColor && (
                                      <div
                                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                        style={{ backgroundColor: cssVars.accentColor }}
                                        title="Accent Color"
                                      ></div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span className="font-medium">{cssVars.fontFamily?.split(',')[0] || 'Default'}</span>
                                  <span>{layoutConfig.sections?.length || 0} sections</span>
                                </div>
                                {selectedTheme === theme.id && (
                                  <div className="pt-2 border-t border-blue-200">
                                    <div className="flex flex-wrap gap-1">
                                      {layoutConfig.sections?.map((section: string, index: number) => (
                                        <span
                                          key={index}
                                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                        >
                                          {section.replace('-', ' ')}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="ai" className="space-y-4 mt-4">
                    <div className="space-y-6">
                      {/* AI Content Generation */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Brain className="h-5 w-5 text-blue-600" />
                          <Label className="text-base font-semibold">AI Content Generation</Label>
                        </div>
                        <p className="text-sm text-gray-600">Let AI generate compelling content for your hospital website</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setAiGenerating(true);
                              setTimeout(() => {
                                setAiSuggestions(prev => ({
                                  ...prev,
                                  title: 'Excellence in Healthcare - Your Trusted Medical Partner'
                                }));
                                setAiGenerating(false);
                              }, 2000);
                            }}
                            disabled={aiGenerating}
                            className="h-auto p-3 flex flex-col items-start"
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <Wand2 className="h-4 w-4" />
                              <span className="font-medium">Generate Title</span>
                            </div>
                            <span className="text-xs text-gray-500">AI-powered page titles</span>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setAiGenerating(true);
                              setTimeout(() => {
                                setAiSuggestions(prev => ({
                                  ...prev,
                                  description: 'Providing comprehensive healthcare services with state-of-the-art technology and compassionate care. Our experienced medical team is dedicated to your health and well-being, offering personalized treatment plans and 24/7 emergency services.'
                                }));
                                setAiGenerating(false);
                              }, 2000);
                            }}
                            disabled={aiGenerating}
                            className="h-auto p-3 flex flex-col items-start"
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <Sparkles className="h-4 w-4" />
                              <span className="font-medium">Generate Description</span>
                            </div>
                            <span className="text-xs text-gray-500">Compelling descriptions</span>
                          </Button>
                        </div>
                        
                        {/* AI Suggestions Display */}
                        {(aiSuggestions.title || aiSuggestions.description) && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-3">AI Suggestions</h4>
                            {aiSuggestions.title && (
                              <div className="mb-3">
                                <Label className="text-sm font-medium text-blue-800">Suggested Title:</Label>
                                <div className="flex items-center space-x-2 mt-1">
                                  <p className="text-sm bg-white p-2 rounded border flex-1">{aiSuggestions.title}</p>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleInputChange('title', aiSuggestions.title!)}
                                  >
                                    Use
                                  </Button>
                                </div>
                              </div>
                            )}
                            {aiSuggestions.description && (
                              <div>
                                <Label className="text-sm font-medium text-blue-800">Suggested Description:</Label>
                                <div className="flex items-start space-x-2 mt-1">
                                  <p className="text-sm bg-white p-2 rounded border flex-1">{aiSuggestions.description}</p>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleInputChange('description', aiSuggestions.description!)}
                                  >
                                    Use
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* AI Layout Suggestions */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Layout className="h-5 w-5 text-purple-600" />
                          <Label className="text-base font-semibold">Smart Layout Suggestions</Label>
                        </div>
                        <p className="text-sm text-gray-600">AI-powered layout recommendations based on your hospital type</p>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Patient-Focused Layout</h4>
                                <p className="text-sm text-gray-600">Emphasizes appointment booking and patient services</p>
                              </div>
                              <Button size="sm" variant="outline">Apply</Button>
                            </div>
                          </div>
                          
                          <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">Service-Centered Layout</h4>
                                <p className="text-sm text-gray-600">Highlights medical services and specialties</p>
                              </div>
                              <Button size="sm" variant="outline">Apply</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* AI Chat Integration */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="h-5 w-5 text-green-600" />
                          <Label className="text-base font-semibold">AI Chat Assistant</Label>
                        </div>
                        <p className="text-sm text-gray-600">Add an AI-powered chat assistant for patient inquiries</p>
                        
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium">Virtual Health Assistant</h4>
                              <p className="text-sm text-gray-600">24/7 AI chat for appointment booking and health questions</p>
                            </div>
                            <Button size="sm">Enable Chat</Button>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            Features: Appointment scheduling, FAQ responses, symptom checker, emergency guidance
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* SEO Optimization */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-orange-600" />
                          <Label className="text-base font-semibold">SEO Optimization</Label>
                        </div>
                        <p className="text-sm text-gray-600">AI-powered SEO recommendations to improve search visibility</p>
                        
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setAiGenerating(true);
                            setTimeout(() => {
                              setAiSuggestions(prev => ({
                                ...prev,
                                seo: [
                                  'Add "emergency care near me" to page title',
                                  'Include local area keywords in description',
                                  'Add structured data for medical organization',
                                  'Optimize images with alt text for medical services',
                                  'Create location-specific landing pages'
                                ]
                              }));
                              setAiGenerating(false);
                            }, 1500);
                          }}
                          disabled={aiGenerating}
                          className="w-full"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          {aiGenerating ? 'Analyzing...' : 'Generate SEO Recommendations'}
                        </Button>
                        
                        {aiSuggestions.seo && (
                          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <h4 className="font-medium text-orange-900 mb-3">SEO Recommendations</h4>
                            <ul className="space-y-2">
                              {aiSuggestions.seo.map((suggestion, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <span className="text-orange-600 mt-1">•</span>
                                  <span className="text-sm text-orange-800">{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="publish" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="customDomain">Custom Domain</Label>
                        <Input
                          id="customDomain"
                          value={customDomain}
                          onChange={(e) => setCustomDomain(e.target.value)}
                          placeholder="www.yourhospital.com"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="sslEnabled"
                          checked={sslEnabled}
                          onChange={(e) => setSslEnabled(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="sslEnabled">Enable SSL (HTTPS)</Label>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label>Deployment Status</Label>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Status:</span>
                            <Badge variant={publishStatus === 'published' ? 'default' : publishStatus === 'error' ? 'destructive' : 'secondary'}>
                              {publishStatus === 'published' ? 'Live' : publishStatus === 'error' ? 'Failed' : 'Draft'}
                            </Badge>
                          </div>
                          {deploymentUrl && (
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">URL:</span>
                              <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                {deploymentUrl}
                              </a>
                            </div>
                          )}
                          {lastPublished && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Last Published:</span>
                              <span className="text-sm text-gray-600">
                                {lastPublished.toLocaleDateString()} {lastPublished.toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-4">
                        <div className="flex space-x-2">
                          <Button variant="outline" onClick={handleSave} disabled={isSaving} className="flex-1">
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Draft'}
                          </Button>
                          <Button onClick={handlePublish} disabled={isPublishing || !website} className="flex-1">
                            <Upload className="w-4 h-4 mr-2" />
                            {isPublishing ? 'Publishing...' : 'Publish Website'}
                          </Button>
                        </div>
                        
                        {publishStatus === 'published' && deploymentUrl && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-green-800 font-medium">🎉 Website is live!</span>
                              <Button variant="outline" size="sm" onClick={() => window.open(deploymentUrl, '_blank')}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Live Site
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {publishStatus === 'error' && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <span className="text-red-800 font-medium">❌ Publishing failed. Please try again.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Layout className="h-5 w-5" />
                  <span>Website Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg p-8 min-h-96">
                  {(() => {
                    const selectedThemeData = themes.find(t => t.id === selectedTheme);
                    const cssVars = selectedThemeData?.css_variables ? JSON.parse(selectedThemeData.css_variables) : {};
                    const layoutConfig = selectedThemeData?.layout_config ? JSON.parse(selectedThemeData.layout_config) : {};
                    
                    const themeStyles = {
                      backgroundColor: cssVars.backgroundColor || '#ffffff',
                      color: cssVars.textColor || '#1f2937',
                      fontFamily: cssVars.fontFamily || 'Inter, sans-serif',
                      borderRadius: cssVars.borderRadius || '8px'
                    };
                    
                    const primaryColor = cssVars.primaryColor || '#3b82f6';
                    const secondaryColor = cssVars.secondaryColor || '#64748b';
                    const accentColor = cssVars.accentColor || '#10b981';
                    
                    return (
                      <div className="rounded-lg shadow-sm p-6" style={themeStyles}>
                        {/* Dynamic Header based on theme */}
                        <div className="mb-8">
                          <div className="flex items-center justify-between pb-4" style={{ borderBottom: `2px solid ${primaryColor}20` }}>
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: primaryColor }}
                              >
                                <Globe className="h-6 w-6 text-white" />
                              </div>
                              <span className="font-semibold text-lg" style={{ color: cssVars.textColor }}>
                                {formData.name || selectedThemeData?.name || 'Hospital'}
                              </span>
                            </div>
                            <div className="hidden md:flex space-x-6 text-sm">
                              <span style={{ color: secondaryColor }}>Home</span>
                              <span style={{ color: secondaryColor }}>Services</span>
                              <span style={{ color: secondaryColor }}>About</span>
                              <span style={{ color: secondaryColor }}>Contact</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Hero Section */}
                        <div className="text-center space-y-6 mb-12">
                          <h1 className="text-3xl font-bold" style={{ color: cssVars.textColor }}>
                            {formData.title || getThemeDefaultTitle(selectedTheme)}
                          </h1>
                          <p className="max-w-2xl mx-auto" style={{ color: secondaryColor }}>
                            {formData.description || getThemeDefaultDescription(selectedTheme)}
                          </p>
                          <div className="flex justify-center space-x-4">
                            <button 
                              className="px-6 py-3 text-white font-medium rounded text-sm"
                              style={{ 
                                backgroundColor: primaryColor,
                                borderRadius: cssVars.borderRadius || '8px'
                              }}
                            >
                              {getThemePrimaryAction(selectedTheme)}
                            </button>
                            <button 
                              className="px-6 py-3 font-medium rounded text-sm border"
                              style={{ 
                                color: primaryColor,
                                borderColor: primaryColor,
                                borderRadius: cssVars.borderRadius || '8px'
                              }}
                            >
                              Learn More
                            </button>
                          </div>
                        </div>
                        
                        {/* Services Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {getThemeServices(selectedTheme).map((service, index) => (
                            <div 
                              key={index}
                              className="text-center p-6 rounded-lg"
                              style={{ 
                                backgroundColor: `${primaryColor}08`,
                                borderRadius: cssVars.borderRadius || '8px'
                              }}
                            >
                              <div 
                                className="w-14 h-14 rounded-lg mx-auto mb-4 flex items-center justify-center text-2xl"
                                style={{ backgroundColor: `${accentColor}20` }}
                              >
                                {service.icon}
                              </div>
                              <h3 className="font-semibold mb-2" style={{ color: cssVars.textColor }}>
                                {service.title}
                              </h3>
                              <p className="text-sm" style={{ color: secondaryColor }}>
                                {service.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="mt-4 text-center text-sm text-gray-500">
                  {formData.subdomain ? (
                    <span>Your website will be available at: <strong>{formData.subdomain}.flova.com</strong></span>
                  ) : (
                    <span>Enter a subdomain to see your website URL</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}