import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { User, Client, Project, Position, TimeEntry, CreateTimeEntryInput } from '../../../server/src/schema';

interface TimeTrackingProps {
  currentUser: User | null;
}

export function TimeTracking({ currentUser }: TimeTrackingProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<CreateTimeEntryInput>({
    user_id: currentUser?.id || 0,
    position_id: 0,
    description: null,
    hours: 0,
    date: new Date(),
    billable: true
  });
  
  // Selected hierarchy
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const result = await trpc.getClients.query();
      setClients(result);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  }, []);

  const loadProjects = useCallback(async (clientId: number) => {
    try {
      const result = await trpc.getProjectsByClient.query({ client_id: clientId });
      setProjects(result);
      setPositions([]); // Clear positions when projects change
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, []);

  const loadPositions = useCallback(async (projectId: number) => {
    try {
      const result = await trpc.getPositionsByProject.query({ project_id: projectId });
      setPositions(result);
    } catch (error) {
      console.error('Failed to load positions:', error);
    }
  }, []);

  const loadTimeEntries = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      // Load last 30 days of time entries
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const result = await trpc.getTimeEntriesByUser.query({
        user_id: currentUser.id,
        start_date: startDate,
        end_date: endDate
      });
      setTimeEntries(result);
    } catch (error) {
      console.error('Failed to load time entries:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    loadClients();
    loadTimeEntries();
  }, [loadClients, loadTimeEntries]);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({ ...prev, user_id: currentUser.id }));
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedClientId) {
      loadProjects(selectedClientId);
      setSelectedProjectId(null);
      setFormData(prev => ({ ...prev, position_id: 0 }));
    }
  }, [selectedClientId, loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      loadPositions(selectedProjectId);
      setFormData(prev => ({ ...prev, position_id: 0 }));
    }
  }, [selectedProjectId, loadPositions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const result = await trpc.createTimeEntry.mutate(formData);
      setTimeEntries((prev: TimeEntry[]) => [result, ...prev]);
      
      // Reset form
      setFormData({
        user_id: currentUser.id,
        position_id: 0,
        description: null,
        hours: 0,
        date: new Date(),
        billable: true
      });
      
      // Reset selections
      setSelectedClientId(null);
      setSelectedProjectId(null);
    } catch (error) {
      console.error('Failed to create time entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <Alert>
        <AlertDescription>
          Please wait while we load your profile...
        </AlertDescription>
      </Alert>
    );
  }

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedPosition = positions.find(p => p.id === formData.position_id);
  
  const totalHoursThisWeek = timeEntries
    .filter(entry => {
      const entryDate = new Date(entry.date);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return entryDate >= weekStart;
    })
    .reduce((sum, entry) => sum + entry.hours, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Time Entry Form */}
      <Card className="bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⏰ Log Time Entry
          </CardTitle>
          <CardDescription>
            Track your work hours across clients, projects, and positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={selectedClientId?.toString() || ''}
                onValueChange={(value) => setSelectedClientId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: Client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                      {client.industry && (
                        <span className="text-gray-500 ml-2">({client.industry})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Selection */}
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={selectedProjectId?.toString() || ''}
                onValueChange={(value) => setSelectedProjectId(parseInt(value))}
                disabled={!selectedClientId || projects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedClientId ? "Select a client first..." :
                    projects.length === 0 ? "No projects available" :
                    "Select a project..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project: Project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{project.name}</span>
                        <Badge variant={
                          project.status === 'active' ? 'default' :
                          project.status === 'completed' ? 'secondary' :
                          project.status === 'on_hold' ? 'outline' : 'destructive'
                        }>
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position Selection */}
            <div className="space-y-2">
              <Label>Position</Label>
              <Select
                value={formData.position_id.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, position_id: parseInt(value) }))}
                disabled={!selectedProjectId || positions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedProjectId ? "Select a project first..." :
                    positions.length === 0 ? "No positions available" :
                    "Select a position..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position: Position) => (
                    <SelectItem key={position.id} value={position.id.toString()}>
                      <div>
                        <div className="font-medium">{position.name}</div>
                        {position.hourly_rate && (
                          <div className="text-sm text-gray-500">
                            ${position.hourly_rate}/hr
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Hours and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  value={formData.hours}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="8.0"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({ ...prev, date: new Date(e.target.value) }))
                  }
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData(prev => ({ ...prev, description: e.target.value || null }))
                }
                placeholder="Brief description of work performed..."
                rows={3}
              />
            </div>

            {/* Billable Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="billable"
                checked={formData.billable}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, billable: checked }))
                }
              />
              <Label htmlFor="billable">Billable hours</Label>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || formData.position_id === 0}
              className="w-full"
            >
              {isLoading ? 'Logging Time...' : 'Log Time Entry'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Time Entries & Summary */}
      <div className="space-y-6">
        {/* Quick Summary */}
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 This Week Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Hours:</span>
                <Badge variant="default" className="text-lg px-3 py-1">
                  {totalHoursThisWeek.toFixed(1)}h
                </Badge>
              </div>
              
              {selectedClient && selectedProject && selectedPosition && (
                <div className="p-3 bg-blue-50 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Selected:</div>
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">Client:</span> {selectedClient.name}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Project:</span> {selectedProject.name}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Position:</span> {selectedPosition.name}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Time Entries */}
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🕒 Recent Time Entries
            </CardTitle>
            <CardDescription>
              Last 30 days of logged time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No time entries yet.</p>
                <p className="text-sm">Start by logging your first entry above!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {timeEntries.slice(0, 10).map((entry: TimeEntry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={entry.billable ? 'default' : 'outline'}>
                          {entry.hours}h
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-gray-700 truncate">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        Position ID: {entry.position_id}
                      </div>
                      {!entry.billable && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Non-billable
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}