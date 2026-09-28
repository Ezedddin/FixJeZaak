import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/nav';
import { useDeadlineReminders } from '@/hooks/useDeadlineReminders';

export default function TabsLayout() {
  useDeadlineReminders();

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="cases" options={{ title: 'Mijn Zaken' }} />
      <Tabs.Screen name="documents" options={{ title: 'Documenten' }} />
      <Tabs.Screen name="help" options={{ title: 'Hulp' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profiel' }} />
    </Tabs>
  );
}
