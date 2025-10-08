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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Plus, Eye, Edit, MapPin, Clock, Users, Car, Calendar as CalendarIcon, Route } from 'lucide-react';
import { format } from 'date-fns';

interface Officer {
  id: string;
  badgeNumber: string;
  firstName: string;
  lastName: string;
  rank: string;
  department: string;
  phone: string;
  email: string;
  status: 'available' | 'on_duty' | 'off_duty' | 'unavailable';
  specializations: string[];
}

interface PatrolRoute {
  id: string;
  name: string;
  description: string;
  area: string;
  coordinates: { lat: number; lng: number }[];
  estimatedDuration: number; // in minutes
  priority: 'low' | 'medium' | 'high';
  requiredOfficers: number;
  vehicleRequired: boolean;
}

interface PatrolAssignment {
  id: string;
  routeId: string;
  routeName: string;
  assignedOfficers: Officer[];
  vehicleId?: string;
  vehiclePlate?: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  notes?: string;
  checkpoints: {
    id: string;
    name: string;
    location: string;
    scheduledTime: string;
    actualTime?: string;
    status: 'pending' | 'completed' | 'missed';
    notes?: string;
  }[];
  incidents?: {
    id: string;
    time: string;
    location: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  createdAt: string;
  updatedAt: string;
}

const PatrolAssignment: React.FC = () => {
  const [assignments, setAssignments] = useState<PatrolAssignment[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [routes, setRoutes] = useState<PatrolRoute[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<PatrolAssignment | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newAssignment, setNewAssignment] = useState<Partial<PatrolAssignment>>({
    routeId: '',
    assignedOfficers: [],
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    status: 'scheduled',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load from localStorage as mock data
      const storedAssignments = localStorage.getItem('patrolAssignments');
      const storedOfficers = localStorage.getItem('patrolOfficers');
      const storedRoutes = localStorage.getItem('patrolRoutes');

      if (storedAssignments) {
        setAssignments(JSON.parse(storedAssignments));
      }

      if (storedOfficers) {
        setOfficers(JSON.parse(storedOfficers));
      } else {
        // Initialize with mock officers
        const mockOfficers: Officer[] = [
          {
            id: 'officer_1',
            badgeNumber: 'SGT-001',
            firstName: 'John',
            lastName: 'Smith',
            rank: 'Sergeant',
            department: 'Military Police',
            phone: '+1234567890',
            email: 'j.smith@zamsa.mil.zm',
            status: 'available',
            specializations: ['Traffic', 'Peacekeeping']
          },
          {
            id: 'officer_2',
            badgeNumber: 'CPL-002',
            firstName: 'Sarah',
            lastName: 'Johnson',
            rank: 'Private First Class',
            department: 'Military Police',
            phone: '+1234567891',
            email: 's.johnson@zamsa.mil.zm',
            status: 'available',
            specializations: ['Military Working Dog', 'Counter-drug Operations']
          },
          {
            id: 'officer_3',
            badgeNumber: 'PFC-003',
            firstName: 'Michael',
            lastName: 'Brown',
            rank: 'Corporal',
            department: 'Military Police',
            phone: '+1234567892',
            email: 'm.brown@zamsa.mil.zm',
            status: 'available',
            specializations: ['Convoy Security', 'Quick Reaction Force']
          }
        ];
        setOfficers(mockOfficers);
        localStorage.setItem('patrolOfficers', JSON.stringify(mockOfficers));
      }

      if (storedRoutes) {
        setRoutes(JSON.parse(storedRoutes));
      } else {
        // Initialize with mock routes
        const mockRoutes: PatrolRoute[] = [
          {
            id: 'route_1',
            name: 'Main Base Sector 1',
            description: 'Primary sector for base security',
            area: 'Sector 1',
            coordinates: [],
            estimatedDuration: 120,
            priority: 'high',
            requiredOfficers: 2,
            vehicleRequired: true
          },
          {
            id: 'route_2',
            name: 'Forward Operating Base Alpha',
            description: 'Forward operating base in the northern sector',
            area: 'FOB Alpha Sector',
            coordinates: [],
            estimatedDuration: 90,
            priority: 'medium',
            requiredOfficers: 1,
            vehicleRequired: true
          },
          {
            id: 'route_3',
            name: 'Perimeter Defense Route',
            description: 'Key defensive positions along the perimeter',
            area: 'Perimeter Sector',
            coordinates: [],
            estimatedDuration: 60,
            priority: 'high',
            requiredOfficers: 1,
            vehicleRequired: false
          }
        ];
        setRoutes(mockRoutes);
        localStorage.setItem('patrolRoutes', JSON.stringify(mockRoutes));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAssignments = (updatedAssignments: PatrolAssignment[]) => {
    localStorage.setItem('patrolAssignments', JSON.stringify(updatedAssignments));
    setAssignments(updatedAssignments);
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.routeId || !newAssignment.startTime || !newAssignment.endTime || newAssignment.assignedOfficers?.length === 0) {
      alert('Please fill in all required fields and assign at least one officer');
      return;
    }

    try {
      setLoading(true);
      const selectedRoute = routes.find(r => r.id === newAssignment.routeId);
      
      const assignment: PatrolAssignment = {
        id: `assignment_${Date.now()}`,
        routeId: newAssignment.routeId!,
        routeName: selectedRoute?.name || 'Unknown Route',
        assignedOfficers: newAssignment.assignedOfficers!,
        startTime: newAssignment.startTime!,
        endTime: newAssignment.endTime!,
        date: newAssignment.date!,
        status: 'scheduled',
        checkpoints: selectedRoute ? generateCheckpoints(selectedRoute) : [],
        incidents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedAssignments = [...assignments, assignment];
      saveAssignments(updatedAssignments);
      
      setIsCreateDialogOpen(false);
      setNewAssignment({
        routeId: '',
        assignedOfficers: [],
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        status: 'scheduled',
      });
    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert('Failed to create assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateCheckpoints = (route: PatrolRoute) => {
    // Generate mock checkpoints based on route
    const checkpoints = [
      { name: 'Start Point', location: `${route.area} - Entry` },
      { name: 'Mid Point', location: `${route.area} - Center` },
      { name: 'End Point', location: `${route.area} - Exit` }
    ];

    return checkpoints.map((cp, index) => ({
      id: `checkpoint_${index}`,
      name: cp.name,
      location: cp.location,
      scheduledTime: '', // Would be calculated based on start time and route duration
      status: 'pending' as const
    }));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.assignedOfficers.some(officer => 
                           `${officer.firstName} ${officer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    const matchesDate = !dateFilter || assignment.date === format(dateFilter, 'yyyy-MM-dd');
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patrol Assignment</h1>
          <p className="text-muted-foreground">Schedule and manage patrol assignments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Patrol Assignment</DialogTitle>
              <DialogDescription>
                Schedule a new patrol assignment with officers and route details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Route Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Route Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="route">Patrol Route *</Label>
                    <Select
                      value={newAssignment.routeId || ''}
                      onValueChange={(value) => setNewAssignment({ ...newAssignment, routeId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a patrol route" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map((route) => (
                          <SelectItem key={route.id} value={route.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{route.name}</span>
                              <Badge className={getPriorityBadgeColor(route.priority)} variant="outline">
                                {route.priority}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newAssignment.routeId && (
                    <div className="p-4 bg-muted rounded-lg">
                      {(() => {
                        const selectedRoute = routes.find(r => r.id === newAssignment.routeId);
                        return selectedRoute ? (
                          <div>
                            <h4 className="font-medium">{selectedRoute.name}</h4>
                            <p className="text-sm text-muted-foreground">{selectedRoute.description}</p>
                            <div className="flex gap-4 mt-2 text-sm">
                              <span>Area: {selectedRoute.area}</span>
                              <span>Duration: {selectedRoute.estimatedDuration} min</span>
                              <span>Required Officers: {selectedRoute.requiredOfficers}</span>
                              <span>Vehicle: {selectedRoute.vehicleRequired ? 'Required' : 'Optional'}</span>
                            </div>
                          </div>
                        ) : null;
                      })()
                      }
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newAssignment.date || ''}
                        onChange={(e) => setNewAssignment({ ...newAssignment, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="startTime">Start Time *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newAssignment.startTime || ''}
                        onChange={(e) => setNewAssignment({ ...newAssignment, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time *</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newAssignment.endTime || ''}
                        onChange={(e) => setNewAssignment({ ...newAssignment, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Officer Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Officer Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Available Officers</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto">
                      {officers.filter(officer => officer.status === 'available').map((officer) => (
                        <div key={officer.id} className="flex items-center space-x-2 p-2 border rounded">
                          <input
                            type="checkbox"
                            id={officer.id}
                            checked={newAssignment.assignedOfficers?.some(o => o.id === officer.id) || false}
                            onChange={(e) => {
                              const currentOfficers = newAssignment.assignedOfficers || [];
                              if (e.target.checked) {
                                setNewAssignment({
                                  ...newAssignment,
                                  assignedOfficers: [...currentOfficers, officer]
                                });
                              } else {
                                setNewAssignment({
                                  ...newAssignment,
                                  assignedOfficers: currentOfficers.filter(o => o.id !== officer.id)
                                });
                              }
                            }}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{officer.firstName[0]}{officer.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {officer.firstName} {officer.lastName} ({officer.badgeNumber})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {officer.rank} - {officer.specializations.join(', ')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {newAssignment.assignedOfficers && newAssignment.assignedOfficers.length > 0 && (
                    <div>
                      <Label>Selected Officers ({newAssignment.assignedOfficers.length})</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newAssignment.assignedOfficers.map((officer) => (
                          <Badge key={officer.id} variant="secondary">
                            {officer.firstName} {officer.lastName} ({officer.badgeNumber})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vehicleId">Vehicle ID (Optional)</Label>
                      <Input
                        id="vehicleId"
                        value={newAssignment.vehicleId || ''}
                        onChange={(e) => setNewAssignment({ ...newAssignment, vehicleId: e.target.value })}
                        placeholder="Enter vehicle ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vehiclePlate">Vehicle Plate (Optional)</Label>
                      <Input
                        id="vehiclePlate"
                        value={newAssignment.vehiclePlate || ''}
                        onChange={(e) => setNewAssignment({ ...newAssignment, vehiclePlate: e.target.value })}
                        placeholder="Enter vehicle plate number"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newAssignment.notes || ''}
                      onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
                      placeholder="Enter any special instructions or notes"
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
              <Button onClick={handleCreateAssignment} disabled={loading}>
                {loading ? 'Creating...' : 'Create Assignment'}
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
                  placeholder="Search assignments by route or officer..."
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
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patrol Assignments ({filteredAssignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading assignments...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No assignments found matching your criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Officers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.routeName}</TableCell>
                    <TableCell>{new Date(assignment.date).toLocaleDateString()}</TableCell>
                    <TableCell>{assignment.startTime} - {assignment.endTime}</TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {assignment.assignedOfficers.slice(0, 3).map((officer) => (
                          <Avatar key={officer.id} className="h-8 w-8 border-2 border-background">
                            <AvatarFallback className="text-xs">
                              {officer.firstName[0]}{officer.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {assignment.assignedOfficers.length > 3 && (
                          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                            +{assignment.assignedOfficers.length - 3}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(assignment.status)}>
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.vehiclePlate ? (
                        <div className="flex items-center">
                          <Car className="h-4 w-4 mr-1" />
                          {assignment.vehiclePlate}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAssignment(assignment);
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

      {/* Assignment Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patrol Assignment Details</DialogTitle>
          </DialogHeader>
          {selectedAssignment && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="checkpoints">Checkpoints</TabsTrigger>
                <TabsTrigger value="incidents">Incidents</TabsTrigger>
                <TabsTrigger value="officers">Officers</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Route</Label>
                    <p className="text-sm text-muted-foreground">{selectedAssignment.routeName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusBadgeColor(selectedAssignment.status)}>
                      {selectedAssignment.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedAssignment.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Time</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedAssignment.startTime} - {selectedAssignment.endTime}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Vehicle</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedAssignment.vehiclePlate || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Officers Assigned</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedAssignment.assignedOfficers.length} officers
                    </p>
                  </div>
                </div>
                {selectedAssignment.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <p className="text-sm text-muted-foreground">{selectedAssignment.notes}</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="checkpoints">
                <div className="space-y-4">
                  {selectedAssignment.checkpoints.map((checkpoint) => (
                    <div key={checkpoint.id} className="flex items-center justify-between p-4 border rounded">
                      <div>
                        <h4 className="font-medium">{checkpoint.name}</h4>
                        <p className="text-sm text-muted-foreground">{checkpoint.location}</p>
                      </div>
                      <Badge className={checkpoint.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                      checkpoint.status === 'missed' ? 'bg-red-100 text-red-800' : 
                                      'bg-gray-100 text-gray-800'}>
                        {checkpoint.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="incidents">
                <div className="text-center py-8 text-muted-foreground">
                  {selectedAssignment.incidents && selectedAssignment.incidents.length > 0 ? (
                    <div>Incidents will be displayed here</div>
                  ) : (
                    <div>No incidents reported for this patrol</div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="officers">
                <div className="space-y-4">
                  {selectedAssignment.assignedOfficers.map((officer) => (
                    <div key={officer.id} className="flex items-center space-x-4 p-4 border rounded">
                      <Avatar>
                        <AvatarFallback>{officer.firstName[0]}{officer.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {officer.firstName} {officer.lastName} ({officer.badgeNumber})
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {officer.rank} - {officer.department}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Specializations: {officer.specializations.join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{officer.phone}</p>
                        <p className="text-sm text-muted-foreground">{officer.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatrolAssignment;