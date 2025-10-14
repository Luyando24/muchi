import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PerformanceMetricsProps {
  stats: {
    openAssignments: number;
    inProgressAssignments: number;
    completedAssignments: number;
    totalAssignments: number;
  } | null;
}

export function PerformanceMetrics({ stats }: PerformanceMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
        <CardDescription>Key performance indicators</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span className="text-sm">Active Tasks</span>
          <span className="font-medium">{(stats?.openAssignments || 0) + (stats?.inProgressAssignments || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Completed This Month</span>
          <span className="font-medium">{stats?.completedAssignments || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Average Response Time</span>
          <span className="font-medium">2.4 hours</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Task Load</span>
          <span className="font-medium">{stats?.totalAssignments || 0}</span>
        </div>
      </CardContent>
    </Card>
  );
}