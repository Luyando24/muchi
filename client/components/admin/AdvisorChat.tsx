import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Sparkles, 
  Plus, 
  Trash2, 
  Loader2, 
  TrendingUp, 
  User, 
  Cpu, 
  Bot, 
  ArrowRight,
  TrendingDown,
  LineChart,
  HelpCircle,
  Menu,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  messages: Message[];
  model: string;
}

const MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', icon: Cpu, desc: 'High intelligence & complex analysis' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', icon: Sparkles, desc: 'Fast & responsive reasoning' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', icon: Bot, desc: 'Compact & efficient coding/chat' }
];

const SUGGESTED_PROMPTS = [
  {
    label: "Break-even Analysis",
    text: "Are we covering our monthly ZMW 2,420 fixed costs? What is our break-even school count based on current pricing?",
    icon: TrendingUp
  },
  {
    label: "Tuckshop Upsell Pitch",
    text: "Generate a draft email to pitch our Tuckshop Management module to our highly active schools.",
    icon: MessageSquare
  },
  {
    label: "Onboarding bottlenecks",
    text: "Audit our registered schools capacity and onboarding setup progress. Which schools are stuck?",
    icon: LineChart
  },
  {
    label: "Churn Risks Check",
    text: "Identify schools with low logins in the last 7 days. How do we protect this subscription revenue?",
    icon: HelpCircle
  }
];

