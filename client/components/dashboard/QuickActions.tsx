import { Link } from 'react-router-dom';
import { TabsTrigger } from '@/components/ui/tabs';
import { FileText, Users, Building, Briefcase, UserCheck } from 'lucide-react';

export function QuickActions() {
  return (
    <>
      <TabsTrigger
        value="manage-tasks"
        className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        asChild
      >
        <Link to="/military/tasks">
          <FileText className="h-4 w-4" />
          Manage Tasks
        </Link>
      </TabsTrigger>
      <TabsTrigger
        value="personnel"
        className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        asChild
      >
        <Link to="/military/personnel">
          <Users className="h-4 w-4" />
          Personnel Directory
        </Link>
      </TabsTrigger>
      <TabsTrigger
        value="units"
        className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        asChild
      >
        <Link to="/military/units">
          <Building className="h-4 w-4" />
          Unit Management
        </Link>
      </TabsTrigger>
      <TabsTrigger
        value="transfers"
        className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        asChild
      >
        <Link to="/military/transfers">
          <Briefcase className="h-4 w-4" />
          Transfers & Postings
        </Link>
      </TabsTrigger>
      <TabsTrigger
        value="promotions"
        className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        asChild
      >
        <Link to="/military/promotions">
          <UserCheck className="h-4 w-4" />
          Ranks & Promotions
        </Link>
      </TabsTrigger>
    </>
  );
}