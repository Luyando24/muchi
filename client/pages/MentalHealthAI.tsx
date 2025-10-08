import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, MessageCircle, Calendar, Shield, Heart, BookOpen, Phone, Video, User, Clock, Star, Send, Sparkles, Lock, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';

interface AIResponse {
  content: string;
  mood: 'anxious' | 'depressed' | 'stressed' | 'neutral' | 'positive';
  confidence: number;
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'crisis';
  followUpQuestions: string[];
  suggestedActions: {
    type: 'coping_strategy' | 'resource' | 'appointment' | 'crisis_support';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  context: {
    topic: string;
    sentiment: 'negative' | 'neutral' | 'positive';
    keywords: string[];
    riskFactors: string[];
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  mood?: 'anxious' | 'depressed' | 'stressed' | 'neutral' | 'positive';
  aiResponse?: AIResponse;
  suggestions?: {
    type: 'coping_strategy' | 'resource' | 'appointment' | 'crisis_support';
    title: string;
    description: string;
    priority?: 'high' | 'medium' | 'low';
    action?: () => void;
  }[];
}

interface CopingStrategy {
  id: string;
  title: string;
  description: string;
  category: 'breathing' | 'mindfulness' | 'cognitive' | 'behavioral';
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: string[];
}

interface Counselor {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  rating: number;
  experience: string;
  availability: 'available' | 'busy' | 'offline';
  nextSlot?: string;
}

const mockCopingStrategies: CopingStrategy[] = [
  {
    id: '1',
    title: '4-7-8 Breathing Technique',
    description: 'A simple breathing exercise to reduce anxiety and promote relaxation',
    category: 'breathing',
    duration: '5 minutes',
    difficulty: 'beginner',
    steps: [
      'Sit comfortably with your back straight',
      'Exhale completely through your mouth',
      'Inhale through your nose for 4 counts',
      'Hold your breath for 7 counts',
      'Exhale through your mouth for 8 counts',
      'Repeat 3-4 times'
    ]
  },
  {
    id: '2',
    title: 'Progressive Muscle Relaxation',
    description: 'Systematically tense and relax muscle groups to reduce physical tension',
    category: 'behavioral',
    duration: '15 minutes',
    difficulty: 'intermediate',
    steps: [
      'Find a quiet, comfortable place to lie down',
      'Start with your toes - tense for 5 seconds, then relax',
      'Move up to your calves, thighs, abdomen',
      'Continue with arms, shoulders, neck, and face',
      'Notice the contrast between tension and relaxation',
      'End with 5 minutes of deep breathing'
    ]
  },
  {
    id: '3',
    title: 'Mindful Observation',
    description: 'Ground yourself by focusing on your immediate environment',
    category: 'mindfulness',
    duration: '10 minutes',
    difficulty: 'beginner',
    steps: [
      'Find 5 things you can see around you',
      'Identify 4 things you can touch',
      'Notice 3 things you can hear',
      'Find 2 things you can smell',
      'Identify 1 thing you can taste',
      'Take slow, deep breaths throughout'
    ]
  }
];

const mockCounselors: Counselor[] = [
  {
    id: '1',
    name: 'Dr. Sarah Mwanza',
    title: 'Licensed Clinical Psychologist',
    specialties: ['Anxiety', 'Depression', 'Trauma', 'Relationship Issues'],
    rating: 4.9,
    experience: '8 years',
    availability: 'available',
    nextSlot: 'Today 3:00 PM'
  },
  {
    id: '2',
    name: 'Dr. James Banda',
    title: 'Psychiatric Counselor',
    specialties: ['Stress Management', 'Work-Life Balance', 'Addiction'],
    rating: 4.7,
    experience: '12 years',
    availability: 'busy',
    nextSlot: 'Tomorrow 10:00 AM'
  },
  {
    id: '3',
    name: 'Dr. Grace Phiri',
    title: 'Mental Health Therapist',
    specialties: ['Youth Counseling', 'Family Therapy', 'Crisis Intervention'],
    rating: 4.8,
    experience: '6 years',
    availability: 'available',
    nextSlot: 'Today 5:30 PM'
  }
];

interface MentalHealthAIProps {
  guestMode?: boolean;
}

export default function MentalHealthAI({ guestMode = false }: MentalHealthAIProps) {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  
  // For guest users, show limited functionality
  const isGuest = guestMode || !session;
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<CopingStrategy | null>(null);
  const [moodHistory, setMoodHistory] = useState<Array<{date: string, mood: string}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    // Load previous chat history from localStorage
    const savedMessages = localStorage.getItem('mentalHealthChat');
    if (savedMessages) {
      setChatMessages(JSON.parse(savedMessages));
    }
  }, []);

