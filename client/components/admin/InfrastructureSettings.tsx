import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Cpu, 
  Activity, 
  HardDrive, 
  Globe, 
  Server, 
  Terminal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: string;
}

interface NodeStatus {
  name: string;
  region: string;
  cpu: number;
  memory: number;
  disk: number;
  status: 'Operational' | 'Degraded' | 'Down';
}

interface InfrastructureData {
  metrics: SystemMetrics;
  nodes: NodeStatus[];
}

export default function InfrastructureSettings() {
  const [data, setData] = useState<InfrastructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch('/api/admin/infrastructure', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch infrastructure data');
      }

      const result = await response.json();
      setData(result);
      
      toast({
        title: "System status updated",
        description: "Infrastructure metrics have been refreshed.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching data",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const metrics = data?.metrics || { cpu: 0, memory: 0, disk: 0, network: '0 B/s' };
  const nodes = data?.nodes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Infrastructure Status</h2>
          <p className="text-slate-600 dark:text-slate-400">Monitor server performance and resource utilization.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cpu}%</div>
            <Progress value={metrics.cpu} className="h-2 mt-2" />
            <p className="text-xs text-slate-500 mt-2">
              Across all nodes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.memory}%</div>
            <Progress value={metrics.memory} className="h-2 mt-2" />
            <p className="text-xs text-slate-500 mt-2">
              Stable over last 24h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.disk}%</div>
            <Progress value={metrics.disk} className="h-2 mt-2" />
            <p className="text-xs text-slate-500 mt-2">
              System storage capacity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network I/O</CardTitle>
            <Globe className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.network}</div>
            <p className="text-xs text-slate-500 mt-2">
              Current throughput
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Node Status</CardTitle>
          <CardDescription>Health status of all system nodes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Disk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-slate-400" />
                      {node.name}
                    </div>
                  </TableCell>
                  <TableCell>{node.region}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-right text-xs">{node.cpu}%</span>
                      <Progress value={node.cpu} className="h-2 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-right text-xs">{node.memory}%</span>
                      <Progress value={node.memory} className="h-2 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-right text-xs">{node.disk}%</span>
                      <Progress value={node.disk} className="h-2 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      node.status === 'Operational' ? 'bg-green-50 text-green-700 border-green-200' :
                      node.status === 'Degraded' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }>
                      {node.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Terminal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
