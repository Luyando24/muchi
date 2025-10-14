import { Link } from 'react-router-dom';
import { TabsTrigger } from '@/components/ui/tabs';
import { FileText, Users, Building, BookOpen, UserCheck } from 'lucide-react';

export function QuickActions() {
  return (
    <>
      <TabsTrigger
        value="manage-students"
        className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        asChild
      >
        <Link to="/students">
          <Users className="h-4 w-4" />
          Student Management
        </Link>
      </TabsTrigger>
      <TabsTrigger
        value="academic"
        className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        asChild
      >
        <Link to="/academic">
          <BookOpen className="h-4 w-4" />
          Academic Management
        </Link>
      </TabsTrigger>
      <TabsTrigger
        value="attendance"
        className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        asChild
      >
        <Link to="/attendance">
          <UserCheck className="h-4 w-4" />
          Attendance Tracking
        </Link>
      </TabsTrigger>
      <TabsTrigger
        value="finance"
        className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        asChild
      >
        <Link to="/finance">
          <FileText className="h-4 w-4" />
          Finance Management
        </Link>
      </TabsTrigger>
      <TabsTrigger
        value="parent-portal"
        className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        asChild
      >
        <Link to="/parent-portal">
          <Building className="h-4 w-4" />
          Parent Portal
        </Link>
      </TabsTrigger>
    </>
  );
}