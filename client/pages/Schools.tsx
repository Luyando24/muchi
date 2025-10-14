import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Building, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Users, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface School {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  schoolType: 'primary' | 'secondary' | 'combined';
  status: 'active' | 'inactive' | 'suspended';
  subscriptionPlan: 'basic' | 'standard' | 'premium' | 'none';
  subscriptionStatus?: 'active' | 'trial' | 'expired' | 'cancelled' | 'none';
  userCount: number;
  studentCount: number;
  teacherCount: number;
  createdAt: string;
  lastActivity: string;
  website?: string;
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
}

interface SchoolFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  schoolType: 'primary' | 'secondary' | 'combined';
  principalName: string;
  principalEmail: string;
  principalPhone: string;
  website: string;
  password: string;
}

const PROVINCES = [
  'Central', 'Copperbelt', 'Eastern', 'Luapula', 'Lusaka', 
  'Muchinga', 'Northern', 'North-Western', 'Southern', 'Western'
];

const SCHOOL_TYPES = [
  { value: 'primary', label: 'Primary School' },
  { value: 'secondary', label: 'Secondary School' },
  { value: 'combined', label: 'Combined School' }
];

const SUBSCRIPTION_PLANS = [
  { value: 'basic', label: 'Basic Plan', color: 'bg-gray-100 text-gray-800' },
  { value: 'standard', label: 'Standard Plan', color: 'bg-blue-100 text-blue-800' },
  { value: 'premium', label: 'Premium Plan', color: 'bg-purple-100 text-purple-800' },
  { value: 'none', label: 'No Subscription', color: 'bg-red-100 text-red-800' }
];

const MOCK_SCHOOLS: School[] = [
  {
    id: '1',
    name: 'Lusaka Primary School',
    code: 'LPS001',
    email: 'admin@lusakaprimary.edu.zm',
    phone: '+260 211 123456',
    address: '123 Independence Avenue',
    district: 'Lusaka',
    province: 'Lusaka',
    schoolType: 'primary',
    status: 'active',
    subscriptionPlan: 'standard',
    subscriptionStatus: 'active',
    userCount: 45,
    studentCount: 850,
    teacherCount: 32,
    createdAt: '2024-01-15T10:30:00Z',
    lastActivity: '2024-01-20T14:22:00Z',
    website: 'https://lusakaprimary.edu.zm',
    principalName: 'Mrs. Sarah Mwanza',
    principalEmail: 'principal@lusakaprimary.edu.zm',
    principalPhone: '+260 211 123457'
  },
  {
    id: '2',
    name: 'Ndola Secondary School',
    code: 'NSS002',
    email: 'info@ndolasecondary.edu.zm',
    phone: '+260 212 987654',
    address: '456 Broadway Street',
    district: 'Ndola',
    province: 'Copperbelt',
    schoolType: 'secondary',
    status: 'active',
    subscriptionPlan: 'premium',
    subscriptionStatus: 'trial',
    userCount: 78,
    studentCount: 1200,
    teacherCount: 65,
    createdAt: '2024-01-10T09:15:00Z',
    lastActivity: '2024-01-19T16:45:00Z',
    principalName: 'Mr. John Banda',
    principalEmail: 'principal@ndolasecondary.edu.zm',
    principalPhone: '+260 212 987655'
  },
  {
    id: '3',
    name: 'Kitwe Combined School',
    code: 'KCS003',
    email: 'admin@kitwecombined.edu.zm',
    phone: '+260 212 555123',
    address: '789 Mining Road',
    district: 'Kitwe',
    province: 'Copperbelt',
    schoolType: 'combined',
    status: 'inactive',
    subscriptionPlan: 'basic',
    subscriptionStatus: 'expired',
    userCount: 25,
    studentCount: 600,
    teacherCount: 28,
    createdAt: '2024-01-05T08:00:00Z',
    lastActivity: '2024-01-18T12:30:00Z',
    principalName: 'Mrs. Grace Phiri',
    principalEmail: 'principal@kitwecombined.edu.zm',
    principalPhone: '+260 212 555124'
  }
];

