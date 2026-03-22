import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BookText, 
  Calendar, 
  ClipboardList, 
  User, 
  Settings,
  X,
  GraduationCap,
  Search,
  Bell,
  Moon,
  ExternalLink
} from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/(app)/teacher' },
    { label: 'My Classes', icon: BookOpen, route: '/(app)/teacher/classes' },
    { label: 'Students', icon: Users, route: '/(app)/teacher/students' },
    { label: 'Gradebook', icon: BookText, route: '/(app)/teacher/gradebook' },
    { label: 'Timetable', icon: Calendar, route: '/(app)/teacher/timetable' },
    { label: 'Attendance', icon: ClipboardList, route: '/(app)/teacher/mark-attendance' },
    { label: 'Profile', icon: User, route: '/(app)/teacher/profile' },
    { label: 'Settings', icon: Settings, route: '/(app)/teacher/settings' },
  ];

  const navigateTo = (route: string) => {
    router.push(route as any);
    props.navigation.closeDrawer();
  };

  const isActive = (route: string) => {
    // Simple check: if pathname is home and route is home, or if pathname starts with route
    if (route === '/(app)/teacher') return pathname === '/teacher' || pathname === '/(app)/teacher';
    return pathname.includes(route.split('/').pop() || '');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Drawer Header matching screenshot */}
      <View className="px-4 py-4 flex-row items-center justify-between border-b border-slate-50">
        <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => props.navigation.closeDrawer()} className="bg-slate-100 p-2 rounded-lg">
                <X size={18} color="#64748b" />
            </TouchableOpacity>
            <View className="bg-indigo-600 p-2 rounded-lg">
                <GraduationCap size={18} color="white" />
            </View>
        </View>
        <View className="flex-row items-center gap-3">
            <Search size={18} color="#64748b" />
            <Bell size={18} color="#64748b" />
            <Moon size={18} color="#64748b" />
            <View className="w-8 h-8 rounded-full bg-slate-100" />
        </View>
      </View>

      <ScrollView className="flex-1 mt-4">
        <View className="px-3 space-y-1">
          {menuItems.map((item, index) => {
            const active = isActive(item.route);
            return (
              <TouchableOpacity
                key={index}
                onPress={() => navigateTo(item.route)}
                className={`flex-row items-center p-3.5 rounded-xl gap-3 ${
                  active ? 'bg-indigo-600 shadow-sm shadow-indigo-200' : 'bg-transparent'
                }`}
              >
                <item.icon size={20} color={active ? 'white' : '#64748b'} />
                <Text
                  className={`font-bold ${
                    active ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Need Help Section */}
      <View className="p-4 border-t border-slate-50">
        <View className="bg-indigo-50 p-4 rounded-2xl">
          <Text className="text-indigo-900 font-bold text-sm">Need Help?</Text>
          <Text className="text-indigo-600 text-[10px] mt-1 mb-4">
            Contact IT Support for system issues.
          </Text>
          <TouchableOpacity className="flex-row items-center gap-1">
             <Text className="text-indigo-600 font-black text-[10px] uppercase">Contact Support</Text>
             <ExternalLink size={10} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
