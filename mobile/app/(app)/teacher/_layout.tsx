import React from 'react';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '../../../components/teacher/CustomDrawerContent';

export default function TeacherRootLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: '80%',
        },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: 'Main',
        }}
      />
      {/* External routes that might be in the drawer but not tabs */}
      <Drawer.Screen
        name="assignments"
        options={{
          drawerItemStyle: { display: 'none' } // Hidden from direct list, managed by custom content
        }}
      />
      <Drawer.Screen
        name="[id]"
        options={{
          drawerItemStyle: { display: 'none' }
        }}
      />
    </Drawer>
  );
}