export default function Schools() {
  const [schools, setSchools] = useState<School[]>(MOCK_SCHOOLS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProvince, setFilterProvince] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState<SchoolFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    district: '',
    province: '',
    schoolType: 'primary',
    principalName: '',
    principalEmail: '',
    principalPhone: '',
    website: '',
    password: ''
  });

  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || school.status === filterStatus;
    const matchesProvince = filterProvince === 'all' || school.province === filterProvince;
    
    return matchesSearch && matchesStatus && matchesProvince;
  });

  const handleAddSchool = () => {
    const newSchool: School = {
      id: Date.now().toString(),
      ...formData,
      status: 'active',
      subscriptionPlan: 'none',
      subscriptionStatus: 'none',
      userCount: 0,
      studentCount: 0,
      teacherCount: 0,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    setSchools([...schools, newSchool]);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success('School added successfully');
  };

  const handleEditSchool = () => {
    if (!selectedSchool) return;
    
    const updatedSchools = schools.map(school =>
      school.id === selectedSchool.id
        ? { ...school, ...formData }
        : school
    );
    
    setSchools(updatedSchools);
    setIsEditDialogOpen(false);
    setSelectedSchool(null);
    resetForm();
    toast.success('School updated successfully');
  };

  const handleDeleteSchool = () => {
    if (!selectedSchool) return;
    
    setSchools(schools.filter(school => school.id !== selectedSchool.id));
    setIsDeleteDialogOpen(false);
    setSelectedSchool(null);
    toast.success('School deleted successfully');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      district: '',
      province: '',
      schoolType: 'primary',
      principalName: '',
      principalEmail: '',
      principalPhone: '',
      website: '',
      password: ''
    });
  };

  const openEditDialog = (school: School) => {
    setSelectedSchool(school);
    setFormData({
      name: school.name,
      email: school.email,
      phone: school.phone,
      address: school.address,
      district: school.district,
      province: school.province,
      schoolType: school.schoolType,
      principalName: school.principalName || '',
      principalEmail: school.principalEmail || '',
      principalPhone: school.principalPhone || '',
      website: school.website || '',
      password: ''
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (school: School) => {
    setSelectedSchool(school);
    setIsViewDialogOpen(true);
  };

  const openDeleteDialog = (school: School) => {
    setSelectedSchool(school);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800' },
      inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-800' },
      suspended: { label: 'Suspended', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getSubscriptionBadge = (plan: string) => {
    const planConfig = SUBSCRIPTION_PLANS.find(p => p.value === plan);
    return <Badge className={planConfig?.color || 'bg-gray-100 text-gray-800'}>{planConfig?.label || 'Unknown'}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Building className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Schools Management</h1>
              <p className="text-muted-foreground">Manage and monitor all registered schools</p>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add School
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New School</DialogTitle>
                <DialogDescription>
                  Register a new school in the system
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">School Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter school name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="school@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+260 xxx xxx xxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://school.edu.zm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter full address"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="District"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    <Select value={formData.province} onValueChange={(value) => setFormData({ ...formData, province: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCES.map((province) => (
                          <SelectItem key={province} value={province}>
                            {province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolType">School Type</Label>
                    <Select value={formData.schoolType} onValueChange={(value: 'primary' | 'secondary' | 'combined') => setFormData({ ...formData, schoolType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHOOL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="principalName">Principal Name</Label>
                    <Input
                      id="principalName"
                      value={formData.principalName}
                      onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                      placeholder="Principal's full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="principalEmail">Principal Email</Label>
                    <Input
                      id="principalEmail"
                      type="email"
                      value={formData.principalEmail}
                      onChange={(e) => setFormData({ ...formData, principalEmail: e.target.value })}
                      placeholder="principal@school.edu.zm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="principalPhone">Principal Phone</Label>
                    <Input
                      id="principalPhone"
                      value={formData.principalPhone}
                      onChange={(e) => setFormData({ ...formData, principalPhone: e.target.value })}
                      placeholder="+260 xxx xxx xxx"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Initial Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Set initial admin password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSchool}>Add School</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schools.length}</div>
              <p className="text-xs text-muted-foreground">
                Registered schools
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Schools</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schools.filter(s => s.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schools.reduce((sum, s) => sum + s.studentCount, 0)}</div>
              <p className="text-xs text-muted-foreground">
                Across all schools
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schools.reduce((sum, s) => sum + s.teacherCount, 0)}</div>
              <p className="text-xs text-muted-foreground">
                Across all schools
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Schools Directory</CardTitle>
            <CardDescription>
              Search and filter schools by various criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search schools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterProvince} onValueChange={setFilterProvince}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Provinces</SelectItem>
                  {PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schools Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{school.name}</div>
                          <div className="text-sm text-muted-foreground">{school.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{school.district}</div>
                          <div className="text-xs text-muted-foreground">{school.province}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SCHOOL_TYPES.find(t => t.value === school.schoolType)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(school.status)}</TableCell>
                      <TableCell>{getSubscriptionBadge(school.subscriptionPlan)}</TableCell>
                      <TableCell>{school.studentCount}</TableCell>
                      <TableCell>{school.teacherCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewDialog(school)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(school)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(school)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>School Details</DialogTitle>
              <DialogDescription>
                View detailed information about {selectedSchool?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedSchool && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">School Name</Label>
                    <p className="text-sm text-muted-foreground">{selectedSchool.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">School Code</Label>
                    <p className="text-sm text-muted-foreground">{selectedSchool.code}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">{selectedSchool.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-muted-foreground">{selectedSchool.phone}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-sm text-muted-foreground">{selectedSchool.address}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">District</Label>
                    <p className="text-sm text-muted-foreground">{selectedSchool.district}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Province</Label>
                    <p className="text-sm text-muted-foreground">{selectedSchool.province}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <p className="text-sm text-muted-foreground">
                      {SCHOOL_TYPES.find(t => t.value === selectedSchool.schoolType)?.label}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Students</Label>
                    <p className="text-sm text-muted-foreground">{selectedSchool.studentCount}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Teachers</Label>
                    <p className="text-sm text-muted-foreground">{selectedSchool.teacherCount}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Users</Label>
                    <p className="text-sm text-muted-foreground">{selectedSchool.userCount}</p>
                  </div>
                </div>
                {selectedSchool.principalName && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Principal</Label>
                      <p className="text-sm text-muted-foreground">{selectedSchool.principalName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Principal Email</Label>
                      <p className="text-sm text-muted-foreground">{selectedSchool.principalEmail}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Principal Phone</Label>
                      <p className="text-sm text-muted-foreground">{selectedSchool.principalPhone}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit School</DialogTitle>
              <DialogDescription>
                Update school information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">School Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-district">District</Label>
                  <Input
                    id="edit-district"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-province">Province</Label>
                  <Select value={formData.province} onValueChange={(value) => setFormData({ ...formData, province: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((province) => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-schoolType">School Type</Label>
                  <Select value={formData.schoolType} onValueChange={(value: 'primary' | 'secondary' | 'combined') => setFormData({ ...formData, schoolType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSchool}>Update School</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the school
                "{selectedSchool?.name}" and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSchool}>
                Delete School
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}