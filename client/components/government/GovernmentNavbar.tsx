import React, { useState, useEffect } from 'react';
import { Menu, X, LogOut, Settings, ChevronDown, GraduationCap, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { supabase } from '@/lib/supabase';
import { OfflineIndicator } from '@/components/navigation/OfflineIndicator';

interface GovernmentNavbarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  userProfile: any;
}

export default function GovernmentNavbar({
  isSidebarOpen,
  setIsSidebarOpen,
  activeTab,
  setActiveTab,
  onLogout,
  userProfile
}: GovernmentNavbarProps) {
  
  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'overview': return 'National Overview';
      case 'performance': return 'Academic Performance';
      case 'feeding': return 'National Feeding';
      case 'settings': return 'Portal Settings';
      default: return 'Overview';
    }
  };

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 overflow-hidden">
      <div className="px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo and Ministry Name */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                  Ministry of Education
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider line-clamp-1 max-w-[120px] sm:max-w-none">
                  National Portal
                </p>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="hidden md:flex items-center text-sm text-slate-500 ml-4 border-l pl-4 border-slate-200 dark:border-slate-700">
              <span className="font-medium text-slate-900 dark:text-white capitalize">{getPageTitle(activeTab)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-4 ml-auto">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 mr-2">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Live</span>
            </div>
            
            <div className="hidden sm:block">
              <OfflineIndicator />
            </div>
            
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={""} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold uppercase">
                      {userProfile?.full_name?.substring(0, 2) || 'MO'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">
                      {userProfile?.full_name || 'Official'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider text-[10px] font-bold">
                      {userProfile?.role?.replace('_', ' ') || 'Government'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab('settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Portal Settings</span>
                </DropdownMenuItem>

                {userProfile?.role === 'school_admin' || userProfile?.secondary_role === 'school_admin' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold"
                      onClick={() => {
                        window.location.href = '/school-admin';
                      }}
                    >
                      <GraduationCap className="mr-2 h-4 w-4" />
                      <span>Switch to Admin Portal</span>
                    </DropdownMenuItem>
                  </>
                ) : null}

                <div className="sm:hidden px-2 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm">
                  <div className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span className="text-sm">Dark Mode</span>
                  </div>
                  <ThemeToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}