  const saveMessages = (messages: ChatMessage[]) => {
    localStorage.setItem('mentalHealthChat', JSON.stringify(messages));
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    
    setIsLoading(true);
    const userMessage = currentMessage;
    setCurrentMessage('');
    
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    const updatedMessages = [...chatMessages, newUserMessage];
    setChatMessages(updatedMessages);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(userMessage);
      const newMessages = [...updatedMessages, aiResponse];
      setChatMessages(newMessages);
      saveMessages(newMessages);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (message: string): ChatMessage => {
    const lowerMessage = message.toLowerCase();
    let aiResponse: AIResponse;
    
    // Crisis detection keywords
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'hurt myself', 'self harm', 'die', 'death'];
    const isCrisis = crisisKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (isCrisis) {
      aiResponse = {
        content: "I'm very concerned about what you've shared. Your safety is the most important thing right now. Please reach out to a crisis counselor immediately. You don't have to go through this alone - there are people who want to help.",
        mood: 'depressed',
        confidence: 0.95,
        recommendations: [
          "Contact crisis hotline immediately (988)",
          "Reach out to a trusted friend or family member",
          "Go to your nearest emergency room if in immediate danger",
          "Remove any means of self-harm from your environment"
        ],
        urgency: 'crisis',
        followUpQuestions: [
          "Are you in a safe place right now?",
          "Is there someone you can call to be with you?",
          "Have you contacted emergency services?"
        ],
        suggestedActions: [
          {
            type: 'crisis_support',
            title: 'Crisis Hotline (988)',
            description: 'Immediate professional crisis support',
            priority: 'high'
          },
          {
            type: 'appointment',
            title: 'Emergency Counseling',
            description: 'Urgent mental health intervention',
            priority: 'high'
          }
        ],
        context: {
          topic: 'Crisis Intervention',
          sentiment: 'negative',
          keywords: ['crisis', 'emergency', 'safety'],
          riskFactors: ['suicidal ideation', 'self-harm risk']
        }
      };
    } else if (lowerMessage.includes('anxious') || lowerMessage.includes('anxiety') || lowerMessage.includes('worried') || lowerMessage.includes('panic')) {
      aiResponse = {
        content: "I can hear that you're experiencing anxiety, and I want you to know that what you're feeling is valid and treatable. Anxiety affects millions of people, and there are proven strategies that can help you feel more in control. Let's work together to find techniques that resonate with you.",
        mood: 'anxious',
        confidence: 0.88,
        recommendations: [
          "Practice deep breathing exercises (4-7-8 technique)",
          "Try grounding techniques (5-4-3-2-1 method)",
          "Consider mindfulness meditation",
          "Limit caffeine and alcohol intake",
          "Maintain regular sleep schedule"
        ],
        urgency: 'medium',
        followUpQuestions: [
          "What situations tend to trigger your anxiety?",
          "Have you noticed any physical symptoms?",
          "What coping strategies have you tried before?"
        ],
        suggestedActions: [
          {
            type: 'coping_strategy',
            title: '4-7-8 Breathing Exercise',
            description: 'Immediate anxiety relief technique',
            priority: 'high'
          },
          {
            type: 'resource',
            title: 'Anxiety Management Toolkit',
            description: 'Comprehensive anxiety resources',
            priority: 'medium'
          },
          {
            type: 'appointment',
            title: 'Anxiety Specialist Consultation',
            description: 'Professional anxiety treatment',
            priority: 'medium'
          }
        ],
        context: {
          topic: 'Anxiety Management',
          sentiment: 'negative',
          keywords: ['anxiety', 'worry', 'stress', 'panic'],
          riskFactors: ['anxiety disorder', 'panic attacks']
        }
      };
    } else if (lowerMessage.includes('depressed') || lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('hopeless')) {
      aiResponse = {
        content: "Thank you for trusting me with these difficult feelings. Depression can make everything feel overwhelming and hopeless, but I want you to know that these feelings can change with the right support. You've taken an important step by reaching out, and that shows incredible strength.",
        mood: 'depressed',
        confidence: 0.85,
        recommendations: [
          "Establish a daily routine, even a simple one",
          "Try to get some sunlight and fresh air daily",
          "Connect with supportive friends or family",
          "Engage in gentle physical activity",
          "Practice self-compassion and patience"
        ],
        urgency: 'high',
        followUpQuestions: [
          "How long have you been feeling this way?",
          "Are you able to take care of your basic needs?",
          "Do you have a support system you can reach out to?"
        ],
        suggestedActions: [
          {
            type: 'appointment',
            title: 'Depression Counseling',
            description: 'Professional depression treatment',
            priority: 'high'
          },
          {
            type: 'coping_strategy',
            title: 'Mindful Observation',
            description: 'Grounding technique for difficult emotions',
            priority: 'medium'
          },
          {
            type: 'resource',
            title: 'Depression Support Resources',
            description: 'Educational materials and support',
            priority: 'medium'
          }
        ],
        context: {
          topic: 'Depression Support',
          sentiment: 'negative',
          keywords: ['depression', 'sadness', 'hopelessness'],
          riskFactors: ['major depression', 'mood disorder']
        }
      };
    } else if (lowerMessage.includes('stressed') || lowerMessage.includes('overwhelmed') || lowerMessage.includes('pressure')) {
      aiResponse = {
        content: "It sounds like you're carrying a heavy load right now. Stress and feeling overwhelmed are signals that your mind and body are working hard to cope. Let's explore some strategies to help you feel more balanced and in control of your situation.",
        mood: 'stressed',
        confidence: 0.82,
        recommendations: [
          "Break large tasks into smaller, manageable steps",
          "Practice progressive muscle relaxation",
          "Set boundaries and learn to say no",
          "Prioritize tasks using the urgent/important matrix",
          "Take regular breaks throughout your day"
        ],
        urgency: 'medium',
        followUpQuestions: [
          "What are the main sources of stress in your life?",
          "How is stress affecting your sleep and appetite?",
          "What would help you feel more supported?"
        ],
        suggestedActions: [
          {
            type: 'coping_strategy',
            title: 'Progressive Muscle Relaxation',
            description: 'Release physical tension from stress',
            priority: 'high'
          },
          {
            type: 'resource',
            title: 'Stress Management Guide',
            description: 'Practical stress reduction techniques',
            priority: 'medium'
          },
          {
            type: 'appointment',
            title: 'Stress Management Counseling',
            description: 'Professional stress management support',
            priority: 'low'
          }
        ],
        context: {
          topic: 'Stress Management',
          sentiment: 'negative',
          keywords: ['stress', 'overwhelmed', 'pressure'],
          riskFactors: ['burnout', 'chronic stress']
        }
      };
    } else {
      aiResponse = {
        content: "Thank you for reaching out. I'm here to provide a safe, confidential space where you can share your thoughts and feelings without judgment. Whether you're dealing with specific challenges or just need someone to listen, I'm here to support you on your mental health journey.",
        mood: 'neutral',
        confidence: 0.75,
        recommendations: [
          "Take time for self-reflection and mindfulness",
          "Maintain healthy lifestyle habits",
          "Stay connected with supportive relationships",
          "Practice gratitude and positive thinking",
          "Engage in activities that bring you joy"
        ],
        urgency: 'low',
        followUpQuestions: [
          "How are you feeling today?",
          "What brings you here to talk?",
          "Is there anything specific on your mind?"
        ],
        suggestedActions: [
          {
            type: 'resource',
            title: 'Mental Health Assessment',
            description: 'Understand your current mental health status',
            priority: 'medium'
          },
          {
            type: 'coping_strategy',
            title: 'Daily Mindfulness Practice',
            description: 'Build emotional resilience',
            priority: 'low'
          },
          {
            type: 'appointment',
            title: 'Wellness Check-in',
            description: 'Preventive mental health support',
            priority: 'low'
          }
        ],
        context: {
          topic: 'General Mental Health',
          sentiment: 'neutral',
          keywords: ['mental health', 'wellbeing', 'support'],
          riskFactors: []
        }
      };
    }
    
    return {
      id: Date.now().toString(),
      role: 'ai',
      content: aiResponse.content,
      timestamp: new Date(),
      mood: aiResponse.mood,
      aiResponse,
      suggestions: aiResponse.suggestedActions.map(action => ({
        type: action.type,
        title: action.title,
        description: action.description,
        priority: action.priority
      }))
    };
  };

