import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickActions } from './QuickActions';
import { BarChart3, FileText } from "lucide-react";

export default function ClinicSidebar() {
  return (
    <div className="sticky top-[73px] h-[calc(100vh-73px)] w-64 border-r bg-card/50 backdrop-blur">
      <div className="p-4">
        <TabsList className="grid w-full grid-cols-1 gap-2 h-auto bg-transparent">
          <TabsTrigger
            value="overview"
            className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileText className="h-4 w-4" />
            Recent Tasks
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <QuickActions />
        </TabsList>
      </div>
    </div>
  );
}
