import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MessageCircle, Calendar, ShoppingCart, Shield, AlertCircle, CheckCircle2, Send, Sparkles, Brain, Zap, User, Bot } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';

interface AIResponse {
  message: string;
  recommendations?: string[];
  urgency?: 'low' | 'medium' | 'high';
  confidence?: number;
  followUpQuestions?: string[];
  suggestedActions?: {
    type: 'medication' | 'appointment' | 'education' | 'resource';
    title: string;
    description: string;
    priority?: 'high' | 'medium' | 'low';
  }[];
  context?: {
    topic: string;
    sentiment: 'positive' | 'neutral' | 'concerned' | 'urgent';
    keywords: string[];
  };
}

interface Medication {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'contraception' | 'sti_prevention' | 'emergency';
  requiresPrescription: boolean;
}

const mockMedications: Medication[] = [
  {
    id: '1',
    name: 'Birth Control Pills (Combined)',
    description: 'Monthly supply of combined oral contraceptive pills',
    price: 45,
    category: 'contraception',
    requiresPrescription: true
  },
  {
    id: '2',
    name: 'Emergency Contraception',
    description: 'Plan B or similar emergency contraceptive',
    price: 25,
    category: 'emergency',
    requiresPrescription: false
  },
  {
    id: '3',
    name: 'PrEP (Pre-Exposure Prophylaxis)',
    description: 'HIV prevention medication for high-risk individuals',
    price: 120,
    category: 'sti_prevention',
    requiresPrescription: true
  },
  {
    id: '4',
    name: 'Condoms (Pack of 12)',
    description: 'Latex condoms for STI and pregnancy prevention',
    price: 8,
    category: 'sti_prevention',
    requiresPrescription: false
  }
];

interface SexualHealthAIProps {
  guestMode?: boolean;
}