export default function AdvisorChat({ sharedData, isLoading = false, fullScreen = false }: { sharedData?: any; isLoading?: boolean; fullScreen?: boolean }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.3-70b-versatile');
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('System Admin');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Load chats from LocalStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('muchi_advisor_chats');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
        } else {
          createInitialSession();
        }
      } catch (err) {
        createInitialSession();
      }
    } else {
      createInitialSession();
    }

    // Get current user profile
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setAdminEmail(user.email);
      }
    };
    fetchUser();
  }, []);

  // Save chats to LocalStorage
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    localStorage.setItem('muchi_advisor_chats', JSON.stringify(updated));
  };

  const createInitialSession = () => {
    const newSession: ChatSession = {
      id: 'initial_session',
      title: 'New Advisory Session',
      date: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: [],
      model: 'llama-3.3-70b-versatile'
    };
    saveSessions([newSession]);
    setActiveSessionId(newSession.id);
  };

  const handleNewChat = () => {
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Advisory Session',
      date: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: [],
      model: selectedModel
    };
    saveSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
    toast({
      title: "New Chat Started",
      description: "Ask the Business Advisor for business strategy."
    });
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    if (updated.length === 0) {
      const initial: ChatSession = {
        id: 'initial_session',
        title: 'New Advisory Session',
        date: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        messages: [],
        model: selectedModel
      };
      saveSessions([initial]);
      setActiveSessionId(initial.id);
    } else {
      saveSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id);
      }
    }
    toast({
      title: "Chat Session Deleted",
      variant: "default"
    });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || loading) return;

    if (!textToSend) setInput('');

    // 1. Create a user message
    const userMsg: Message = { role: 'user', content: messageText };
    const updatedMessages = [...(activeSession?.messages || []), userMsg];

    // Auto update chat title if it is the first user message
    let updatedTitle = activeSession.title;
    if (activeSession.messages.length === 0) {
      updatedTitle = messageText.length > 28 ? messageText.substring(0, 28) + '...' : messageText;
    }

    const updatedSession: ChatSession = {
      ...activeSession,
      title: updatedTitle,
      messages: updatedMessages,
      model: selectedModel
    };

    const updatedSessionsList = sessions.map(s => s.id === activeSession.id ? updatedSession : s);
    saveSessions(updatedSessionsList);

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No authenticated session found.");

      // Assemble school data metrics from system admin
      const schoolsList = (sharedData?.schoolsWithStats || []).map((s: any) => ({
        name: s.name,
        plan: s.plan,
        students: s.student_count || 0,
        onboarding_status: s.onboarding_status || 'Pending',
        profile_completion: s.profile_completion || 0,
        classes_count: s.classes_count || 0,
        subjects_count: s.subjects_count || 0,
        active7d: s.sign_ins_7d || 0,
        active30d: s.sign_ins_30d || 0
      }));

      // Fixed financial summary structure
      const payloadContext = {
        summary: sharedData?.summary || {
          totalRevenue: 0,
          mrr: 0,
          activeSubscriptions: 0,
          arpu: 500,
          totalSchools: 0
        },
        funnel: {
          'New': 0,
          'Contacted': 0,
          'Demo Scheduled': 0,
          'Negotiation': 0,
          'Closed Won': 0,
          'Closed Lost': 0
        },
        marketingSpend: 0,
        cac: 0,
        ltv: 0,
        ltvToCacRatio: 0,
        schools: schoolsList
      };

      const response = await fetch('/api/admin/finances/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel,
          context: payloadContext
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reach business advisor endpoint');
      }

      const result = await response.json();
      const assistantMsg: Message = { role: 'assistant', content: result.insights };

      const finalSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedMessages, assistantMsg]
      };

      saveSessions(sessions.map(s => s.id === activeSession.id ? finalSession : s));
    } catch (err: any) {
      console.error('AI chat error:', err);
      toast({
        title: "Communication Failure",
        description: err.message || "Failed to stream chat completion response",
        variant: "destructive"
      });
      // Add error indicator message
      const errorMsg: Message = { 
        role: 'assistant', 
        content: `### ❌ Communication Error\n\nI was unable to retrieve a response from the Muchi SaaS AI server. Please verify your internet connection or check if the backend Groq configurations are active.`
      };
      saveSessions(sessions.map(s => s.id === activeSession.id ? {
        ...updatedSession,
        messages: [...updatedMessages, errorMsg]
      } : s));
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedPrompt = (text: string) => {
    handleSendMessage(text);
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderMarkdownText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h4 key={idx} className="text-base font-bold text-slate-100 mt-4 mb-2 flex items-center gap-1.5">{trimmed.replace('###', '').trim()}</h4>;
      }
      if (trimmed.startsWith('##')) {
        return <h3 key={idx} className="text-lg font-extrabold text-slate-100 mt-5 mb-3">{trimmed.replace('##', '').trim()}</h3>;
      }
      if (trimmed.startsWith('#')) {
        return <h2 key={idx} className="text-xl font-black text-slate-100 mt-6 mb-4">{trimmed.replace('#', '').trim()}</h2>;
      }
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        const rawText = trimmed.substring(1).trim();
        const parts = rawText.split('**');
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-slate-300 my-1 leading-relaxed">
            {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-white">{part}</strong> : part)}
          </li>
        );
      }
      if (trimmed.startsWith('---')) {
        return <hr key={idx} className="my-4 border-slate-800" />;
      }
      if (trimmed.startsWith('•')) {
        const rawText = trimmed.substring(1).trim();
        const parts = rawText.split('**');
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-slate-300 my-1 leading-relaxed">
            {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-white">{part}</strong> : part)}
          </li>
        );
      }
      if (trimmed.startsWith('🟢') || trimmed.startsWith('🔴') || trimmed.startsWith('⚠️')) {
        const parts = line.split('**');
        return (
          <p key={idx} className="text-sm text-slate-200 font-medium my-2 flex items-center gap-1.5">
            {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-white">{part}</strong> : part)}
          </p>
        );
      }
      if (trimmed.length === 0) return <div key={idx} className="h-2" />;
      
      const parts = line.split('**');
      return (
        <p key={idx} className="text-sm text-slate-300 my-1.5 leading-relaxed">
          {parts.map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="font-bold text-white">{part}</strong> : part)}
        </p>
      );
    });
  };

  const SelectedModelIcon = MODELS.find(m => m.id === selectedModel)?.icon || Cpu;

  return (
    <div className={`flex bg-[#1c1c1c] overflow-hidden text-slate-100 relative ${fullScreen ? 'h-screen w-screen rounded-none border-none' : 'h-[calc(100vh-140px)] min-h-[500px] rounded-xl border border-[#262626] bg-[#1c1c1c] shadow-2xl'}`}>
      
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      {/* Sidebar Panel (Left) */}
      <div className={`w-80 border-r border-[#262626] bg-[#151515] flex flex-col h-full shrink-0 fixed inset-y-0 left-0 z-50 md:z-0 md:static transform transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        
        {/* Header Options */}
        <div className="p-4 border-b border-[#262626] space-y-3">
          <Button 
            onClick={() => {
              handleNewChat();
              setIsMobileSidebarOpen(false);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 flex items-center justify-center gap-2 rounded-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            New Advisory Chat
          </Button>

          {/* Search filter */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat history..." 
              className="pl-9 h-9 bg-[#1c1c1c] border-[#262626] text-white placeholder-zinc-550 text-xs rounded-lg focus:border-emerald-500 focus:ring-0"
            />
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 px-3 py-2">
            Recent Advisory Sessions
          </div>
          {filteredSessions.length === 0 ? (
            <div className="text-xs text-zinc-500 text-center py-8 italic">
              No conversations found.
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  activeSessionId === session.id 
                    ? 'bg-[#242424] text-white' 
                    : 'text-zinc-400 hover:bg-[#1c1c1c] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className={`h-4 w-4 shrink-0 ${activeSessionId === session.id ? 'text-emerald-400' : 'text-zinc-550'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{session.title}</p>
                    <p className="text-[9px] text-zinc-500 font-semibold mt-0.5">{session.date}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteChat(session.id, e)}
                  className="p-1 rounded hover:bg-[#151515] text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* User Footer info */}
        <div className="p-4 border-t border-[#262626] bg-[#101010] flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs shrink-0 uppercase">
            {adminEmail.substring(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate leading-tight">System Admin</p>
            <p className="text-[9px] text-zinc-500 truncate mt-0.5">{adminEmail}</p>
          </div>
        </div>
      </div>

      {/* Chat Area Panel (Right) */}
      <div className="flex-1 flex flex-col bg-[#1c1c1c] h-full relative">
        
        {/* Chat Header */}
        <div className="h-14 border-b border-[#242424] bg-[#1c1c1c] px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Mobile menu trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden text-zinc-400 hover:text-white mr-1 h-9 w-9 p-0"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Business Advisor</h3>
                <span className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full">ADVISOR</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Equipped with fixed costs and school analytics context</p>
            </div>
          </div>

          {/* Go Back / Arrow Button at top right */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.opener || window.history.length > 1) {
                  window.close();
                } else {
                  window.location.href = '/system-admin';
                }
              }}
              className="text-zinc-400 hover:text-white h-9 w-9 p-0"
              title="Go Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {!activeSession?.messages || activeSession.messages.length === 0 ? (
            
            // Welcome Greeting Screen
            <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-emerald-600 rounded-full blur-2xl opacity-10 animate-pulse"></div>
                <div className="h-16 w-16 bg-emerald-650/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-xl">
                  <Sparkles className="h-8 w-8 animate-spin-slow" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-black text-white leading-tight">MUCHI Business Advisor</h2>
                  <span className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full">ADVISOR</span>
                </div>
                <div className="text-xs text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold animate-pulse py-1">
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Syncing Business Advisor with live school telemetry...</span>
                    </div>
                  ) : (
                    <p>I am preloaded with school statistics, leads onboarding funnels, and your <strong>ZMW 2,420 monthly fixed costs</strong>. Use me to discover capacity up-sell candidates, tuckshop module integrations, and protect churn accounts.</p>
                  )}
                </div>
              </div>

              {/* Suggested Prompts Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left">
                {SUGGESTED_PROMPTS.map((prompt, pidx) => {
                  const PromptIcon = prompt.icon;
                  return (
                    <button
                      key={pidx}
                      disabled={loading || isLoading}
                      onClick={() => handleSuggestedPrompt(prompt.text)}
                      className="p-3 bg-[#242424] border border-[#2d2d2d] hover:border-emerald-500/30 hover:bg-[#282828] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-left transition-all duration-200 group flex items-start gap-3 shadow-md w-full"
                    >
                      <div className="p-2 bg-emerald-600/10 border border-emerald-500/20 text-emerald-450 rounded-lg group-hover:bg-emerald-600/20 group-hover:text-emerald-300 transition-colors shrink-0">
                        <PromptIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white leading-tight">{prompt.label}</p>
                        <p className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors truncate mt-1">{prompt.text}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          ) : (

            // Conversation Stream
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession.messages.map((msg, midx) => (
                <div 
                  key={midx}
                  className="w-full"
                >
                  {msg.role === 'user' ? (
                    // User Message (Align Right in a Bubble, No Identifier)
                    <div className="flex justify-end w-full py-1">
                      <div className="bg-[#242424] border border-[#2d2d2d] text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[80%] md:max-w-[70%] text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    // Assistant Message (Align Left, No Avatar, No Label/Header)
                    <div className="flex justify-start w-full py-1">
                      <div className="flex-1 text-sm leading-relaxed text-zinc-300 space-y-1.5">
                        {renderMarkdownText(msg.content)}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start items-center gap-2 py-2.5 w-full">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                  <span className="text-xs font-semibold text-zinc-400 animate-pulse">Business Advisor is computing strategic solutions...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

          )}
        </div>

        {/* Input Console Area */}
        <div className="p-4 border-t border-[#242424] bg-[#1c1c1c]">
          <div className="max-w-2xl mx-auto relative">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="bg-[#242424] border border-[#2d2d2d] rounded-2xl p-3 shadow-2xl flex flex-col w-full focus-within:border-emerald-550/40 transition-all"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isLoading ? "Syncing live telemetry context..." : "Ask Business Advisor (e.g., 'What is our break-even target?')"}
                disabled={loading || isLoading}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="bg-transparent text-sm text-white placeholder-zinc-550 outline-none w-full border-none focus:ring-0 resize-none py-1.5 px-2 max-h-32 disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-between border-t border-[#2d2d2d] pt-2 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-555 hover:bg-emerald-500/10 p-1.5 rounded-lg cursor-pointer transition-colors">
                    <Plus className="h-4 w-4 text-zinc-400" />
                  </span>
                  
                  {/* Model Selector styled compact like Zamportal */}
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-[#1c1c1c] text-[10px] border border-zinc-800 rounded-lg py-1 px-2 text-zinc-400 font-bold cursor-pointer outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {MODELS.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={loading || isLoading || !input.trim()}
                  className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:bg-[#1e1e1e] disabled:text-zinc-650"
                >
                  <span>Send</span>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
