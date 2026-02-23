import React, { useState, useEffect } from 'react';
import { XCircle, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LicenseAccessDeniedProps {
  message?: string;
  onRetry?: () => void;
}

const LicenseAccessDenied: React.FC<LicenseAccessDeniedProps> = ({ 
  message = "Your school license has expired or is invalid. Please contact the system administrator.",
  onRetry 
}) => {
  const [whatsappNumber, setWhatsappNumber] = useState("260570260374");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.whatsapp_number) {
            setWhatsappNumber(data.whatsapp_number);
          }
        }
      } catch (error) {
        console.error('Failed to fetch whatsapp number', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleWhatsAppClick = () => {
    const text = encodeURIComponent("Hello, I need assistance with my school license renewal.");
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center p-8 bg-slate-50 dark:bg-slate-900">
      <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center">
        <XCircle className="h-12 w-12 text-red-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-muted-foreground max-w-[500px]">
          {message}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
        <Button 
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={handleWhatsAppClick}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
          Contact Support on WhatsApp
        </Button>
        {onRetry && (
          <Button onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default LicenseAccessDenied;
