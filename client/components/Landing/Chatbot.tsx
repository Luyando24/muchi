import { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages([...messages, { text: inputValue, sender: 'user' }]);
      setInputValue('');
      // Here you would typically call a backend to get a response
      setTimeout(() => {
        setMessages(prev => [...prev, { text: 'This is a simulated response.', sender: 'bot' }]);
      }, 1000);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
        <Button 
          onClick={toggleChat} 
          className="rounded-full w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110"
        >
          <MessageSquare className="w-8 h-8 text-white" />
        </Button>
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20"></div>
      </div>

      {/* Enhanced Chat Window */}
      <div className={`fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col transition-all duration-500 ease-in-out border border-gray-200 dark:border-gray-700 ${isOpen ? 'opacity-100 transform scale-100 translate-y-0' : 'opacity-0 transform scale-95 translate-y-4 pointer-events-none'}`}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">ZamPortal Assistant</h3>
              <p className="text-sm text-blue-100">How can I help you today?</p>
            </div>
          </div>
          <Button onClick={toggleChat} variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Welcome to ZamPortal!</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">I'm here to help you navigate government services. You can ask me about:</p>
              <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                <div>• Service applications and requirements</div>
                <div>• Document submissions</div>
                <div>• Application status updates</div>
                <div>• General government service inquiries</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-2 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {msg.sender === 'user' ? 'You' : 'AI'}
                </div>
                <div className={`rounded-2xl px-4 py-3 ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-md' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about government services..."
              className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <Button 
              onClick={handleSendMessage} 
              className="bg-blue-600 hover:bg-blue-700 rounded-xl px-4 py-3 transition-colors duration-200"
              disabled={!inputValue.trim()}
            >
              <Send className="w-5 h-5 text-white" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Powered by ZamPortal AI • Available 24/7
          </p>
        </div>
      </div>
    </>
  );
};

export default Chatbot;