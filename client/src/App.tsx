import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { ClientManagement } from '@/components/ClientManagement';
import { TimeTracking } from '@/components/TimeTracking';
import { ReportingDashboard } from '@/components/ReportingDashboard';
import { UserManagement } from '@/components/UserManagement';
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
      // Set first user as current user for demo purposes
      if (result.length > 0) {
        setCurrentUser(result[0]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                ⏱️ TimeTracker Pro
              </h1>
              <p className="text-gray-600">
                Professional time tracking for IT consultancies
              </p>
            </div>
            {currentUser && (
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    👋 Welcome back, {currentUser.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Badge variant={
                      currentUser.role === 'administrator' ? 'default' :
                      currentUser.role === 'project_manager' ? 'secondary' : 'outline'
                    }>
                      {currentUser.role.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {currentUser.hourly_rate && (
                      <span className="text-sm text-gray-500">
                        ${currentUser.hourly_rate}/hr
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="time-tracking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="time-tracking" className="flex items-center gap-2">
              ⏰ Time Tracking
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              🏢 Clients & CRM
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              📊 Reports
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              👥 Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="time-tracking" className="space-y-6">
            <TimeTracking currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <ClientManagement currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ReportingDashboard users={users} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement users={users} onUsersChange={setUsers} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;