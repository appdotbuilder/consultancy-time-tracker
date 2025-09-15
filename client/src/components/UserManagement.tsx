import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput } from '../../../server/src/schema';

interface UserManagementProps {
  users: User[];
  onUsersChange: (users: User[]) => void;
}

export function UserManagement({ users, onUsersChange }: UserManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    name: '',
    role: 'consultant',
    hourly_rate: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await trpc.createUser.mutate(formData);
      onUsersChange([result, ...users]);
      
      // Reset form
      setFormData({
        email: '',
        name: '',
        role: 'consultant',
        hourly_rate: null
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'default';
      case 'project_manager':
        return 'secondary';
      case 'consultant':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'administrator':
        return '👑';
      case 'project_manager':
        return '📋';
      case 'consultant':
        return '💼';
      default:
        return '👤';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'Full system access and user management';
      case 'project_manager':
        return 'Project oversight and team coordination';
      case 'consultant':
        return 'Time tracking and project collaboration';
      default:
        return 'Standard user access';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">👥 Team Management</h2>
        <p className="text-gray-600">Manage consultants, project managers, and administrators</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create New User */}
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ➕ Add New Team Member
            </CardTitle>
            <CardDescription>
              Create accounts for consultants, project managers, and administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="john.doe@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role || 'consultant'}
                  onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, role: value as 'consultant' | 'project_manager' | 'administrator' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultant">
                      <div className="flex items-center gap-2">
                        💼 <span>Consultant</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="project_manager">
                      <div className="flex items-center gap-2">
                        📋 <span>Project Manager</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="administrator">
                      <div className="flex items-center gap-2">
                        👑 <span>Administrator</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate (Optional)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || null }))
                  }
                  placeholder="85.00"
                />
                <p className="text-xs text-gray-500">
                  Used for billing calculations and revenue reporting
                </p>
              </div>

              <Separator />

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getRoleIcon(formData.role)}
                  <span className="font-medium">
                    {formData.role.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {getRoleDescription(formData.role)}
                </p>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Creating User...' : 'Create Team Member'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Current Team Members */}
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              👥 Current Team ({users.length})
            </CardTitle>
            <CardDescription>
              Overview of all team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🚀</div>
                <p className="text-gray-500 mb-2">No team members yet!</p>
                <p className="text-sm text-gray-400">
                  Create your first team member to get started with the platform.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {users.map((user: User) => (
                  <div key={user.id} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Member since: {user.created_at.toLocaleDateString()}
                      </div>
                      {user.hourly_rate && (
                        <div className="text-sm font-medium text-green-600">
                          ${user.hourly_rate}/hour
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      {getRoleDescription(user.role)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Statistics */}
      {users.length > 0 && (
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Team Statistics
            </CardTitle>
            <CardDescription>
              Overview of team composition and metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Role Distribution */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Role Distribution</h3>
                {['administrator', 'project_manager', 'consultant'].map((role) => {
                  const count = users.filter(user => user.role === role).length;
                  const percentage = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
                  
                  return (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        <span className="text-sm">
                          {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{count}</span>
                        <Badge variant="outline" className="text-xs">
                          {percentage}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rate Statistics */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Billing Rates</h3>
                {(() => {
                  const usersWithRates = users.filter(user => user.hourly_rate);
                  const rates = usersWithRates.map(user => user.hourly_rate!);
                  const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
                  const minRate = rates.length > 0 ? Math.min(...rates) : 0;
                  const maxRate = rates.length > 0 ? Math.max(...rates) : 0;

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Team members with rates:</span>
                        <span className="text-sm font-medium">
                          {usersWithRates.length}/{users.length}
                        </span>
                      </div>
                      {usersWithRates.length > 0 && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Average rate:</span>
                            <span className="text-sm font-medium text-green-600">
                              ${avgRate.toFixed(2)}/hr
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Rate range:</span>
                            <span className="text-sm font-medium">
                              ${minRate} - ${maxRate}
                            </span>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Recent Activity */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Recent Activity</h3>
                {(() => {
                  const recentUsers = users
                    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
                    .slice(0, 3);

                  return recentUsers.map((user: User) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className="text-sm truncate max-w-32">{user.name}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.created_at.toLocaleDateString()}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertDescription>
          <strong>💡 Pro Tip:</strong> Different roles have different capabilities in the system. 
          Administrators can manage all aspects, Project Managers can oversee projects and teams, 
          while Consultants focus on time tracking and their assigned work.
        </AlertDescription>
      </Alert>
    </div>
  );
}