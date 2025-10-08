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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Eye, Edit, User, Phone, Mail, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { Api } from '@/lib/api';
import type { SearchResidentRequest, SearchResidentResponse, Resident } from '@shared/api';

interface Suspect {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address: string;
  nationality: string;
  occupation?: string;
  maritalStatus?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  photoUrl?: string;
  fingerprints?: string;
  status: 'active' | 'wanted' | 'detained' | 'cleared';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastKnownLocation?: string;
  associatedCases: string[];
  aliases?: string[];
  criminalHistory?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const SuspectRegistry: React.FC = () => {
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<Suspect | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [newSuspect, setNewSuspect] = useState<Partial<Suspect>>({
    firstName: '',
    lastName: '',
    nationalId: '',
    dateOfBirth: '',
    gender: 'male',
    address: '',
    nationality: '',
    status: 'active',
    riskLevel: 'low',
  });

  useEffect(() => {
    // Load suspects from local storage or API
    loadSuspects();
  }, []);

  const loadSuspects = async () => {
    try {
      setLoading(true);
      // For now, load from localStorage as a mock
      const storedSuspects = localStorage.getItem('suspects');
      if (storedSuspects) {
        setSuspects(JSON.parse(storedSuspects));
      }
    } catch (error) {
      console.error('Failed to load suspects:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSuspects = (updatedSuspects: Suspect[]) => {
    localStorage.setItem('suspects', JSON.stringify(updatedSuspects));
    setSuspects(updatedSuspects);
  };

  const handleCreateSuspect = async () => {
    if (!newSuspect.firstName || !newSuspect.lastName || !newSuspect.nationalId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const suspect: Suspect = {
        id: `suspect_${Date.now()}`,
        ...newSuspect,
        associatedCases: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Suspect;

      const updatedSuspects = [...suspects, suspect];
      saveSuspects(updatedSuspects);
      
      setIsCreateDialogOpen(false);
      setNewSuspect({
        firstName: '',
        lastName: '',
        nationalId: '',
        dateOfBirth: '',
        gender: 'male',
        address: '',
        nationality: '',
        status: 'active',
        riskLevel: 'low',
      });
    } catch (error) {
      console.error('Failed to create suspect:', error);
      alert('Failed to create suspect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchResidentInDatabase = async (nationalId: string) => {
    try {
      setSearchLoading(true);
      const response: SearchResidentResponse = await Api.searchResident({ nationalId });
      if (response.resident) {
        // Pre-fill form with resident data
        const resident = response.resident;
        setNewSuspect({
          firstName: resident.firstName,
          lastName: resident.lastName,
          nationalId: resident.nationalId,
          dateOfBirth: resident.dateOfBirth,
          gender: resident.gender,
          phone: resident.phone,
          email: resident.email,
          address: resident.address,
          nationality: resident.nationality,
          occupation: resident.occupation,
          maritalStatus: resident.maritalStatus,
          status: 'active',
          riskLevel: 'low',
        });
      } else {
        alert('No resident found with this National ID');
      }
    } catch (error) {
      console.error('Failed to search resident:', error);
      alert('Failed to search resident database');
    } finally {
      setSearchLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'wanted': return 'bg-red-100 text-red-800';
      case 'detained': return 'bg-orange-100 text-orange-800';
      case 'cleared': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSuspects = suspects.filter(suspect => {
    const matchesSearch = suspect.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         suspect.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         suspect.nationalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (suspect.aliases && suspect.aliases.some(alias => 
                           alias.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesStatus = statusFilter === 'all' || suspect.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || suspect.riskLevel === riskFilter;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suspect Registry</h1>
          <p className="text-muted-foreground">Manage suspect profiles and criminal records</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Suspect
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Suspect</DialogTitle>
              <DialogDescription>
                Add a new suspect to the registry. You can search for existing residents first.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Search Existing Resident */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Search Existing Resident</CardTitle>
                  <CardDescription>
                    Search the resident database to pre-fill suspect information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter National ID to search"
                      value={newSuspect.nationalId || ''}
                      onChange={(e) => setNewSuspect({ ...newSuspect, nationalId: e.target.value })}
                    />
                    <Button 
                      onClick={() => searchResidentInDatabase(newSuspect.nationalId || '')}
                      disabled={!newSuspect.nationalId || searchLoading}
                    >
                      {searchLoading ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newSuspect.firstName || ''}
                        onChange={(e) => setNewSuspect({ ...newSuspect, firstName: e.target.value })}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newSuspect.lastName || ''}
                        onChange={(e) => setNewSuspect({ ...newSuspect, lastName: e.target.value })}
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={newSuspect.dateOfBirth || ''}
                        onChange={(e) => setNewSuspect({ ...newSuspect, dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={newSuspect.gender || 'male'}
                        onValueChange={(value) => setNewSuspect({ ...newSuspect, gender: value as any })}
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
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        id="nationality"
                        value={newSuspect.nationality || ''}
                        onChange={(e) => setNewSuspect({ ...newSuspect, nationality: e.target.value })}
                        placeholder="Enter nationality"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newSuspect.phone || ''}
                        onChange={(e) => setNewSuspect({ ...newSuspect, phone: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newSuspect.email || ''}
                        onChange={(e) => setNewSuspect({ ...newSuspect, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={newSuspect.address || ''}
                      onChange={(e) => setNewSuspect({ ...newSuspect, address: e.target.value })}
                      placeholder="Enter full address"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Suspect Classification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Suspect Classification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={newSuspect.status || 'active'}
                        onValueChange={(value) => setNewSuspect({ ...newSuspect, status: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="wanted">Wanted</SelectItem>
                          <SelectItem value="detained">Detained</SelectItem>
                          <SelectItem value="cleared">Cleared</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="riskLevel">Risk Level</Label>
                      <Select
                        value={newSuspect.riskLevel || 'low'}
                        onValueChange={(value) => setNewSuspect({ ...newSuspect, riskLevel: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lastKnownLocation">Last Known Location</Label>
                    <Input
                      id="lastKnownLocation"
                      value={newSuspect.lastKnownLocation || ''}
                      onChange={(e) => setNewSuspect({ ...newSuspect, lastKnownLocation: e.target.value })}
                      placeholder="Enter last known location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newSuspect.notes || ''}
                      onChange={(e) => setNewSuspect({ ...newSuspect, notes: e.target.value })}
                      placeholder="Enter any additional notes or observations"
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
              <Button onClick={handleCreateSuspect} disabled={loading}>
                {loading ? 'Adding...' : 'Add Suspect'}
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
                  placeholder="Search suspects by name, ID, or alias..."
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
                <SelectItem value="wanted">Wanted</SelectItem>
                <SelectItem value="detained">Detained</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suspects ({filteredSuspects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading suspects...</div>
          ) : filteredSuspects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No suspects found matching your criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>National ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Last Known Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuspects.map((suspect) => (
                  <TableRow key={suspect.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={suspect.photoUrl} />
                        <AvatarFallback>
                          {suspect.firstName[0]}{suspect.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {suspect.firstName} {suspect.lastName}
                    </TableCell>
                    <TableCell>{suspect.nationalId}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(suspect.status)}>
                        {suspect.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskBadgeColor(suspect.riskLevel)}>
                        {suspect.riskLevel}
                        {suspect.riskLevel === 'critical' && (
                          <AlertTriangle className="ml-1 h-3 w-3" />
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{suspect.lastKnownLocation || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSuspect(suspect);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Suspect Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suspect Profile</DialogTitle>
          </DialogHeader>
          {selectedSuspect && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="cases">Associated Cases</TabsTrigger>
                <TabsTrigger value="history">Criminal History</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="space-y-4">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedSuspect.photoUrl} />
                    <AvatarFallback className="text-lg">
                      {selectedSuspect.firstName[0]}{selectedSuspect.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">
                      {selectedSuspect.firstName} {selectedSuspect.lastName}
                    </h3>
                    <p className="text-muted-foreground">{selectedSuspect.nationalId}</p>
                    <div className="flex space-x-2 mt-2">
                      <Badge className={getStatusBadgeColor(selectedSuspect.status)}>
                        {selectedSuspect.status}
                      </Badge>
                      <Badge className={getRiskBadgeColor(selectedSuspect.riskLevel)}>
                        {selectedSuspect.riskLevel} risk
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedSuspect.dateOfBirth ? new Date(selectedSuspect.dateOfBirth).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Gender</Label>
                    <p className="text-sm text-muted-foreground">{selectedSuspect.gender}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Nationality</Label>
                    <p className="text-sm text-muted-foreground">{selectedSuspect.nationality}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Occupation</Label>
                    <p className="text-sm text-muted-foreground">{selectedSuspect.occupation || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-muted-foreground">{selectedSuspect.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">{selectedSuspect.email || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-sm text-muted-foreground">{selectedSuspect.address}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Known Location</Label>
                  <p className="text-sm text-muted-foreground">{selectedSuspect.lastKnownLocation || 'Unknown'}</p>
                </div>
                {selectedSuspect.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <p className="text-sm text-muted-foreground">{selectedSuspect.notes}</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="cases">
                <div className="text-center py-8 text-muted-foreground">
                  Associated cases feature coming soon...
                </div>
              </TabsContent>
              <TabsContent value="history">
                <div className="text-center py-8 text-muted-foreground">
                  Criminal history feature coming soon...
                </div>
              </TabsContent>
              <TabsContent value="contacts">
                <div className="text-center py-8 text-muted-foreground">
                  Emergency contacts and associates feature coming soon...
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuspectRegistry;