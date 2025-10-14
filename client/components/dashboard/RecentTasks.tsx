import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin } from 'lucide-react';
import type { Assignment } from '../../../shared/api';

interface RecentTasksProps {
  assignments: Assignment[];
  getPriorityColor: (priority: string) => string;
  getStatusColor: (status: string) => string;
}

export function RecentTasks({ assignments, getPriorityColor, getStatusColor }: RecentTasksProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tasks</CardTitle>
        <CardDescription>
          Latest tasks in your unit
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No recent tasks found
            </p>
          ) : (
            assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{assignment.assignmentNumber}</span>
                    <Badge variant={getPriorityColor(assignment.priority) as any}>
                      {assignment.priority}
                    </Badge>
                    <Badge variant={getStatusColor(assignment.status) as any}>
                      {assignment.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{assignment.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {assignment.location || 'No location'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(assignment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Link to={`/academics/assignments/${assignment.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}