import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Users, ClipboardList, Settings } from 'lucide-react';

const DashboardNav = () => {
  return (
    <aside className="w-64 bg-background border-r p-4">
      <div className="flex items-center gap-2 mb-8">
        <img src="/images/logo.png" alt="ZamPortal Logo" className="h-10 w-auto" />
        <span className="text-2xl font-bold">ZamPortal</span>
      </div>
      <nav className="flex flex-col gap-2">
        <Link to="/clinic" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
          <Home className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>
        <Link to="/clinic/patients" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
          <Users className="h-5 w-5" />
          <span>Patients</span>
        </Link>
        <Link to="/clinic/tests" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
          <ClipboardList className="h-5 w-5" />
          <span>Tests</span>
        </Link>
        <Link to="/clinic/settings" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>
      </nav>
    </aside>
  );
};

export default DashboardNav;