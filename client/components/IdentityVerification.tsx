import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  QrCode, 
  Search, 
  Shield, 
  Globe, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Camera,
  Fingerprint
} from "lucide-react";
import QRScanner from "./QRScanner";
import IdentityCard from "./IdentityCard";
import { searchResident } from "@/lib/api";
import type { Resident } from "@shared/api";
import { cn } from "@/lib/utils";

interface VerificationResult {
  success: boolean;
  resident?: Resident;
  message: string;
  verificationLevel: 'basic' | 'enhanced' | 'biometric';
  timestamp: Date;
}

interface Props {
  onVerificationComplete?: (result: VerificationResult) => void;
  allowedVerificationTypes?: ('qr' | 'manual' | 'biometric')[];
  requiredVerificationLevel?: 'basic' | 'enhanced' | 'biometric';
  context?: 'military' | 'immigration' | 'general';
}

export default function IdentityVerification({
  onVerificationComplete,
  allowedVerificationTypes = ['qr', 'manual'],
  requiredVerificationLevel = 'basic',
  context = 'general'
}: Props) {
  const [activeTab, setActiveTab] = useState<string>(allowedVerificationTypes[0] || 'qr');
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verifiedResident, setVerifiedResident] = useState<Resident | null>(null);

  const handleQRScan = useCallback(async (qrData: string) => {
    setIsLoading(true);
    try {
      // Parse QR data - could be JSON or simple ID
      let residentId: string;
      try {
        const parsed = JSON.parse(qrData);
        residentId = parsed.nationalId || parsed.id || parsed.residentId;
      } catch {
        residentId = qrData;
      }

      const resident = await searchResident({ nationalId: residentId });
      
      if (resident) {
        const result: VerificationResult = {
          success: true,
          resident,
          message: 'Identity verified successfully via QR code',
          verificationLevel: 'enhanced',
          timestamp: new Date()
        };
        
        setVerificationResult(result);
        setVerifiedResident(resident);
        onVerificationComplete?.(result);
      } else {
        const result: VerificationResult = {
          success: false,
          message: 'No resident found with the provided QR code',
          verificationLevel: 'basic',
          timestamp: new Date()
        };
        
        setVerificationResult(result);
        onVerificationComplete?.(result);
      }
    } catch (error) {
      const result: VerificationResult = {
        success: false,
        message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        verificationLevel: 'basic',
        timestamp: new Date()
      };
      
      setVerificationResult(result);
      onVerificationComplete?.(result);
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  }, [onVerificationComplete]);

  const handleManualSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const resident = await searchResident({ 
        nationalId: searchQuery,
        passportNumber: searchQuery 
      });
      
      if (resident) {
        const result: VerificationResult = {
          success: true,
          resident,
          message: 'Identity verified successfully via manual search',
          verificationLevel: 'basic',
          timestamp: new Date()
        };
        
        setVerificationResult(result);
        setVerifiedResident(resident);
        onVerificationComplete?.(result);
      } else {
        const result: VerificationResult = {
          success: false,
          message: 'No resident found with the provided information',
          verificationLevel: 'basic',
          timestamp: new Date()
        };
        
        setVerificationResult(result);
        onVerificationComplete?.(result);
      }
    } catch (error) {
      const result: VerificationResult = {
        success: false,
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        verificationLevel: 'basic',
        timestamp: new Date()
      };
      
      setVerificationResult(result);
      onVerificationComplete?.(result);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, onVerificationComplete]);

  const getContextIcon = () => {
    switch (context) {
      case 'military':
        return <Shield className="h-5 w-5" />;
      case 'immigration':
        return <Globe className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getContextTitle = () => {
    switch (context) {
      case 'military':
        return 'Military Identity Verification';
      case 'immigration':
        return 'Immigration Identity Verification';
      default:
        return 'Identity Verification';
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setVerifiedResident(null);
    setSearchQuery('');
    setIsScanning(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getContextIcon()}
            {getContextTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              {allowedVerificationTypes.includes('qr') && (
                <TabsTrigger value="qr" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR Scan
                </TabsTrigger>
              )}
              {allowedVerificationTypes.includes('manual') && (
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Manual
                </TabsTrigger>
              )}
              {allowedVerificationTypes.includes('biometric') && (
                <TabsTrigger value="biometric" className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4" />
                  Biometric
                </TabsTrigger>
              )}
            </TabsList>

            {allowedVerificationTypes.includes('qr') && (
              <TabsContent value="qr" className="space-y-4">
                <div className="text-center space-y-4">
                  {!isScanning ? (
                    <Button
                      onClick={() => setIsScanning(true)}
                      className="w-full"
                      disabled={isLoading}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Start QR Scanner
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <QRScanner
                        onScan={handleQRScan}
                        onError={(error) => {
                          console.error('QR Scan Error:', error);
                          setIsScanning(false);
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => setIsScanning(false)}
                        className="w-full"
                      >
                        Stop Scanner
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {allowedVerificationTypes.includes('manual') && (
              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">National ID or Passport Number</label>
                    <Input
                      placeholder="Enter National ID or Passport Number"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                    />
                  </div>
                  <Button
                    onClick={handleManualSearch}
                    className="w-full"
                    disabled={isLoading || !searchQuery.trim()}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isLoading ? 'Searching...' : 'Search Identity'}
                  </Button>
                </div>
              </TabsContent>
            )}

            {allowedVerificationTypes.includes('biometric') && (
              <TabsContent value="biometric" className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Fingerprint className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Biometric verification not yet implemented</p>
                    <p className="text-sm text-gray-400">This feature will be available in a future update</p>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Verification Result */}
      {verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {verificationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Verification Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className={cn(
              verificationResult.success 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            )}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {verificationResult.message}
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2">
              <Badge variant={verificationResult.success ? 'default' : 'destructive'}>
                {verificationResult.success ? 'Verified' : 'Failed'}
              </Badge>
              <Badge variant="outline">
                {verificationResult.verificationLevel.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-500">
                {verificationResult.timestamp.toLocaleString()}
              </span>
            </div>

            <div className="flex gap-2">
              <Button onClick={resetVerification} variant="outline" className="flex-1">
                New Verification
              </Button>
              {verificationResult.success && verifiedResident && (
                <Button 
                  onClick={() => {
                    // Could trigger additional actions like case creation
                    console.log('Additional actions for verified resident:', verifiedResident);
                  }}
                  className="flex-1"
                >
                  Proceed
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Display Identity Card if verification successful */}
      {verifiedResident && (
        <div className="flex justify-center">
          <IdentityCard 
            resident={verifiedResident}
            cardType={context === 'military' ? 'military' : context === 'immigration' ? 'immigration' : 'national'}
          />
        </div>
      )}
    </div>
  );
}