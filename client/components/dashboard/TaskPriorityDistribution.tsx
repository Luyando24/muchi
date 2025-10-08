import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface TaskPriorityDistributionProps {
  stats: {
    totalTasks: number;
    highPriorityTasks: number;
    mediumPriorityTasks: number;
    lowPriorityTasks: number;
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
            <span>{stats?.highPriorityTasks || 0}</span>
          </div>
          <Progress
            value={stats?.totalTasks ? (stats.highPriorityTasks / stats.totalTasks) * 100 : 0}
            className="h-2"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Medium Priority</span>
            <span>{stats?.mediumPriorityTasks || 0}</span>
          </div>
          <Progress
            value={stats?.totalTasks ? (stats.mediumPriorityTasks / stats.totalTasks) * 100 : 0}
            className="h-2"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Low Priority</span>
            <span>{stats?.lowPriorityTasks || 0}</span>
          </div>
          <Progress
            value={stats?.totalTasks ? (stats.lowPriorityTasks / stats.totalTasks) * 100 : 0}
            className="h-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}