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
import { Search, Plus, Eye, Edit, FileText, Calendar, User, MapPin } from 'lucide-react';
import { Api } from '@/lib/api';
import type { CreateMissionRequest, ListMissionsResponse } from '@shared/api';

interface Mission {
  id: string;
  missionID: string;
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedPersonnel: string;
  missionDate: string;
  location: string;
  operationId?: string;
  unitId: string;
}

const MissionBriefing: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newMission, setNewMission] = useState<Partial<CreateMissionRequest>>({
    title: '',
    description: '',
    priority: 'medium',
    location: '',
    residentId: '',
  });

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      setLoading(true);
      const response: ListMissionsResponse = await Api.listMissions();
      setMissions(response.missions || []);
    } catch (error) {
      console.error('Failed to load missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMission = async () => {
    if (!newMission.title || !newMission.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await Api.createMission(newMission as CreateMissionRequest);
      setIsCreateDialogOpen(false);
      setNewMission({
        title: '',
        description: '',
        priority: 'medium',
        location: '',
        residentId: '',
      });
      await loadMissions();
    } catch (error) {
      console.error('Failed to create mission:', error);
      alert('Failed to create mission. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'investigating': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMissions = missions.filter(mission => {
    const matchesSearch = mission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           mission.missionID.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           mission.assignedPersonnel.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || mission.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || mission.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Briefing</h1>
          <p className="text-muted-foreground">Manage and track missions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Mission
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Mission</DialogTitle>
              <DialogDescription>
                  Fill in the details to create a new mission.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Mission Title *</Label>
                <Input
                  id="title"
                  value={newMission.title}
                  onChange={(e) => setNewMission({ ...newMission, title: e.target.value })}
                  placeholder="Enter mission title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newMission.description || ''}
                  onChange={(e) => setNewMission({ ...newMission, description: e.target.value })}
                  placeholder="Enter mission description"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newMission.priority || 'medium'}
                    onValueChange={(value) => setNewMission({ ...newMission, priority: value as 'low' | 'medium' | 'high' | 'urgent' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newMission.location || ''}
                    onChange={(e) => setNewMission({ ...newMission, location: e.target.value })}
                    placeholder="Enter location"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignedPersonnel">Assigned Personnel</Label>
                <Input
                  id="assignedPersonnel"
                  value={newMission.assignedPersonnel || ''}
                  onChange={(e) => setNewMission({ ...newMission, assignedPersonnel: e.target.value })}
                  placeholder="Enter assigned personnel"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMission} disabled={loading}>
                {loading ? 'Creating...' : 'Create Mission'}
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
                  placeholder="Search missions..."
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
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
          <CardTitle>Missions ({filteredMissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading missions...</div>
          )} : filteredMissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No missions found matching your criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mission #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned Personnel</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMissions.map((mission) => (
                  <TableRow key={mission.id}>
                    <TableCell className="font-medium">{mission.missionID}</TableCell>
                    <TableCell>{mission.title}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(mission.status)}>
                        {mission.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityBadgeColor(mission.priority)}>
                        {mission.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{mission.assignedPersonnel}</TableCell>
                    <TableCell>{new Date(mission.missionDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMission(mission);
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

      {/* Case Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Mission Details</DialogTitle>
          </DialogHeader>
          {selectedMission && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Mission ID</Label>
                    <p className="text-sm text-muted-foreground">{selectedMission.missionID}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusBadgeColor(selectedMission.status)}>
                      {selectedMission.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <Badge className={getPriorityBadgeColor(selectedMission.priority)}>
                      {selectedMission.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Assigned Personnel</Label>
                    <p className="text-sm text-muted-foreground">{selectedMission.assignedPersonnel}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Location</Label>
                    <p className="text-sm text-muted-foreground">{selectedMission.location}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Reported Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedMission.missionDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedMission.description}</p>
                </div>
              </TabsContent>
              <TabsContent value="timeline">
                <div className="text-center py-8 text-muted-foreground">
                  Timeline feature coming soon...
                </div>
              </TabsContent>
              <TabsContent value="evidence">
                <div className="text-center py-8 text-muted-foreground">
                  Evidence management feature coming soon...
                </div>
              </TabsContent>
              <TabsContent value="notes">
                <div className="text-center py-8 text-muted-foreground">
                  Notes feature coming soon...
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MissionBriefing;