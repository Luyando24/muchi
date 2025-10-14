import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface TaskPriorityDistributionProps {
  stats: {
    totalAssignments: number;
    highPriorityAssignments: number;
    mediumPriorityAssignments: number;
    lowPriorityAssignments: number;
  } | null;
}

export function TaskPriorityDistribution({ stats }: TaskPriorityDistributionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Priority Distribution</CardTitle>
        <CardDescription>Breakdown of tasks by priority level</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>High Priority</span>
            <span>{stats?.highPriorityAssignments || 0}</span>
          </div>
          <Progress
            value={stats?.totalAssignments ? (stats.highPriorityAssignments / stats.totalAssignments) * 100 : 0}
            className="h-2"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Medium Priority</span>
            <span>{stats?.mediumPriorityAssignments || 0}</span>
          </div>
          <Progress
            value={stats?.totalAssignments ? (stats.mediumPriorityAssignments / stats.totalAssignments) * 100 : 0}
            className="h-2"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Low Priority</span>
            <span>{stats?.lowPriorityAssignments || 0}</span>
          </div>
          <Progress
            value={stats?.totalAssignments ? (stats.lowPriorityAssignments / stats.totalAssignments) * 100 : 0}
            className="h-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}