export default function SexualHealthAI({ guestMode = false }: SexualHealthAIProps) {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', content: string, response?: AIResponse}>>([]);
  
  // For guest users, show limited functionality
  const isGuest = guestMode || !session;
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cart, setCart] = useState<string[]>([]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    
    setIsLoading(true);
    const userMessage = currentMessage;
    setCurrentMessage('');
    
    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: AIResponse = generateAIResponse(userMessage);
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: aiResponse.message,
        response: aiResponse
      }]);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (message: string): AIResponse => {
    const lowerMessage = message.toLowerCase();
    const keywords = lowerMessage.split(' ').filter(word => word.length > 2);
    
    // Enhanced contraception responses
    if (lowerMessage.includes('contraception') || lowerMessage.includes('birth control') || lowerMessage.includes('pregnancy prevention')) {
      return {
        message: "I understand you're looking for information about contraception. There are many effective options available, each with unique benefits. Let me help you understand the most suitable choices based on your lifestyle and health needs.",
        recommendations: [
          "Combined oral contraceptive pills: 91% effective with typical use, 99% with perfect use",
          "IUDs (Copper/Hormonal): Over 99% effective, lasting 3-12 years depending on type",
          "Contraceptive implants: 99% effective for up to 3 years",
          "Condoms: 85% effective against pregnancy, also protect against STIs"
        ],
        confidence: 95,
        urgency: 'low',
        followUpQuestions: [
          "Are you looking for hormonal or non-hormonal options?",
          "Do you have any medical conditions I should consider?",
          "Would you prefer long-term or short-term contraception?"
        ],
        suggestedActions: [
          {
            type: 'medication',
            title: 'Browse Contraceptive Options',
            description: 'View available birth control methods and pricing',
            priority: 'medium'
          },
          {
            type: 'appointment',
            title: 'Contraceptive Consultation',
            description: 'Book appointment with reproductive health specialist',
            priority: 'high'
          },
          {
            type: 'education',
            title: 'Contraception Guide',
            description: 'Learn about effectiveness rates and side effects',
            priority: 'low'
          }
        ],
        context: {
          topic: 'contraception',
          sentiment: 'neutral',
          keywords: ['contraception', 'birth control', 'pregnancy prevention']
        }
      };
    }
    
    // Enhanced STI/STD responses
    if (lowerMessage.includes('sti') || lowerMessage.includes('std') || lowerMessage.includes('sexually transmitted')) {
      const isUrgent = lowerMessage.includes('symptoms') || lowerMessage.includes('pain') || lowerMessage.includes('discharge');
      return {
        message: isUrgent ? 
          "I understand you may be experiencing symptoms. It\'s important to get tested promptly for accurate diagnosis and treatment. Many STIs are easily treatable when caught early." :
          "STI prevention and regular testing are essential parts of sexual health. I can provide information about testing schedules, prevention methods, and treatment options.",
        recommendations: [
          "Get comprehensive STI testing every 3-6 months if sexually active",
          "Use barrier protection (condoms) consistently and correctly",
          "Consider PrEP if at high risk for HIV exposure",
          "Communicate openly with partners about sexual health status"
        ],
        confidence: 90,
        urgency: isUrgent ? 'high' : 'medium',
        followUpQuestions: [
          "When was your last STI screening?",
          "Are you experiencing any symptoms?",
          "Would you like information about specific STIs?"
        ],
        suggestedActions: [
          {
            type: 'appointment',
            title: 'STI Testing & Screening',
            description: 'Schedule comprehensive STI panel testing',
            priority: isUrgent ? 'high' : 'medium'
          },
          {
            type: 'medication',
            title: 'Prevention Methods',
            description: 'Explore PrEP and barrier protection options',
            priority: 'medium'
          },
          {
            type: 'resource',
            title: 'STI Information Hub',
            description: 'Access detailed information about common STIs',
            priority: 'low'
          }
        ],
        context: {
          topic: 'sti_prevention',
          sentiment: isUrgent ? 'urgent' : 'concerned',
          keywords: ['sti', 'std', 'testing', 'prevention']
        }
      };
    }
    
    // Enhanced emergency contraception responses
    if (lowerMessage.includes('emergency') || lowerMessage.includes('plan b') || lowerMessage.includes('morning after')) {
      return {
        message: "Emergency contraception is most effective when taken as soon as possible after unprotected intercourse. There are several options available, and I can help you understand which might be best for your situation.",
        recommendations: [
          "Plan B (levonorgestrel): Most effective within 72 hours, available over-the-counter",
          "ella (ulipristal): Effective up to 120 hours, requires prescription",
          "Copper IUD: Most effective emergency contraception, can be inserted up to 5 days after"
        ],
        confidence: 98,
        urgency: 'high',
        followUpQuestions: [
          "How long ago did the unprotected intercourse occur?",
          "Have you used emergency contraception before?",
          "Are you interested in ongoing contraception options?"
        ],
        suggestedActions: [
          {
            type: 'medication',
            title: 'Emergency Contraception',
            description: 'Order Plan B or similar emergency contraceptive',
            priority: 'high'
          },
          {
            type: 'appointment',
            title: 'Urgent Consultation',
            description: 'Speak with healthcare provider about options',
            priority: 'high'
          }
        ],
        context: {
          topic: 'emergency_contraception',
          sentiment: 'urgent',
          keywords: ['emergency', 'plan b', 'morning after']
        }
      };
    }
    
    // Enhanced general sexual health responses
    if (lowerMessage.includes('sexual health') || lowerMessage.includes('safe sex') || keywords.length === 0) {
      return {
        message: "Welcome to your confidential sexual health assistant! I\'m here to provide evidence-based information about contraception, STI prevention, safe practices, and reproductive health. Your privacy and comfort are my top priorities.",
        recommendations: [
          "Regular STI testing is recommended for all sexually active individuals",
          "Consistent use of barrier protection reduces STI transmission risk",
          "Open communication with partners about sexual health builds trust",
          "Annual reproductive health check-ups help maintain overall wellness"
        ],
        confidence: 85,
        urgency: 'low',
        followUpQuestions: [
          "What specific aspect of sexual health would you like to discuss?",
          "Are you looking for information about contraception or STI prevention?",
          "Do you have any immediate concerns or questions?"
        ],
        suggestedActions: [
          {
            type: 'education',
            title: 'Sexual Health Basics',
            description: 'Learn about comprehensive sexual health practices',
            priority: 'medium'
          },
          {
            type: 'appointment',
            title: 'Health Screening',
            description: 'Schedule routine sexual health check-up',
            priority: 'low'
          }
        ],
        context: {
          topic: 'general_sexual_health',
          sentiment: 'positive',
          keywords: ['sexual health', 'safe sex', 'wellness']
        }
      };
    }
    
    // Fallback response with contextual understanding
    return {
      message: "I understand you have questions about sexual health. I\'m here to provide confidential, non-judgmental support and information. Could you help me understand what specific topic you\'d like to explore?",
      confidence: 70,
      urgency: 'low',
      followUpQuestions: [
        "Are you looking for information about contraception?",
        "Do you have questions about STI prevention or testing?",
        "Would you like to discuss safe sexual practices?"
      ],
      context: {
        topic: 'general_inquiry',
        sentiment: 'neutral',
        keywords: keywords
      }
    };
  };

  const addToCart = (medicationId: string) => {
    setCart(prev => [...prev, medicationId]);
  };

  const removeFromCart = (medicationId: string) => {
    setCart(prev => prev.filter(id => id !== medicationId));
  };

  if (!session) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sexual Health AI Assistant</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to access confidential sexual health support and resources.
            </p>
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Gradient Background */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)] animate-gradient-slow" />
        <div className="container mx-auto relative py-12 px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-4 py-2 text-sm text-muted-foreground shadow-sm mb-6">
              <Heart className="h-4 w-4 text-primary animate-pulse" />
              <span>Confidential AI Sexual Health Assistant</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4">
              Your Private Sexual Health Companion
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
              Get confidential, evidence-based guidance on contraception, STI prevention, and sexual wellness. 
              Your privacy and comfort are our top priorities.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600">End-to-end encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600">Completely confidential</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-primary">AI-powered insights</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto py-8 px-4">

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="appointments">Book Appointment</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          {isGuest && (
            <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Guest Mode Active</span>
                </div>
                <p className="text-amber-700 mb-4">
                  You're using the AI assistant in guest mode. Sign in or register for personalized recommendations and to save your conversation history.
                </p>
                <div className="flex gap-3">
                  <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <Link to="/register">Register</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">AI Sexual Health Counselor</h3>
                  <p className="text-sm text-muted-foreground font-normal">Confidential • Evidence-based • Available 24/7</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] p-6">
                <div className="space-y-6">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                        <Heart className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Welcome to Your Sexual Health Assistant</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        I\'m here to provide confidential, evidence-based information about sexual health. 
                        Feel free to ask about contraception, STI prevention, or any other concerns.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setCurrentMessage("Tell me about contraception options")}
                          className="text-left justify-start"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Contraception options
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setCurrentMessage("How often should I get STI testing?")}
                          className="text-left justify-start"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          STI testing schedule
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {chatMessages.map((msg, index) => (
                    <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'ai' && (
                        <div className="p-2 rounded-full bg-primary/10 h-fit">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-2xl p-4 ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground ml-auto' 
                          : 'bg-muted/50 border'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        
                        {msg.response && (
                          <div className="mt-4 space-y-4">
                            {msg.response.confidence && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Zap className="h-3 w-3" />
                                <span>Confidence: {msg.response.confidence}%</span>
                              </div>
                            )}
                            
                            {msg.response.recommendations && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  Key Recommendations
                                </p>
                                <ul className="space-y-2 text-sm">
                                  {msg.response.recommendations.map((rec, i) => (
                                    <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                                      <span className="text-emerald-800">{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {msg.response.followUpQuestions && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium flex items-center gap-2">
                                  <MessageCircle className="h-4 w-4 text-blue-500" />
                                  Follow-up Questions
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {msg.response.followUpQuestions.map((question, i) => (
                                    <Button
                                      key={i}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentMessage(question)}
                                      className="text-xs h-auto py-2 px-3 rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                                    >
                                      {question}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {msg.response.suggestedActions && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  Suggested Actions
                                </p>
                                <div className="grid gap-2">
                                  {msg.response.suggestedActions.map((action, i) => (
                                    <div key={i} className={`p-3 rounded-lg border ${
                                      action.priority === 'high' ? 'border-red-200 bg-red-50' :
                                      action.priority === 'medium' ? 'border-amber-200 bg-amber-50' :
                                      'border-gray-200 bg-gray-50'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium text-sm">{action.title}</p>
                                          <p className="text-xs text-muted-foreground">{action.description}</p>
                                        </div>
                                        {action.priority === 'high' && (
                                          <Badge variant="destructive" className="text-xs">Urgent</Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="p-2 rounded-full bg-primary/10 h-fit">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-4 justify-start">
                      <div className="p-2 rounded-full bg-primary/10 h-fit">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div className="bg-muted/50 border rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                          <span className="text-sm text-muted-foreground">AI is analyzing your question...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="border-t p-6 bg-muted/20">
                <div className="flex gap-3">
                  <Input
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Ask about sexual health, contraception, STI prevention..."
                    disabled={isLoading}
                    className="flex-1 border-0 bg-background shadow-sm"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isLoading || !currentMessage.trim()}
                    size="lg"
                    className="px-6"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  This AI provides general information only. For medical emergencies, contact emergency services immediately.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          {isGuest && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-medium">Guest Mode - Limited Access</p>
                </div>
                <p className="text-sm text-amber-700 mt-2">
                  To order medications, please{' '}
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
          <div className="grid gap-4 md:grid-cols-2">
            {mockMedications.map((med) => (
              <Card key={med.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{med.name}</CardTitle>
                      <Badge variant={med.requiresPrescription ? 'destructive' : 'secondary'}>
                        {med.requiresPrescription ? 'Prescription Required' : 'Over Counter'}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">K{med.price}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{med.description}</p>
                  <div className="flex gap-2">
                    {cart.includes(med.id) ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeFromCart(med.id)}
                        className="flex-1"
                        disabled={isGuest}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Added to Cart
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => addToCart(med.id)}
                        className="flex-1"
                        disabled={isGuest}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {isGuest ? 'Login Required' : 'Add to Cart'}
                      </Button>
                    )}
                    {med.requiresPrescription && (
                      <Button size="sm" variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Consult Doctor
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cart Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cart.map(id => {
                    const med = mockMedications.find(m => m.id === id);
                    return med ? (
                      <div key={id} className="flex justify-between items-center">
                        <span className="text-sm">{med.name}</span>
                        <span className="font-medium">K{med.price}</span>
                      </div>
                    ) : null;
                  })}
                  <Separator />
                  <div className="flex justify-between items-center font-bold">
                    <span>Total</span>
                    <span>K{cart.reduce((sum, id) => {
                      const med = mockMedications.find(m => m.id === id);
                      return sum + (med?.price || 0);
                    }, 0)}</span>
                  </div>
                  <Button className="w-full mt-4">
                    Proceed to Checkout
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>Book Sexual Health Consultation</CardTitle>
            </CardHeader>
            <CardContent>
              {isGuest && (
                <Card className="border-amber-200 bg-amber-50 mb-4">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertCircle className="h-5 w-5" />
                      <p className="font-medium">Guest Mode - Login Required</p>
                    </div>
                    <p className="text-sm text-amber-700 mt-2">
                      To book appointments with healthcare professionals, please{' '}
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
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Consultation Type</label>
                    <select className="w-full px-3 py-2 border rounded-md bg-background">
                      <option>General Sexual Health</option>
                      <option>Contraception Counseling</option>
                      <option>STI Testing & Treatment</option>
                      <option>Reproductive Health</option>
                      <option>Emergency Consultation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Preferred Date</label>
                    <input type="date" className="w-full px-3 py-2 border rounded-md bg-background" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Additional Notes (Optional)</label>
                  <textarea 
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md bg-background" 
                    placeholder="Any specific concerns or questions you'd like to discuss..."
                  />
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600">
                    All consultations are completely confidential and HIPAA-compliant.
                  </span>
                </div>
                
                <Button className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contraception Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Comprehensive guide to contraceptive methods, effectiveness rates, and choosing the right option for you.
                </p>
                <Button variant="outline" className="w-full">
                  Read Guide
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>STI Prevention</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Learn about sexually transmitted infections, prevention strategies, and testing recommendations.
                </p>
                <Button variant="outline" className="w-full">
                  Learn More
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Safe Practices</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Evidence-based information about safe sexual practices and risk reduction strategies.
                </p>
                <Button variant="outline" className="w-full">
                  View Resources
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Emergency Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Quick access to emergency contraception, post-exposure prophylaxis, and crisis support.
                </p>
                <Button variant="outline" className="w-full">
                  Access Resources
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