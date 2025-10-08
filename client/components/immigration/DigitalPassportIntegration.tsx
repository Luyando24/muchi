import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Eye, QrCode, Download, Upload, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import { format } from 'date-fns';

interface DigitalPassport {
  id: string;
  passportNumber: string;
  digitalId: string;
  qrCode: string;
  holderName: string;
  nationality: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: 'male' | 'female' | 'other';
  issuedDate: string;
  expiryDate: string;
  issuingAuthority: string;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  biometricData: {
    fingerprint?: string;
    faceRecognition?: string;
    iris?: string;
  };
  travelHistory: {
    id: string;
    country: string;
    entryDate: string;
    exitDate?: string;
    purpose: string;
    port: string;
  }[];
  visaRecords: {
    id: string;
    country: string;
    type: string;
    validFrom: string;
    validUntil: string;
    status: 'valid' | 'expired' | 'used';
  }[];
  securityFeatures: {
    digitalSignature: string;
    encryptionLevel: string;
    lastVerified: string;
  };
  createdAt: string;
  updatedAt: string;
}

const DigitalPassportIntegration: React.FC = () => {
  const [passports, setPassports] = useState<DigitalPassport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPassport, setSelectedPassport] = useState<DigitalPassport | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');

  const [newPassport, setNewPassport] = useState<Partial<DigitalPassport>>({
    holderName: '',
    nationality: '',
    dateOfBirth: '',
    placeOfBirth: '',
    gender: 'male',
    issuedDate: format(new Date(), 'yyyy-MM-dd'),
    expiryDate: format(new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    issuingAuthority: 'Department of Immigration',
    status: 'active',
    travelHistory: [],
    visaRecords: [],
    biometricData: {}
  });

  useEffect(() => {
    loadPassports();
  }, []);

  const loadPassports = async () => {
    try {
      setLoading(true);
      const storedPassports = localStorage.getItem('digitalPassports');
      if (storedPassports) {
        setPassports(JSON.parse(storedPassports));
      } else {
        const mockPassports: DigitalPassport[] = [
          {
            id: 'passport_1',
            passportNumber: 'ZM1234567',
            digitalId: 'DIG-ZM-2024-001',
            qrCode: 'QR_ZM1234567_2024',
            holderName: 'John Mwanza',
            nationality: 'Zambian',
            dateOfBirth: '1990-05-15',
            placeOfBirth: 'Lusaka, Zambia',
            gender: 'male',
            issuedDate: '2024-01-15',
            expiryDate: '2034-01-15',
            issuingAuthority: 'Department of Immigration',
            status: 'active',
            biometricData: {
              fingerprint: 'FP_HASH_123456',
              faceRecognition: 'FACE_HASH_789012'
            },
            travelHistory: [
              {
                id: 'travel_1',
                country: 'South Africa',
                entryDate: '2024-02-10',
                exitDate: '2024-02-20',
                purpose: 'Business',
                port: 'OR Tambo International Airport'
              }
            ],
            visaRecords: [
              {
                id: 'visa_1',
                country: 'South Africa',
                type: 'Business Visa',
                validFrom: '2024-02-01',
                validUntil: '2024-08-01',
                status: 'valid'
              }
            ],
            securityFeatures: {
              digitalSignature: 'SHA256_SIGNATURE_HASH',
              encryptionLevel: 'AES-256',
              lastVerified: '2024-01-15T10:00:00Z'
            },
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z'
          }
        ];
        setPassports(mockPassports);
        localStorage.setItem('digitalPassports', JSON.stringify(mockPassports));
      }
    } catch (error) {
      console.error('Failed to load passports:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePassports = (updatedPassports: DigitalPassport[]) => {
    localStorage.setItem('digitalPassports', JSON.stringify(updatedPassports));
    setPassports(updatedPassports);
  };

  const generatePassportNumber = () => {
    const timestamp = Date.now().toString();
    return `ZM${timestamp.slice(-7)}`;
  };

  const generateDigitalId = () => {
    const timestamp = Date.now().toString();
    return `DIG-ZM-${new Date().getFullYear()}-${timestamp.slice(-3)}`;
  };

  const generateQRCode = (passportNumber: string) => {
    return `QR_${passportNumber}_${new Date().getFullYear()}`;
  };

  const handleCreatePassport = async () => {
    if (!newPassport.holderName || !newPassport.nationality || !newPassport.dateOfBirth) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const passportNumber = generatePassportNumber();
      const digitalId = generateDigitalId();
      const qrCode = generateQRCode(passportNumber);

      const passport: DigitalPassport = {
        id: `passport_${Date.now()}`,
        passportNumber,
        digitalId,
        qrCode,
        ...newPassport,
        securityFeatures: {
          digitalSignature: `SHA256_${Date.now()}`,
          encryptionLevel: 'AES-256',
          lastVerified: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as DigitalPassport;

      const updatedPassports = [...passports, passport];
      savePassports(updatedPassports);
      
      setIsCreateDialogOpen(false);
      resetNewPassport();
    } catch (error) {
      console.error('Failed to create passport:', error);
      alert('Failed to create digital passport. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetNewPassport = () => {
    setNewPassport({
      holderName: '',
      nationality: '',
      dateOfBirth: '',
      placeOfBirth: '',
      gender: 'male',
      issuedDate: format(new Date(), 'yyyy-MM-dd'),
      expiryDate: format(new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      issuingAuthority: 'Department of Immigration',
      status: 'active',
      travelHistory: [],
      visaRecords: [],
      biometricData: {}
    });
  };

  const updatePassportStatus = (passportId: string, newStatus: DigitalPassport['status']) => {
    const updatedPassports = passports.map(passport => {
      if (passport.id === passportId) {
        return {
          ...passport,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return passport;
    });
    savePassports(updatedPassports);
  };

  const verifyPassport = async (qrCode: string) => {
    const passport = passports.find(p => p.qrCode === qrCode);
    if (passport) {
      const updatedPassports = passports.map(p => {
        if (p.id === passport.id) {
          return {
            ...p,
            securityFeatures: {
              ...p.securityFeatures,
              lastVerified: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      savePassports(updatedPassports);
      return passport;
    }
    return null;
  };

  const handleQRScan = async () => {
    if (!scanResult.trim()) {
      alert('Please enter a QR code to scan');
      return;
    }

    const passport = await verifyPassport(scanResult);
    if (passport) {
      setSelectedPassport(passport);
      setIsViewDialogOpen(true);
      setScanResult('');
    } else {
      alert('Invalid QR code or passport not found');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'revoked': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPassports = passports.filter(passport => {
    const matchesSearch = passport.holderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         passport.passportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         passport.digitalId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || passport.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Digital Passport Integration</h1>
          <p className="text-muted-foreground">Manage digital passports and QR verification</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Passport
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Issue New Digital Passport</DialogTitle>
                <DialogDescription>
                  Create a new digital passport with QR code integration.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Passport Holder Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="holderName">Full Name *</Label>
                        <Input
                          id="holderName"
                          value={newPassport.holderName || ''}
                          onChange={(e) => setNewPassport({ ...newPassport, holderName: e.target.value })}
                          placeholder="Enter full name as in birth certificate"
                        />
                      </div>
                      <div>
                        <Label htmlFor="nationality">Nationality *</Label>
                        <Input
                          id="nationality"
                          value={newPassport.nationality || ''}
                          onChange={(e) => setNewPassport({ ...newPassport, nationality: e.target.value })}
                          placeholder="Enter nationality"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={newPassport.dateOfBirth || ''}
                          onChange={(e) => setNewPassport({ ...newPassport, dateOfBirth: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="placeOfBirth">Place of Birth</Label>
                        <Input
                          id="placeOfBirth"
                          value={newPassport.placeOfBirth || ''}
                          onChange={(e) => setNewPassport({ ...newPassport, placeOfBirth: e.target.value })}
                          placeholder="Enter place of birth"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <select
                          id="gender"
                          value={newPassport.gender || 'male'}
                          onChange={(e) => setNewPassport({ ...newPassport, gender: e.target.value as any })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Passport Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="issuedDate">Issue Date *</Label>
                        <Input
                          id="issuedDate"
                          type="date"
                          value={newPassport.issuedDate || ''}
                          onChange={(e) => setNewPassport({ ...newPassport, issuedDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiryDate">Expiry Date *</Label>
                        <Input
                          id="expiryDate"
                          type="date"
                          value={newPassport.expiryDate || ''}
                          onChange={(e) => setNewPassport({ ...newPassport, expiryDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="issuingAuthority">Issuing Authority</Label>
                      <Input
                        id="issuingAuthority"
                        value={newPassport.issuingAuthority || 'Department of Immigration'}
                        onChange={(e) => setNewPassport({ ...newPassport, issuingAuthority: e.target.value })}
                        placeholder="Enter issuing authority"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePassport} disabled={loading}>
                  {loading ? 'Creating...' : 'Issue Passport'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* QR Code Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <QrCode className="mr-2 h-5 w-5" />
            QR Code Verification
          </CardTitle>
          <CardDescription>
            Scan or enter QR code to verify digital passport
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter QR code or scan with device"
              value={scanResult}
              onChange={(e) => setScanResult(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleQRScan} disabled={!scanResult.trim()}>
              <Smartphone className="mr-2 h-4 w-4" />
              Verify
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, passport number, or digital ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-[180px] p-2 border rounded"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Passports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Digital Passports ({filteredPassports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading passports...</div>
          ) : filteredPassports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No passports found matching your criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passport #</TableHead>
                  <TableHead>Digital ID</TableHead>
                  <TableHead>Holder Name</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPassports.map((passport) => (
                  <TableRow key={passport.id}>
                    <TableCell className="font-medium">{passport.passportNumber}</TableCell>
                    <TableCell>{passport.digitalId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{passport.holderName}</p>
                        <p className="text-sm text-muted-foreground">
                          Born: {new Date(passport.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{passport.nationality}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(passport.status)}>
                        {passport.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(passport.expiryDate).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">
                          {new Date(passport.expiryDate) > new Date() ? 'Valid' : 'Expired'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPassport(passport);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(passport.qrCode);
                            alert('QR code copied to clipboard');
                          }}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        {passport.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updatePassportStatus(passport.id, 'suspended')}
                          >
                            <XCircle className="h-4 w-4 text-yellow-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Passport Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Digital Passport Details</DialogTitle>
          </DialogHeader>
          {selectedPassport && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="travel">Travel History</TabsTrigger>
                <TabsTrigger value="visas">Visa Records</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Passport Number</Label>
                    <p className="text-sm text-muted-foreground">{selectedPassport.passportNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Digital ID</Label>
                    <p className="text-sm text-muted-foreground">{selectedPassport.digitalId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">QR Code</Label>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-muted-foreground">{selectedPassport.qrCode}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedPassport.qrCode);
                          alert('QR code copied!');
                        }}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusBadgeColor(selectedPassport.status)}>
                      {selectedPassport.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Holder Name</Label>
                    <p className="text-sm text-muted-foreground">{selectedPassport.holderName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Nationality</Label>
                    <p className="text-sm text-muted-foreground">{selectedPassport.nationality}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedPassport.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Place of Birth</Label>
                    <p className="text-sm text-muted-foreground">{selectedPassport.placeOfBirth}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Gender</Label>
                    <p className="text-sm text-muted-foreground">{selectedPassport.gender}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Issue Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedPassport.issuedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Expiry Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedPassport.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Issuing Authority</Label>
                    <p className="text-sm text-muted-foreground">{selectedPassport.issuingAuthority}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="travel">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Travel History</h3>
                  {selectedPassport.travelHistory.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Country</TableHead>
                          <TableHead>Entry Date</TableHead>
                          <TableHead>Exit Date</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Port</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPassport.travelHistory.map((travel) => (
                          <TableRow key={travel.id}>
                            <TableCell>{travel.country}</TableCell>
                            <TableCell>{new Date(travel.entryDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {travel.exitDate ? new Date(travel.exitDate).toLocaleDateString() : 'Still in country'}
                            </TableCell>
                            <TableCell>{travel.purpose}</TableCell>
                            <TableCell>{travel.port}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No travel history recorded
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="visas">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Visa Records</h3>
                  {selectedPassport.visaRecords.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Country</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Valid From</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPassport.visaRecords.map((visa) => (
                          <TableRow key={visa.id}>
                            <TableCell>{visa.country}</TableCell>
                            <TableCell>{visa.type}</TableCell>
                            <TableCell>{new Date(visa.validFrom).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(visa.validUntil).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge className={visa.status === 'valid' ? 'bg-green-100 text-green-800' : 
                                              visa.status === 'expired' ? 'bg-red-100 text-red-800' : 
                                              'bg-gray-100 text-gray-800'}>
                                {visa.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No visa records found
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="security">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Security Features</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Digital Signature</Label>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedPassport.securityFeatures.digitalSignature}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Encryption Level</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedPassport.securityFeatures.encryptionLevel}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Last Verified</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedPassport.securityFeatures.lastVerified).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-md font-medium mb-2">Biometric Data</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Fingerprint Hash</Label>
                        <p className="text-sm text-muted-foreground font-mono">
                          {selectedPassport.biometricData.fingerprint || 'Not recorded'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Face Recognition Hash</Label>
                        <p className="text-sm text-muted-foreground font-mono">
                          {selectedPassport.biometricData.faceRecognition || 'Not recorded'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Iris Scan Hash</Label>
                        <p className="text-sm text-muted-foreground font-mono">
                          {selectedPassport.biometricData.iris || 'Not recorded'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DigitalPassportIntegration;