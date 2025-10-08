import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TaskCompletionRateProps {
  stats: {
    totalTasks: number;
    completedTasks: number;
  } | null;
}

export function TaskCompletionRate({ stats }: TaskCompletionRateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Completion Rate</CardTitle>
        <CardDescription>Percentage of tasks successfully completed</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold text-primary">
            {stats?.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
          </div>
          <p className="text-sm text-muted-foreground">
            {stats?.completedTasks || 0} of {stats?.totalTasks || 0} tasks completed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}