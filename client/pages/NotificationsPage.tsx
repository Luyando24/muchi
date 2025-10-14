import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useToast } from '../hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle,
  Activity,
  Send,
  Users,
  School,
  Bell,
  AlertTriangle,
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  read: boolean;
}

interface School {
  id: string;
  name: string;
  code: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  subscriptionPlan: string;
}

interface NotificationFormData {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  targetType: 'all' | 'specific' | 'global';
  selectedSchools: string[];
  expiryDate?: string;
  actionUrl?: string;
  actionText?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    category: 'general',
    targetType: 'all',
    selectedSchools: [],
    expiryDate: '',
    actionUrl: '',
    actionText: '',
  });

  useEffect(() => {
    fetchNotifications();
    fetchSchools();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications');
      const data = await response.json();
      
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/schools');
      const data = await response.json();
      setSchools(data.filter((school: School) => school.status === 'active'));
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schools',
        variant: 'destructive',
      });
    }
  };

  const handleCreateNotification = async () => {
    try {
      setIsCreating(true);
      
      const payload = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        priority: formData.priority,
        category: formData.category,
        is_global: formData.targetType === 'global',
        expiry_date: formData.expiryDate || null,
        action_url: formData.actionUrl || null,
        action_text: formData.actionText || null,
        school_ids: formData.targetType === 'specific' ? formData.selectedSchools : [],
      };

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      const newNotification = await response.json();
      setNotifications([newNotification, ...notifications]);
      setIsCreateDialogOpen(false);
      resetForm();
      
      toast({
        title: 'Success',
        description: `Notification sent to ${
          formData.targetType === 'global' 
            ? 'all users' 
            : formData.targetType === 'all' 
            ? 'all schools' 
            : `${formData.selectedSchools.length} selected schools`
        }`,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to create notification',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      priority: 'medium',
      category: 'general',
      targetType: 'all',
      selectedSchools: [],
      expiryDate: '',
      actionUrl: '',
      actionText: '',
    });
  };

  const handleSchoolSelection = (schoolId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        selectedSchools: [...prev.selectedSchools, schoolId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedSchools: prev.selectedSchools.filter(id => id !== schoolId)
      }));
    }
  };

  const selectAllSchools = () => {
    setFormData(prev => ({
      ...prev,
      selectedSchools: schools.map(school => school.id)
    }));
  };

  const deselectAllSchools = () => {
    setFormData(prev => ({
      ...prev,
      selectedSchools: []
    }));
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      });
      
      setNotifications(notifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      ));
      
      toast({
        title: 'Success',
        description: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      
      setNotifications(notifications.filter(notification => notification.id !== id));
      
      toast({
        title: 'Success',
        description: 'Notification deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (type) {
      case 'info':
        return 'secondary';
      case 'warning':
        return 'secondary';
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string): "destructive" | "secondary" | "outline" => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;
    
    return matchesSearch && matchesType && matchesPriority;
  });

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          <div className="flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                System notifications and alerts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Notification Management</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Notification
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Notification</DialogTitle>
                  <DialogDescription>
                    Send notifications to schools and users on the platform
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter notification title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Enter notification message"
                      rows={4}
                    />
                  </div>

                  {/* Type and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: 'info' | 'warning' | 'success' | 'error') => 
                          setFormData(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                          setFormData(prev => ({ ...prev, priority: value }))
                        }
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., system, subscription, maintenance"
                    />
                  </div>

                  {/* Target Selection */}
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select
                      value={formData.targetType}
                      onValueChange={(value: 'all' | 'specific' | 'global') => 
                        setFormData(prev => ({ ...prev, targetType: value, selectedSchools: [] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Schools</SelectItem>
                        <SelectItem value="specific">Specific Schools</SelectItem>
                        <SelectItem value="global">Global (All Users)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* School Selection */}
                  {formData.targetType === 'specific' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Select Schools ({formData.selectedSchools.length} selected)</Label>
                        <div className="space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectAllSchools}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={deselectAllSchools}
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                        {schools.map((school) => (
                          <div key={school.id} className="flex items-center space-x-2 py-2">
                            <Checkbox
                              id={school.id}
                              checked={formData.selectedSchools.includes(school.id)}
                              onCheckedChange={(checked) => 
                                handleSchoolSelection(school.id, checked as boolean)
                              }
                            />
                            <Label htmlFor={school.id} className="flex-1 cursor-pointer">
                              <div>
                                <div className="font-medium">{school.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {school.code} • {school.subscriptionPlan}
                                </div>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional Fields */}
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                    <Input
                      id="expiryDate"
                      type="datetime-local"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="actionUrl">Action URL (Optional)</Label>
                      <Input
                        id="actionUrl"
                        value={formData.actionUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, actionUrl: e.target.value }))}
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="actionText">Action Button Text</Label>
                      <Input
                        id="actionText"
                        value={formData.actionText}
                        onChange={(e) => setFormData(prev => ({ ...prev, actionText: e.target.value }))}
                        placeholder="Learn More"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateNotification}
                    disabled={!formData.title || !formData.message || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Notification
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Notifications</CardTitle>
              <CardDescription>
                View and manage system notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading notifications...</p>
                </div>
              ) : (
                <>
                  {filteredNotifications.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNotifications.map((notification) => (
                          <TableRow key={notification.id} className={notification.read ? '' : 'bg-muted/30'}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTypeIcon(notification.type)}
                                <Badge variant={getTypeBadgeVariant(notification.type)}>
                                  {notification.type}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{notification.title}</div>
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {notification.message}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPriorityBadgeVariant(notification.priority)}>
                                {notification.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(notification.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {notification.read ? (
                                <Badge variant="outline">Read</Badge>
                              ) : (
                                <Badge>Unread</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {!notification.read && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="mt-4">No notifications found</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
  );
}