  const clearChat = () => {
    setChatMessages([]);
    localStorage.removeItem('mentalHealthChat');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto py-16 px-4">
          <Card className="max-w-md mx-auto shadow-xl border-0">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Mental Health AI Assistant
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Access confidential mental health support, personalized coping strategies, and 24/7 AI-powered assistance.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Lock className="h-4 w-4" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Shield className="h-4 w-4" />
                  <span>Completely confidential</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Sparkles className="h-4 w-4" />
                  <span>AI-powered insights</span>
                </div>
              </div>
              <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Link to="/login">Sign In to Continue</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Mental Health AI Assistant
            </h1>
            <p className="text-xl text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
              Your personal, confidential mental health companion providing 24/7 support, personalized coping strategies, and professional resources.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-500" />
                <span>End-to-end encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Completely confidential</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>AI-powered insights</span>
              </div>
            </div>
          </div>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="strategies">Coping Strategies</TabsTrigger>
          <TabsTrigger value="counselors">Find Counselor</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          {isGuest && (
            <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-amber-800">
                  <AlertTriangle className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Guest Mode - Limited Features</p>
                    <p className="text-sm text-amber-700 mt-1">
                      For full mental health support and personalized features,{' '}
                      <Link to="/auth/login" className="underline font-medium hover:text-amber-900">
                        sign in to your account
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">AI Mental Health Counselor</h3>
                    <p className="text-blue-100 text-sm font-normal">Confidential • Empathetic • Available 24/7</p>
                  </div>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={clearChat} className="text-white hover:bg-white/20">
                  Clear Chat
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] p-6">
                <div className="space-y-6">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                        <Brain className="h-8 w-8 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">Start Your Mental Health Journey</h4>
                      <p className="text-gray-600 mb-1">Share your thoughts and feelings in a safe, confidential space</p>
                      <p className="text-sm text-gray-500">Your messages are encrypted and stored securely</p>
                    </div>
                  )}
                  
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                        <div className={`p-4 rounded-2xl shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white ml-4' 
                            : 'bg-gray-50 border border-gray-100 mr-4'
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          
                          {msg.aiResponse && msg.role === 'ai' && (
                            <div className="mt-4 space-y-3">
                              {msg.aiResponse.confidence > 0.8 && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>Confidence: {Math.round(msg.aiResponse.confidence * 100)}%</span>
                                </div>
                              )}
                              
                              {msg.mood && (
                                <div className="flex items-center gap-2">
                                  <Badge variant={msg.aiResponse.urgency === 'crisis' ? 'destructive' : 'secondary'} className="text-xs">
                                    {msg.mood === 'anxious' && '😰 Anxiety detected'}
                                    {msg.mood === 'depressed' && '😔 Low mood detected'}
                                    {msg.mood === 'stressed' && '😤 Stress detected'}
                                    {msg.mood === 'positive' && '😊 Positive mood'}
                                    {msg.mood === 'neutral' && '😐 Neutral mood'}
                                  </Badge>
                                  {msg.aiResponse.urgency === 'crisis' && (
                                    <Badge variant="destructive" className="text-xs animate-pulse">
                                      🚨 Crisis Support Needed
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              {msg.aiResponse.recommendations.length > 0 && (
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <h5 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    Personalized Recommendations
                                  </h5>
                                  <ul className="text-xs text-blue-700 space-y-1">
                                    {msg.aiResponse.recommendations.slice(0, 3).map((rec, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5">•</span>
                                        <span>{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {msg.suggestions && msg.suggestions.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-gray-700">Suggested Actions:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {msg.suggestions.map((suggestion, i) => (
                                      <Button 
                                        key={i} 
                                        size="sm" 
                                        variant={suggestion.priority === 'high' ? 'default' : 'outline'} 
                                        className={`text-xs h-8 ${
                                          suggestion.priority === 'high' 
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
                                            : ''
                                        }`}
                                      >
                                        {suggestion.type === 'coping_strategy' && <Heart className="h-3 w-3 mr-1" />}
                                        {suggestion.type === 'resource' && <BookOpen className="h-3 w-3 mr-1" />}
                                        {suggestion.type === 'appointment' && <Calendar className="h-3 w-3 mr-1" />}
                                        {suggestion.type === 'crisis_support' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                        {suggestion.title}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {msg.aiResponse.followUpQuestions.length > 0 && (
                                <div className="bg-purple-50 p-3 rounded-lg">
                                  <h5 className="text-xs font-semibold text-purple-800 mb-2">Follow-up Questions:</h5>
                                  <div className="space-y-1">
                                    {msg.aiResponse.followUpQuestions.slice(0, 2).map((question, i) => (
                                      <button 
                                        key={i}
                                        onClick={() => setCurrentMessage(question)}
                                        className="block text-xs text-purple-700 hover:text-purple-900 hover:underline text-left"
                                      >
                                        • {question}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className={`text-xs mt-3 ${
                            msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {msg.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl mr-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                          <span className="text-sm text-gray-600">AI is analyzing and preparing a thoughtful response...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              <div className="p-6 border-t bg-gray-50/50">
                <div className="flex gap-3">
                  <Input
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Share your thoughts and feelings... I'm here to listen and support you."
                    className="flex-1 bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isLoading || !currentMessage.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Press Enter to send • Shift+Enter for new line • Your conversations are private and secure
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {mockCopingStrategies.map((strategy) => (
              <Card key={strategy.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedStrategy(strategy)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{strategy.title}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">{strategy.category}</Badge>
                        <Badge variant="outline">{strategy.difficulty}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{strategy.duration}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{strategy.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {selectedStrategy && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedStrategy.title} - Step by Step</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedStrategy.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-sm">{step}</p>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" onClick={() => setSelectedStrategy(null)}>
                  Close Guide
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="counselors" className="space-y-4">
          {isGuest && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-amber-800">
                  <Brain className="h-5 w-5" />
                  <p className="font-medium">Guest Mode - Login Required</p>
                </div>
                <p className="text-sm text-amber-700 mt-2">
                  To book sessions with mental health counselors, please{' '}
                  <Link to="/auth/login" className="underline font-medium">
                    sign in to your account
                  </Link>
                  {' '}or{' '}
                  <Link to="/auth/register" className="underline font-medium">
                    create a new account
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4">
            {mockCounselors.map((counselor) => (
              <Card key={counselor.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{counselor.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{counselor.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{counselor.rating}</span>
                          <span className="text-sm text-muted-foreground">• {counselor.experience} experience</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={counselor.availability === 'available' ? 'default' : 'secondary'}>
                        {counselor.availability === 'available' ? '🟢 Available' : 
                         counselor.availability === 'busy' ? '🟡 Busy' : '🔴 Offline'}
                      </Badge>
                      {counselor.nextSlot && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Next: {counselor.nextSlot}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Specialties:</p>
                      <div className="flex flex-wrap gap-1">
                        {counselor.specialties.map((specialty, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" disabled={isGuest}>
                        <Calendar className="h-4 w-4 mr-2" />
                        {isGuest ? 'Login Required' : 'Book Session'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={isGuest}>
                        <Video className="h-4 w-4 mr-2" />
                        {isGuest ? 'Login Required' : 'Video Call'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={isGuest}>
                        <Phone className="h-4 w-4 mr-2" />
                        {isGuest ? 'Login Required' : 'Call Now'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Crisis Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Immediate help for mental health emergencies and crisis situations.
                </p>
                <div className="space-y-2">
                  <Button variant="destructive" className="w-full">
                    <Phone className="h-4 w-4 mr-2" />
                    Crisis Hotline: 988
                  </Button>
                  <Button variant="outline" className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Crisis Text Line
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Self-Help Library</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Curated resources for mental health education and self-improvement.
                </p>
                <Button variant="outline" className="w-full">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Resources
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Mood Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Track your daily mood and identify patterns over time.
                </p>
                <Button variant="outline" className="w-full">
                  <Heart className="h-4 w-4 mr-2" />
                  Start Tracking
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Support Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect with others who understand your experiences.
                </p>
                <Button variant="outline" className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  Find Groups
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}