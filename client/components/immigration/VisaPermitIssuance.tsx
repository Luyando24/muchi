import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Plus, Eye, Edit, FileText, Calendar as CalendarIcon, User, Globe, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Api } from '@/lib/api';
import type { CreatePermitRequest, CreatePermitResponse, ListPermitsResponse } from '@shared/api';

interface VisaPermit {
  id: string;
  permitNumber: string;
  type: 'tourist_visa' | 'business_visa' | 'work_permit' | 'residence_permit' | 'student_visa' | 'transit_visa';
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  applicantName: string;
  applicantNationality: string;
  applicantPassport: string;
  purpose: string;
  duration: number; // in days
  validFrom: string;
  validUntil: string;
  issuedBy: string;
  issuedDate?: string;
  applicationDate: string;
  processingFee: number;
  documents: {
    id: string;
    name: string;
    type: string;
    status: 'pending' | 'verified' | 'rejected';
    uploadedAt: string;
  }[];
  notes?: string;
  rejectionReason?: string;
  residentId?: string;
  createdAt: string;
  updatedAt: string;
}

const VisaPermitIssuance: React.FC = () => {
  const [permits, setPermits] = useState<VisaPermit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<VisaPermit | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newPermit, setNewPermit] = useState<Partial<VisaPermit>>({
    type: 'tourist_visa',
    applicantName: '',
    applicantNationality: '',
    applicantPassport: '',
    purpose: '',
    duration: 30,
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    processingFee: 0,
    status: 'pending',
  });

  useEffect(() => {
    loadPermits();
  }, []);

  const loadPermits = async () => {
    try {
      setLoading(true);
      // Load from localStorage as mock data
      const storedPermits = localStorage.getItem('visaPermits');
      if (storedPermits) {
        setPermits(JSON.parse(storedPermits));
      } else {
        // Initialize with some mock data
        const mockPermits: VisaPermit[] = [
          {
            id: 'permit_1',
            permitNumber: 'VP2024001',
            type: 'tourist_visa',
            status: 'approved',
            applicantName: 'John Smith',
            applicantNationality: 'United States',
            applicantPassport: 'US123456789',
            purpose: 'Tourism and sightseeing',
            duration: 30,
            validFrom: '2024-01-15',
            validUntil: '2024-02-14',
            issuedBy: 'Immigration Officer A',
            issuedDate: '2024-01-10',
            applicationDate: '2024-01-05',
            processingFee: 50,
            documents: [
              {
                id: 'doc_1',
                name: 'Passport Copy',
                type: 'passport',
                status: 'verified',
                uploadedAt: '2024-01-05'
              },
              {
                id: 'doc_2',
                name: 'Hotel Booking',
                type: 'accommodation',
                status: 'verified',
                uploadedAt: '2024-01-05'
              }
            ],
            createdAt: '2024-01-05T10:00:00Z',
            updatedAt: '2024-01-10T14:30:00Z'
          }
        ];
        setPermits(mockPermits);
        localStorage.setItem('visaPermits', JSON.stringify(mockPermits));
      }
    } catch (error) {
      console.error('Failed to load permits:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePermits = (updatedPermits: VisaPermit[]) => {
    localStorage.setItem('visaPermits', JSON.stringify(updatedPermits));
    setPermits(updatedPermits);
  };

  const handleCreatePermit = async () => {
    if (!newPermit.applicantName || !newPermit.applicantPassport || !newPermit.purpose) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const validUntil = new Date(newPermit.validFrom!);
      validUntil.setDate(validUntil.getDate() + (newPermit.duration || 30));

      const permit: VisaPermit = {
        id: `permit_${Date.now()}`,
        permitNumber: `VP${new Date().getFullYear()}${String(permits.length + 1).padStart(3, '0')}`,
        ...newPermit,
        validUntil: format(validUntil, 'yyyy-MM-dd'),
        applicationDate: format(new Date(), 'yyyy-MM-dd'),
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as VisaPermit;

      const updatedPermits = [...permits, permit];
      savePermits(updatedPermits);
      
      // Also create via API if available
      try {
        await Api.createPermit({
          type: permit.type,
          residentId: permit.residentId,
          validFrom: permit.validFrom,
          validUntil: permit.validUntil,
          notes: permit.notes
        });
      } catch (apiError) {
        console.warn('API call failed, using local storage only:', apiError);
      }
      
      setIsCreateDialogOpen(false);
      setNewPermit({
        type: 'tourist_visa',
        applicantName: '',
        applicantNationality: '',
        applicantPassport: '',
        purpose: '',
        duration: 30,
        validFrom: format(new Date(), 'yyyy-MM-dd'),
        processingFee: 0,
        status: 'pending',
      });
    } catch (error) {
      console.error('Failed to create permit:', error);
      alert('Failed to create permit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updatePermitStatus = (permitId: string, newStatus: VisaPermit['status'], rejectionReason?: string) => {
    const updatedPermits = permits.map(permit => {
      if (permit.id === permitId) {
        const updated = {
          ...permit,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          ...(newStatus === 'approved' && { issuedDate: format(new Date(), 'yyyy-MM-dd'), issuedBy: 'Current Officer' }),
          ...(newStatus === 'rejected' && rejectionReason && { rejectionReason })
        };
        return updated;
      }
      return permit;
    });
    savePermits(updatedPermits);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'tourist_visa': return 'Tourist Visa';
      case 'business_visa': return 'Business Visa';
      case 'work_permit': return 'Work Permit';
      case 'residence_permit': return 'Residence Permit';
      case 'student_visa': return 'Student Visa';
      case 'transit_visa': return 'Transit Visa';
      default: return type;
    }
  };

  const getProcessingFee = (type: string, duration: number) => {
    const baseFees = {
      'tourist_visa': 50,
      'business_visa': 100,
      'work_permit': 200,
      'residence_permit': 300,
      'student_visa': 75,
      'transit_visa': 25
    };
    const baseFee = baseFees[type as keyof typeof baseFees] || 50;
    return baseFee + (duration > 30 ? (duration - 30) * 2 : 0);
  };

  const filteredPermits = permits.filter(permit => {
    const matchesSearch = permit.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permit.permitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permit.applicantPassport.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || permit.status === statusFilter;
    const matchesType = typeFilter === 'all' || permit.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visa & Permit Issuance</h1>
          <p className="text-muted-foreground">Process visa applications and issue permits</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Visa/Permit Application</DialogTitle>
              <DialogDescription>
                Create a new visa or permit application.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Application Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="type">Visa/Permit Type *</Label>
                    <Select
                      value={newPermit.type || 'tourist_visa'}
                      onValueChange={(value) => {
                        const fee = getProcessingFee(value, newPermit.duration || 30);
                        setNewPermit({ ...newPermit, type: value as any, processingFee: fee });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tourist_visa">Tourist Visa</SelectItem>
                        <SelectItem value="business_visa">Business Visa</SelectItem>
                        <SelectItem value="work_permit">Work Permit</SelectItem>
                        <SelectItem value="residence_permit">Residence Permit</SelectItem>
                        <SelectItem value="student_visa">Student Visa</SelectItem>
                        <SelectItem value="transit_visa">Transit Visa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="purpose">Purpose of Visit/Stay *</Label>
                    <Textarea
                      id="purpose"
                      value={newPermit.purpose || ''}
                      onChange={(e) => setNewPermit({ ...newPermit, purpose: e.target.value })}
                      placeholder="Describe the purpose of the visit or stay"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Applicant Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Applicant Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="applicantName">Full Name *</Label>
                      <Input
                        id="applicantName"
                        value={newPermit.applicantName || ''}
                        onChange={(e) => setNewPermit({ ...newPermit, applicantName: e.target.value })}
                        placeholder="Enter full name as in passport"
                      />
                    </div>
                    <div>
                      <Label htmlFor="applicantNationality">Nationality *</Label>
                      <Input
                        id="applicantNationality"
                        value={newPermit.applicantNationality || ''}
                        onChange={(e) => setNewPermit({ ...newPermit, applicantNationality: e.target.value })}
                        placeholder="Enter nationality"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="applicantPassport">Passport Number *</Label>
                      <Input
                        id="applicantPassport"
                        value={newPermit.applicantPassport || ''}
                        onChange={(e) => setNewPermit({ ...newPermit, applicantPassport: e.target.value })}
                        placeholder="Enter passport number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="residentId">Resident ID (if applicable)</Label>
                      <Input
                        id="residentId"
                        value={newPermit.residentId || ''}
                        onChange={(e) => setNewPermit({ ...newPermit, residentId: e.target.value })}
                        placeholder="Enter resident ID if applicable"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Validity Period */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Validity Period</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="validFrom">Valid From *</Label>
                      <Input
                        id="validFrom"
                        type="date"
                        value={newPermit.validFrom || ''}
                        onChange={(e) => setNewPermit({ ...newPermit, validFrom: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (days) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newPermit.duration || 30}
                        onChange={(e) => {
                          const duration = parseInt(e.target.value);
                          const fee = getProcessingFee(newPermit.type || 'tourist_visa', duration);
                          setNewPermit({ ...newPermit, duration, processingFee: fee });
                        }}
                        min="1"
                        max="365"
                      />
                    </div>
                    <div>
                      <Label htmlFor="processingFee">Processing Fee ($)</Label>
                      <Input
                        id="processingFee"
                        type="number"
                        value={newPermit.processingFee || 0}
                        onChange={(e) => setNewPermit({ ...newPermit, processingFee: parseFloat(e.target.value) })}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  {newPermit.validFrom && newPermit.duration && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">
                        <strong>Valid Until:</strong> {format(new Date(new Date(newPermit.validFrom).getTime() + (newPermit.duration * 24 * 60 * 60 * 1000)), 'PPP')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newPermit.notes || ''}
                      onChange={(e) => setNewPermit({ ...newPermit, notes: e.target.value })}
                      placeholder="Enter any additional notes or special conditions"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePermit} disabled={loading}>
                {loading ? 'Creating...' : 'Create Application'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                  placeholder="Search by name, permit number, or passport..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tourist_visa">Tourist Visa</SelectItem>
                <SelectItem value="business_visa">Business Visa</SelectItem>
                <SelectItem value="work_permit">Work Permit</SelectItem>
                <SelectItem value="residence_permit">Residence Permit</SelectItem>
                <SelectItem value="student_visa">Student Visa</SelectItem>
                <SelectItem value="transit_visa">Transit Visa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applications ({filteredPermits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading applications...</div>
          ) : filteredPermits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No applications found matching your criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permit #</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermits.map((permit) => (
                  <TableRow key={permit.id}>
                    <TableCell className="font-medium">{permit.permitNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{permit.applicantName}</p>
                        <p className="text-sm text-muted-foreground">{permit.applicantNationality}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeDisplayName(permit.type)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(permit.status)}>
                        {permit.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(permit.validFrom).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">to {new Date(permit.validUntil).toLocaleDateString()}</p>
                      </div>
                    </TableCell>
                    <TableCell>${permit.processingFee}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPermit(permit);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {permit.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updatePermitStatus(permit.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const reason = prompt('Enter rejection reason:');
                                if (reason) updatePermitStatus(permit.id, 'rejected', reason);
                              }}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
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

      {/* Permit Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permit Details</DialogTitle>
          </DialogHeader>
          {selectedPermit && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Permit Number</Label>
                    <p className="text-sm text-muted-foreground">{selectedPermit.permitNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusBadgeColor(selectedPermit.status)}>
                      {selectedPermit.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <p className="text-sm text-muted-foreground">{getTypeDisplayName(selectedPermit.type)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Processing Fee</Label>
                    <p className="text-sm text-muted-foreground">${selectedPermit.processingFee}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Applicant Name</Label>
                    <p className="text-sm text-muted-foreground">{selectedPermit.applicantName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Nationality</Label>
                    <p className="text-sm text-muted-foreground">{selectedPermit.applicantNationality}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Passport Number</Label>
                    <p className="text-sm text-muted-foreground">{selectedPermit.applicantPassport}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Application Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedPermit.applicationDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Valid From</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedPermit.validFrom).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Valid Until</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedPermit.validUntil).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedPermit.issuedBy && (
                    <div>
                      <Label className="text-sm font-medium">Issued By</Label>
                      <p className="text-sm text-muted-foreground">{selectedPermit.issuedBy}</p>
                    </div>
                  )}
                  {selectedPermit.issuedDate && (
                    <div>
                      <Label className="text-sm font-medium">Issued Date</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedPermit.issuedDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Purpose</Label>
                  <p className="text-sm text-muted-foreground">{selectedPermit.purpose}</p>
                </div>
                {selectedPermit.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <p className="text-sm text-muted-foreground">{selectedPermit.notes}</p>
                  </div>
                )}
                {selectedPermit.rejectionReason && (
                  <div>
                    <Label className="text-sm font-medium">Rejection Reason</Label>
                    <p className="text-sm text-red-600">{selectedPermit.rejectionReason}</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="documents">
                <div className="space-y-4">
                  {selectedPermit.documents.length > 0 ? (
                    selectedPermit.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded">
                        <div>
                          <h4 className="font-medium">{doc.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Type: {doc.type} • Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={doc.status === 'verified' ? 'bg-green-100 text-green-800' : 
                                        doc.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                        'bg-yellow-100 text-yellow-800'}>
                          {doc.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No documents uploaded yet
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="history">
                <div className="text-center py-8 text-muted-foreground">
                  Application history feature coming soon...
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisaPermitIssuance;