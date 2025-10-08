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
import { Search, Plus, Eye, Edit, FileText, User, MapPin, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Api } from '@/lib/api';
import type { SearchResidentRequest, SearchResidentResponse, UpsertResidentRequest, UpsertResidentResponse } from '@shared/api';

interface ResidencyRecord {
  id: string;
  nationalId: string;
  passportNumber?: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  gender: 'male' | 'female' | 'other';
  occupation: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  residencyStatus: 'citizen' | 'permanent_resident' | 'temporary_resident' | 'refugee' | 'asylum_seeker' | 'visitor';
  residencyValidFrom: string;
  residencyValidUntil?: string;
  currentAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    address?: string;
  };
  employmentInfo?: {
    employer: string;
    position: string;
    workPermitNumber?: string;
    workPermitExpiry?: string;
  };
  familyMembers: {
    id: string;
    name: string;
    relationship: string;
    nationalId?: string;
    dateOfBirth: string;
  }[];
  documents: {
    id: string;
    type: 'passport' | 'birth_certificate' | 'marriage_certificate' | 'work_permit' | 'visa' | 'other';
    number: string;
    issuedDate: string;
    expiryDate?: string;
    issuingAuthority: string;
    status: 'valid' | 'expired' | 'revoked';
  }[];
  registrationDate: string;
  lastUpdated: string;
  status: 'active' | 'inactive' | 'pending_verification' | 'flagged';
  notes?: string;
  createdBy: string;
  updatedBy: string;
}

const ResidencyManagement: React.FC = () => {
  const [residents, setResidents] = useState<ResidencyRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [residencyFilter, setResidencyFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ResidencyRecord | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newResident, setNewResident] = useState<Partial<ResidencyRecord>>({
    fullName: '',
    dateOfBirth: '',
    nationality: '',
    gender: 'male',
    occupation: '',
    maritalStatus: 'single',
    residencyStatus: 'temporary_resident',
    residencyValidFrom: format(new Date(), 'yyyy-MM-dd'),
    currentAddress: {
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Zambia'
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    familyMembers: [],
    documents: [],
    status: 'pending_verification'
  });

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      setLoading(true);
      // Load from localStorage as mock data
      const storedResidents = localStorage.getItem('residencyRecords');
      if (storedResidents) {
        setResidents(JSON.parse(storedResidents));
      } else {
        // Initialize with some mock data
        const mockResidents: ResidencyRecord[] = [
          {
            id: 'resident_1',
            nationalId: 'NRC123456789',
            passportNumber: 'ZM1234567',
            fullName: 'Mary Banda',
            dateOfBirth: '1985-03-15',
            nationality: 'Zambian',
            gender: 'female',
            occupation: 'Teacher',
            maritalStatus: 'married',
            residencyStatus: 'citizen',
            residencyValidFrom: '1985-03-15',
            currentAddress: {
              street: '123 Independence Avenue',
              city: 'Lusaka',
              province: 'Lusaka',
              postalCode: '10101',
              country: 'Zambia'
            },
            emergencyContact: {
              name: 'John Banda',
              relationship: 'Spouse',
              phone: '+260-97-1234567'
            },
            employmentInfo: {
              employer: 'Ministry of Education',
              position: 'Secondary School Teacher'
            },
            familyMembers: [
              {
                id: 'family_1',
                name: 'Peter Banda',
                relationship: 'Son',
                nationalId: 'NRC987654321',
                dateOfBirth: '2010-08-20'
              }
            ],
            documents: [
              {
                id: 'doc_1',
                type: 'passport',
                number: 'ZM1234567',
                issuedDate: '2020-01-15',
                expiryDate: '2030-01-15',
                issuingAuthority: 'Department of Immigration',
                status: 'valid'
              }
            ],
            registrationDate: '2020-01-20',
            lastUpdated: '2024-01-15',
            status: 'active',
            createdBy: 'Immigration Officer A',
            updatedBy: 'Immigration Officer A'
          }
        ];
        setResidents(mockResidents);
        localStorage.setItem('residencyRecords', JSON.stringify(mockResidents));
      }
    } catch (error) {
      console.error('Failed to load residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveResidents = (updatedResidents: ResidencyRecord[]) => {
    localStorage.setItem('residencyRecords', JSON.stringify(updatedResidents));
    setResidents(updatedResidents);
  };

  const generateNationalId = () => {
    const timestamp = Date.now().toString();
    return `NRC${timestamp.slice(-9)}`;
  };

  const handleCreateResident = async () => {
    if (!newResident.fullName || !newResident.dateOfBirth || !newResident.nationality) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const resident: ResidencyRecord = {
        id: `resident_${Date.now()}`,
        nationalId: newResident.nationalId || generateNationalId(),
        ...newResident,
        registrationDate: format(new Date(), 'yyyy-MM-dd'),
        lastUpdated: format(new Date(), 'yyyy-MM-dd'),
        createdBy: 'Current Officer',
        updatedBy: 'Current Officer',
      } as ResidencyRecord;

      const updatedResidents = [...residents, resident];
      saveResidents(updatedResidents);
      
      // Also create via API if available
      try {
        await Api.upsertResident({
          nationalId: resident.nationalId,
          passportNumber: resident.passportNumber,
          fullName: resident.fullName,
          dateOfBirth: resident.dateOfBirth,
          nationality: resident.nationality,
          gender: resident.gender,
          occupation: resident.occupation,
          maritalStatus: resident.maritalStatus,
          residencyStatus: resident.residencyStatus
        });
      } catch (apiError) {
        console.warn('API call failed, using local storage only:', apiError);
      }
      
      setIsCreateDialogOpen(false);
      resetNewResident();
    } catch (error) {
      console.error('Failed to create resident:', error);
      alert('Failed to create resident record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResident = async () => {
    if (!selectedResident) return;

    try {
      setLoading(true);
      const updatedResident = {
        ...selectedResident,
        lastUpdated: format(new Date(), 'yyyy-MM-dd'),
        updatedBy: 'Current Officer'
      };

      const updatedResidents = residents.map(r => 
        r.id === selectedResident.id ? updatedResident : r
      );
      saveResidents(updatedResidents);
      
      setSelectedResident(updatedResident);
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to update resident:', error);
      alert('Failed to update resident record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetNewResident = () => {
    setNewResident({
      fullName: '',
      dateOfBirth: '',
      nationality: '',
      gender: 'male',
      occupation: '',
      maritalStatus: 'single',
      residencyStatus: 'temporary_resident',
      residencyValidFrom: format(new Date(), 'yyyy-MM-dd'),
      currentAddress: {
        street: '',
        city: '',
        province: '',
        postalCode: '',
        country: 'Zambia'
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      },
      familyMembers: [],
      documents: [],
      status: 'pending_verification'
    });
  };

  const updateResidentStatus = (residentId: string, newStatus: ResidencyRecord['status']) => {
    const updatedResidents = residents.map(resident => {
      if (resident.id === residentId) {
        return {
          ...resident,
          status: newStatus,
          lastUpdated: format(new Date(), 'yyyy-MM-dd'),
          updatedBy: 'Current Officer'
        };
      }
      return resident;
    });
    saveResidents(updatedResidents);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending_verification': return 'bg-yellow-100 text-yellow-800';
      case 'flagged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResidencyStatusColor = (status: string) => {
    switch (status) {
      case 'citizen': return 'bg-blue-100 text-blue-800';
      case 'permanent_resident': return 'bg-green-100 text-green-800';
      case 'temporary_resident': return 'bg-yellow-100 text-yellow-800';
      case 'refugee': return 'bg-orange-100 text-orange-800';
      case 'asylum_seeker': return 'bg-purple-100 text-purple-800';
      case 'visitor': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const addFamilyMember = () => {
    if (!selectedResident) return;
    const newMember = {
      id: `family_${Date.now()}`,
      name: '',
      relationship: '',
      dateOfBirth: ''
    };
    setSelectedResident({
      ...selectedResident,
      familyMembers: [...selectedResident.familyMembers, newMember]
    });
  };

  const removeFamilyMember = (memberId: string) => {
    if (!selectedResident) return;
    setSelectedResident({
      ...selectedResident,
      familyMembers: selectedResident.familyMembers.filter(m => m.id !== memberId)
    });
  };

  const addDocument = () => {
    if (!selectedResident) return;
    const newDoc = {
      id: `doc_${Date.now()}`,
      type: 'passport' as const,
      number: '',
      issuedDate: format(new Date(), 'yyyy-MM-dd'),
      issuingAuthority: '',
      status: 'valid' as const
    };
    setSelectedResident({
      ...selectedResident,
      documents: [...selectedResident.documents, newDoc]
    });
  };

  const removeDocument = (docId: string) => {
    if (!selectedResident) return;
    setSelectedResident({
      ...selectedResident,
      documents: selectedResident.documents.filter(d => d.id !== docId)
    });
  };

  const filteredResidents = residents.filter(resident => {
    const matchesSearch = resident.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resident.nationalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (resident.passportNumber && resident.passportNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || resident.status === statusFilter;
    const matchesResidency = residencyFilter === 'all' || resident.residencyStatus === residencyFilter;
    return matchesSearch && matchesStatus && matchesResidency;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Residency Management</h1>
          <p className="text-muted-foreground">Manage resident records and documentation</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Resident
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Resident</DialogTitle>
              <DialogDescription>
                Create a new resident record in the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={newResident.fullName || ''}
                        onChange={(e) => setNewResident({ ...newResident, fullName: e.target.value })}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={newResident.dateOfBirth || ''}
                        onChange={(e) => setNewResident({ ...newResident, dateOfBirth: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="nationality">Nationality *</Label>
                      <Input
                        id="nationality"
                        value={newResident.nationality || ''}
                        onChange={(e) => setNewResident({ ...newResident, nationality: e.target.value })}
                        placeholder="Enter nationality"
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={newResident.gender || 'male'}
                        onValueChange={(value) => setNewResident({ ...newResident, gender: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="maritalStatus">Marital Status</Label>
                      <Select
                        value={newResident.maritalStatus || 'single'}
                        onValueChange={(value) => setNewResident({ ...newResident, maritalStatus: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nationalId">National ID</Label>
                      <Input
                        id="nationalId"
                        value={newResident.nationalId || ''}
                        onChange={(e) => setNewResident({ ...newResident, nationalId: e.target.value })}
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                    <div>
                      <Label htmlFor="passportNumber">Passport Number</Label>
                      <Input
                        id="passportNumber"
                        value={newResident.passportNumber || ''}
                        onChange={(e) => setNewResident({ ...newResident, passportNumber: e.target.value })}
                        placeholder="Enter passport number"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      value={newResident.occupation || ''}
                      onChange={(e) => setNewResident({ ...newResident, occupation: e.target.value })}
                      placeholder="Enter occupation"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Residency Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Residency Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="residencyStatus">Status *</Label>
                      <Select
                        value={newResident.residencyStatus || 'temporary_resident'}
                        onValueChange={(value) => setNewResident({ ...newResident, residencyStatus: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="citizen">Citizen</SelectItem>
                          <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                          <SelectItem value="temporary_resident">Temporary Resident</SelectItem>
                          <SelectItem value="refugee">Refugee</SelectItem>
                          <SelectItem value="asylum_seeker">Asylum Seeker</SelectItem>
                          <SelectItem value="visitor">Visitor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="residencyValidFrom">Valid From *</Label>
                      <Input
                        id="residencyValidFrom"
                        type="date"
                        value={newResident.residencyValidFrom || ''}
                        onChange={(e) => setNewResident({ ...newResident, residencyValidFrom: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="residencyValidUntil">Valid Until (if applicable)</Label>
                    <Input
                      id="residencyValidUntil"
                      type="date"
                      value={newResident.residencyValidUntil || ''}
                      onChange={(e) => setNewResident({ ...newResident, residencyValidUntil: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={newResident.currentAddress?.street || ''}
                      onChange={(e) => setNewResident({
                        ...newResident,
                        currentAddress: { ...newResident.currentAddress!, street: e.target.value }
                      })}
                      placeholder="Enter street address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={newResident.currentAddress?.city || ''}
                        onChange={(e) => setNewResident({
                          ...newResident,
                          currentAddress: { ...newResident.currentAddress!, city: e.target.value }
                        })}
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="province">Province</Label>
                      <Input
                        id="province"
                        value={newResident.currentAddress?.province || ''}
                        onChange={(e) => setNewResident({
                          ...newResident,
                          currentAddress: { ...newResident.currentAddress!, province: e.target.value }
                        })}
                        placeholder="Enter province"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={newResident.currentAddress?.postalCode || ''}
                        onChange={(e) => setNewResident({
                          ...newResident,
                          currentAddress: { ...newResident.currentAddress!, postalCode: e.target.value }
                        })}
                        placeholder="Enter postal code"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={newResident.currentAddress?.country || 'Zambia'}
                        onChange={(e) => setNewResident({
                          ...newResident,
                          currentAddress: { ...newResident.currentAddress!, country: e.target.value }
                        })}
                        placeholder="Enter country"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyName">Contact Name</Label>
                      <Input
                        id="emergencyName"
                        value={newResident.emergencyContact?.name || ''}
                        onChange={(e) => setNewResident({
                          ...newResident,
                          emergencyContact: { ...newResident.emergencyContact!, name: e.target.value }
                        })}
                        placeholder="Enter contact name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyRelationship">Relationship</Label>
                      <Input
                        id="emergencyRelationship"
                        value={newResident.emergencyContact?.relationship || ''}
                        onChange={(e) => setNewResident({
                          ...newResident,
                          emergencyContact: { ...newResident.emergencyContact!, relationship: e.target.value }
                        })}
                        placeholder="Enter relationship"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Phone Number</Label>
                    <Input
                      id="emergencyPhone"
                      value={newResident.emergencyContact?.phone || ''}
                      onChange={(e) => setNewResident({
                        ...newResident,
                        emergencyContact: { ...newResident.emergencyContact!, phone: e.target.value }
                      })}
                      placeholder="Enter phone number"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateResident} disabled={loading}>
                {loading ? 'Creating...' : 'Create Resident'}
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
                  placeholder="Search by name, National ID, or passport..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending_verification">Pending Verification</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
            <Select value={residencyFilter} onValueChange={setResidencyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by residency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="citizen">Citizen</SelectItem>
                <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                <SelectItem value="temporary_resident">Temporary Resident</SelectItem>
                <SelectItem value="refugee">Refugee</SelectItem>
                <SelectItem value="asylum_seeker">Asylum Seeker</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Residents ({filteredResidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading residents...</div>
          ) : filteredResidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No residents found matching your criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>National ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Residency Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResidents.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell className="font-medium">{resident.nationalId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{resident.fullName}</p>
                        <p className="text-sm text-muted-foreground">{resident.nationality}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getResidencyStatusColor(resident.residencyStatus)}>
                        {resident.residencyStatus.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(resident.status)}>
                        {resident.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(resident.registrationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedResident(resident);
                            setIsViewDialogOpen(true);
                            setIsEditMode(false);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedResident(resident);
                            setIsViewDialogOpen(true);
                            setIsEditMode(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {resident.status === 'pending_verification' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateResidentStatus(resident.id, 'active')}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateResidentStatus(resident.id, 'flagged')}
                            >
                              <AlertTriangle className="h-4 w-4 text-red-600" />
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

      {/* Resident Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Resident' : 'Resident Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedResident && (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList>
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="family">Family</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">National ID</Label>
                    {isEditMode ? (
                      <Input
                        value={selectedResident.nationalId}
                        onChange={(e) => setSelectedResident({ ...selectedResident, nationalId: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{selectedResident.nationalId}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Passport Number</Label>
                    {isEditMode ? (
                      <Input
                        value={selectedResident.passportNumber || ''}
                        onChange={(e) => setSelectedResident({ ...selectedResident, passportNumber: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{selectedResident.passportNumber || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Full Name</Label>
                    {isEditMode ? (
                      <Input
                        value={selectedResident.fullName}
                        onChange={(e) => setSelectedResident({ ...selectedResident, fullName: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{selectedResident.fullName}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    {isEditMode ? (
                      <Input
                        type="date"
                        value={selectedResident.dateOfBirth}
                        onChange={(e) => setSelectedResident({ ...selectedResident, dateOfBirth: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedResident.dateOfBirth).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Nationality</Label>
                    {isEditMode ? (
                      <Input
                        value={selectedResident.nationality}
                        onChange={(e) => setSelectedResident({ ...selectedResident, nationality: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{selectedResident.nationality}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Gender</Label>
                    {isEditMode ? (
                      <Select
                        value={selectedResident.gender}
                        onValueChange={(value) => setSelectedResident({ ...selectedResident, gender: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">{selectedResident.gender}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Occupation</Label>
                    {isEditMode ? (
                      <Input
                        value={selectedResident.occupation}
                        onChange={(e) => setSelectedResident({ ...selectedResident, occupation: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{selectedResident.occupation}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Marital Status</Label>
                    {isEditMode ? (
                      <Select
                        value={selectedResident.maritalStatus}
                        onValueChange={(value) => setSelectedResident({ ...selectedResident, maritalStatus: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">{selectedResident.maritalStatus}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Residency Status</Label>
                    {isEditMode ? (
                      <Select
                        value={selectedResident.residencyStatus}
                        onValueChange={(value) => setSelectedResident({ ...selectedResident, residencyStatus: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="citizen">Citizen</SelectItem>
                          <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                          <SelectItem value="temporary_resident">Temporary Resident</SelectItem>
                          <SelectItem value="refugee">Refugee</SelectItem>
                          <SelectItem value="asylum_seeker">Asylum Seeker</SelectItem>
                          <SelectItem value="visitor">Visitor</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getResidencyStatusColor(selectedResident.residencyStatus)}>
                        {selectedResident.residencyStatus.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusBadgeColor(selectedResident.status)}>
                      {selectedResident.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                {/* Address Information */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Current Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label className="text-sm font-medium">Street Address</Label>
                      {isEditMode ? (
                        <Input
                          value={selectedResident.currentAddress.street}
                          onChange={(e) => setSelectedResident({
                            ...selectedResident,
                            currentAddress: { ...selectedResident.currentAddress, street: e.target.value }
                          })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{selectedResident.currentAddress.street}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">City</Label>
                      {isEditMode ? (
                        <Input
                          value={selectedResident.currentAddress.city}
                          onChange={(e) => setSelectedResident({
                            ...selectedResident,
                            currentAddress: { ...selectedResident.currentAddress, city: e.target.value }
                          })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{selectedResident.currentAddress.city}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Province</Label>
                      {isEditMode ? (
                        <Input
                          value={selectedResident.currentAddress.province}
                          onChange={(e) => setSelectedResident({
                            ...selectedResident,
                            currentAddress: { ...selectedResident.currentAddress, province: e.target.value }
                          })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{selectedResident.currentAddress.province}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Postal Code</Label>
                      {isEditMode ? (
                        <Input
                          value={selectedResident.currentAddress.postalCode}
                          onChange={(e) => setSelectedResident({
                            ...selectedResident,
                            currentAddress: { ...selectedResident.currentAddress, postalCode: e.target.value }
                          })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{selectedResident.currentAddress.postalCode}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Country</Label>
                      {isEditMode ? (
                        <Input
                          value={selectedResident.currentAddress.country}
                          onChange={(e) => setSelectedResident({
                            ...selectedResident,
                            currentAddress: { ...selectedResident.currentAddress, country: e.target.value }
                          })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{selectedResident.currentAddress.country}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      {isEditMode ? (
                        <Input
                          value={selectedResident.emergencyContact.name}
                          onChange={(e) => setSelectedResident({
                            ...selectedResident,
                            emergencyContact: { ...selectedResident.emergencyContact, name: e.target.value }
                          })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{selectedResident.emergencyContact.name}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Relationship</Label>
                      {isEditMode ? (
                        <Input
                          value={selectedResident.emergencyContact.relationship}
                          onChange={(e) => setSelectedResident({
                            ...selectedResident,
                            emergencyContact: { ...selectedResident.emergencyContact, relationship: e.target.value }
                          })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{selectedResident.emergencyContact.relationship}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      {isEditMode ? (
                        <Input
                          value={selectedResident.emergencyContact.phone}
                          onChange={(e) => setSelectedResident({
                            ...selectedResident,
                            emergencyContact: { ...selectedResident.emergencyContact, phone: e.target.value }
                          })}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">{selectedResident.emergencyContact.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="family">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Family Members</h3>
                    {isEditMode && (
                      <Button onClick={addFamilyMember} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    )}
                  </div>
                  {selectedResident.familyMembers.length > 0 ? (
                    selectedResident.familyMembers.map((member, index) => (
                      <div key={member.id} className="p-4 border rounded space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="grid grid-cols-2 gap-4 flex-1">
                            <div>
                              <Label className="text-sm font-medium">Name</Label>
                              {isEditMode ? (
                                <Input
                                  value={member.name}
                                  onChange={(e) => {
                                    const updatedMembers = [...selectedResident.familyMembers];
                                    updatedMembers[index] = { ...member, name: e.target.value };
                                    setSelectedResident({ ...selectedResident, familyMembers: updatedMembers });
                                  }}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">{member.name}</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Relationship</Label>
                              {isEditMode ? (
                                <Input
                                  value={member.relationship}
                                  onChange={(e) => {
                                    const updatedMembers = [...selectedResident.familyMembers];
                                    updatedMembers[index] = { ...member, relationship: e.target.value };
                                    setSelectedResident({ ...selectedResident, familyMembers: updatedMembers });
                                  }}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">{member.relationship}</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Date of Birth</Label>
                              {isEditMode ? (
                                <Input
                                  type="date"
                                  value={member.dateOfBirth}
                                  onChange={(e) => {
                                    const updatedMembers = [...selectedResident.familyMembers];
                                    updatedMembers[index] = { ...member, dateOfBirth: e.target.value };
                                    setSelectedResident({ ...selectedResident, familyMembers: updatedMembers });
                                  }}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {new Date(member.dateOfBirth).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm font-medium">National ID</Label>
                              {isEditMode ? (
                                <Input
                                  value={member.nationalId || ''}
                                  onChange={(e) => {
                                    const updatedMembers = [...selectedResident.familyMembers];
                                    updatedMembers[index] = { ...member, nationalId: e.target.value };
                                    setSelectedResident({ ...selectedResident, familyMembers: updatedMembers });
                                  }}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">{member.nationalId || 'N/A'}</p>
                              )}
                            </div>
                          </div>
                          {isEditMode && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFamilyMember(member.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No family members registered
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="documents">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Documents</h3>
                    {isEditMode && (
                      <Button onClick={addDocument} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Document
                      </Button>
                    )}
                  </div>
                  {selectedResident.documents.length > 0 ? (
                    selectedResident.documents.map((doc, index) => (
                      <div key={doc.id} className="p-4 border rounded space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="grid grid-cols-2 gap-4 flex-1">
                            <div>
                              <Label className="text-sm font-medium">Type</Label>
                              {isEditMode ? (
                                <Select
                                  value={doc.type}
                                  onValueChange={(value) => {
                                    const updatedDocs = [...selectedResident.documents];
                                    updatedDocs[index] = { ...doc, type: value as any };
                                    setSelectedResident({ ...selectedResident, documents: updatedDocs });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="passport">Passport</SelectItem>
                                    <SelectItem value="birth_certificate">Birth Certificate</SelectItem>
                                    <SelectItem value="marriage_certificate">Marriage Certificate</SelectItem>
                                    <SelectItem value="work_permit">Work Permit</SelectItem>
                                    <SelectItem value="visa">Visa</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <p className="text-sm text-muted-foreground">{doc.type.replace('_', ' ')}</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Number</Label>
                              {isEditMode ? (
                                <Input
                                  value={doc.number}
                                  onChange={(e) => {
                                    const updatedDocs = [...selectedResident.documents];
                                    updatedDocs[index] = { ...doc, number: e.target.value };
                                    setSelectedResident({ ...selectedResident, documents: updatedDocs });
                                  }}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">{doc.number}</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Issued Date</Label>
                              {isEditMode ? (
                                <Input
                                  type="date"
                                  value={doc.issuedDate}
                                  onChange={(e) => {
                                    const updatedDocs = [...selectedResident.documents];
                                    updatedDocs[index] = { ...doc, issuedDate: e.target.value };
                                    setSelectedResident({ ...selectedResident, documents: updatedDocs });
                                  }}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {new Date(doc.issuedDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Expiry Date</Label>
                              {isEditMode ? (
                                <Input
                                  type="date"
                                  value={doc.expiryDate || ''}
                                  onChange={(e) => {
                                    const updatedDocs = [...selectedResident.documents];
                                    updatedDocs[index] = { ...doc, expiryDate: e.target.value };
                                    setSelectedResident({ ...selectedResident, documents: updatedDocs });
                                  }}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'N/A'}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Issuing Authority</Label>
                              {isEditMode ? (
                                <Input
                                  value={doc.issuingAuthority}
                                  onChange={(e) => {
                                    const updatedDocs = [...selectedResident.documents];
                                    updatedDocs[index] = { ...doc, issuingAuthority: e.target.value };
                                    setSelectedResident({ ...selectedResident, documents: updatedDocs });
                                  }}
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">{doc.issuingAuthority}</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Status</Label>
                              {isEditMode ? (
                                <Select
                                  value={doc.status}
                                  onValueChange={(value) => {
                                    const updatedDocs = [...selectedResident.documents];
                                    updatedDocs[index] = { ...doc, status: value as any };
                                    setSelectedResident({ ...selectedResident, documents: updatedDocs });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="valid">Valid</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                    <SelectItem value="revoked">Revoked</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge className={doc.status === 'valid' ? 'bg-green-100 text-green-800' : 
                                                doc.status === 'expired' ? 'bg-red-100 text-red-800' : 
                                                'bg-gray-100 text-gray-800'}>
                                  {doc.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isEditMode && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeDocument(doc.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No documents registered
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="employment">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Employment Information</h3>
                  {selectedResident.employmentInfo ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Employer</Label>
                        {isEditMode ? (
                          <Input
                            value={selectedResident.employmentInfo.employer}
                            onChange={(e) => setSelectedResident({
                              ...selectedResident,
                              employmentInfo: { ...selectedResident.employmentInfo!, employer: e.target.value }
                            })}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">{selectedResident.employmentInfo.employer}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-