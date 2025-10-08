import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Heart, MessageCircle, TrendingUp, Calendar, Shield, Sparkles, Activity, BookOpen, Phone } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Link, useNavigate } from 'react-router-dom';

interface HealthInsight {
  id: string;
  type: 'recommendation' | 'alert' | 'achievement' | 'reminder';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: 'sexual_health' | 'mental_health' | 'general_health' | 'preventive_care';
  actionable: boolean;
  dueDate?: string;
}

interface HealthMetric {
  name: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  lastUpdated: string;
}

const mockHealthInsights: HealthInsight[] = [
  {
    id: '1',
    type: 'reminder',
    title: 'Annual STI Screening Due',
    description: 'Your last comprehensive STI screening was 11 months ago. Schedule your annual screening to maintain optimal sexual health.',
    priority: 'medium',
    category: 'sexual_health',
    actionable: true,
    dueDate: '2024-02-01'
  },
  {
    id: '2',
    type: 'recommendation',
    title: 'Mental Health Check-in',
    description: 'Based on your recent stress levels, consider scheduling a mental health consultation or trying our guided meditation exercises.',
    priority: 'medium',
    category: 'mental_health',
    actionable: true
  },
  {
    id: '3',
    type: 'achievement',
    title: 'Medication Adherence Streak',
    description: 'Congratulations! You\'ve maintained 100% medication adherence for 30 days straight.',
    priority: 'low',
    category: 'general_health',
    actionable: false
  },
  {
    id: '4',
    type: 'alert',
    title: 'Blood Pressure Trend',
    description: 'Your blood pressure readings have been trending upward. Consider scheduling a follow-up appointment.',
    priority: 'high',
    category: 'preventive_care',
    actionable: true
  }
];

const mockHealthMetrics: HealthMetric[] = [
  {
    name: 'Overall Health Score',
    value: '85/100',
    trend: 'up',
    status: 'good',
    lastUpdated: '2024-01-20'
  },
  {
    name: 'Mental Wellness',
    value: '7.2/10',
    trend: 'stable',
    status: 'good',
    lastUpdated: '2024-01-19'
  },
  {
    name: 'Medication Adherence',
    value: '100%',
    trend: 'stable',
    status: 'good',
    lastUpdated: '2024-01-20'
  },
  {
    name: 'Risk Assessment',
    value: 'Low Risk',
    trend: 'down',
    status: 'good',
    lastUpdated: '2024-01-18'
  }
];

interface PersonalHealthAssistantProps {
  guestMode?: boolean;
}

export default function PersonalHealthAssistant({ guestMode = false }: PersonalHealthAssistantProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [selectedInsight, setSelectedInsight] = useState<HealthInsight | null>(null);
  
  // For guest users, show limited functionality
  const isGuest = guestMode || !session;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'recommendation': return <Sparkles className="h-4 w-4" />;
      case 'alert': return <Activity className="h-4 w-4" />;
      case 'achievement': return <TrendingUp className="h-4 w-4" />;
      case 'reminder': return <Calendar className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getInsightColor = (priority: string, type: string) => {
    if (type === 'achievement') return 'border-green-200 bg-green-50';
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getMetricColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  // Remove the authentication check - handle guest mode in the main component

  return (
    <div className="container mx-auto py-8 px-4 pb-32">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {isGuest ? 'AI Health Assistant (Guest Mode)' : 'My Personal Health Assistant'}
        </h1>
        <p className="text-muted-foreground">
          {isGuest 
            ? 'Try our AI-powered health support. Sign in for personalized insights and to save your chat history.'
            : 'AI-powered insights, recommendations, and support for your complete health journey.'
          }
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Shield className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-600">
            {isGuest ? 'Anonymous • Secure • No Data Saved' : 'Secure • Private • Personalized'}
          </span>
        </div>
        {isGuest && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Guest Mode:</strong> Your conversations won't be saved. 
              <Link to="/login" className="underline font-medium">Sign in</Link> to access full features and save your health data.
            </p>
          </div>
        )}
      </div>

      {/* Health Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {mockHealthMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{metric.name}</span>
                <span className="text-xs">{getTrendIcon(metric.trend)}</span>
              </div>
              <div className={`text-2xl font-bold ${getMetricColor(metric.status)}`}>
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Updated {new Date(metric.lastUpdated).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI-Powered Health Services */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => navigate('/sexual-health-ai')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Sexual Health Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              AI-powered guidance on sexual health, contraception, STI prevention, and confidential consultations.
            </p>
            <div className="flex flex-wrap gap-1 mb-3">
              <Badge variant="outline" className="text-xs">Contraception</Badge>
              <Badge variant="outline" className="text-xs">STI Prevention</Badge>
              <Badge variant="outline" className="text-xs">Consultations</Badge>
            </div>
            <Button size="sm" className="w-full">
              Access Sexual Health AI
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => navigate('/mental-health-ai')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              Mental Health Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              24/7 AI mental health companion with personalized coping strategies and counselor connections.
            </p>
            <div className="flex flex-wrap gap-1 mb-3">
              <Badge variant="outline" className="text-xs">AI Chat</Badge>
              <Badge variant="outline" className="text-xs">Coping Strategies</Badge>
              <Badge variant="outline" className="text-xs">Counselors</Badge>
            </div>
            <Button size="sm" className="w-full">
              Chat with Mental Health AI
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Health Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Personalized health insights, risk predictions, and preventive care recommendations.
            </p>
            <div className="flex flex-wrap gap-1 mb-3">
              <Badge variant="outline" className="text-xs">Risk Analysis</Badge>
              <Badge variant="outline" className="text-xs">Predictions</Badge>
              <Badge variant="outline" className="text-xs">Prevention</Badge>
            </div>
            <Button size="sm" className="w-full" variant="outline">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* AI Health Insights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Health Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockHealthInsights.map((insight) => (
              <div key={insight.id} 
                   className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${
                     getInsightColor(insight.priority, insight.type)
                   }`}
                   onClick={() => setSelectedInsight(insight)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {getInsightIcon(insight.type)}
                    <div>
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      {insight.dueDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {new Date(insight.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={insight.priority === 'high' ? 'destructive' : 
                                  insight.priority === 'medium' ? 'default' : 'secondary'}
                           className="text-xs">
                      {insight.priority}
                    </Badge>
                    {insight.actionable && (
                      <Badge variant="outline" className="text-xs">
                        Action Required
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - Removed from here and added as floating component at the bottom */}

      {/* Detailed Insight Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
             onClick={() => setSelectedInsight(null)}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getInsightIcon(selectedInsight.type)}
                {selectedInsight.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedInsight.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant={selectedInsight.priority === 'high' ? 'destructive' : 
                              selectedInsight.priority === 'medium' ? 'default' : 'secondary'}>
                  {selectedInsight.priority} priority
                </Badge>
                <Badge variant="outline">
                  {selectedInsight.category.replace('_', ' ')}
                </Badge>
                {selectedInsight.actionable && (
                  <Badge variant="outline">
                    Action Required
                  </Badge>
                )}
              </div>
              
              {selectedInsight.dueDate && (
                <div className="mb-4 p-2 bg-yellow-50 rounded border">
                  <p className="text-xs text-yellow-800">
                    Due Date: {new Date(selectedInsight.dueDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                {selectedInsight.actionable && (
                  <Button size="sm" className="flex-1">
                    Take Action
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setSelectedInsight(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Quick Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
        <Card className="shadow-lg border-t-4 border-primary transition-all transform hover:translate-y-[-5px]">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Book Appointment
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat with AI
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Health Resources
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Emergency Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}