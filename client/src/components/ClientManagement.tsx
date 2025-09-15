import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { 
  User, Client, Contact, Project, Position, ClientNote, ActivityLog,
  CreateClientInput, CreateContactInput, CreateProjectInput, CreatePositionInput,
  CreateClientNoteInput, CreateActivityLogInput
} from '../../../server/src/schema';

interface ClientManagementProps {
  currentUser: User | null;
}

export function ClientManagement({ currentUser }: ClientManagementProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Form states
  const [clientForm, setClientForm] = useState<CreateClientInput>({
    name: '',
    address: null,
    industry: null
  });

  const [contactForm, setContactForm] = useState<CreateContactInput>({
    client_id: 0,
    name: '',
    email: null,
    phone: null
  });

  const [projectForm, setProjectForm] = useState<CreateProjectInput>({
    client_id: 0,
    name: '',
    description: null,
    budget: null,
    status: 'active',
    start_date: null,
    end_date: null
  });

  const [positionForm, setPositionForm] = useState<CreatePositionInput>({
    project_id: 0,
    name: '',
    description: null,
    budget: null,
    hourly_rate: null
  });

  const [noteForm, setNoteForm] = useState<CreateClientNoteInput>({
    client_id: 0,
    user_id: currentUser?.id || 0,
    note: ''
  });

  const [activityForm, setActivityForm] = useState<CreateActivityLogInput>({
    client_id: 0,
    user_id: currentUser?.id || 0,
    activity_type: 'meeting',
    description: '',
    activity_date: new Date()
  });

  const loadClients = useCallback(async () => {
    try {
      const result = await trpc.getClients.query();
      setClients(result);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  }, []);

  const loadClientData = useCallback(async (client: Client) => {
    if (!client) return;
    
    try {
      const [contactsData, projectsData, notesData, logsData] = await Promise.all([
        trpc.getContactsByClient.query({ client_id: client.id }),
        trpc.getProjectsByClient.query({ client_id: client.id }),
        trpc.getClientNotes.query({ client_id: client.id }),
        trpc.getActivityLogs.query({ client_id: client.id })
      ]);
      
      setContacts(contactsData);
      setProjects(projectsData);
      setClientNotes(notesData);
      setActivityLogs(logsData);
    } catch (error) {
      console.error('Failed to load client data:', error);
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

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (selectedClient) {
      loadClientData(selectedClient);
    }
  }, [selectedClient, loadClientData]);

  useEffect(() => {
    if (selectedProjectId) {
      loadPositions(selectedProjectId);
    }
  }, [selectedProjectId, loadPositions]);

  useEffect(() => {
    if (currentUser) {
      setNoteForm(prev => ({ ...prev, user_id: currentUser.id }));
      setActivityForm(prev => ({ ...prev, user_id: currentUser.id }));
    }
  }, [currentUser]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await trpc.createClient.mutate(clientForm);
      setClients(prev => [result, ...prev]);
      setClientForm({ name: '', address: null, industry: null });
    } catch (error) {
      console.error('Failed to create client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    
    setIsLoading(true);
    try {
      const contactData = { ...contactForm, client_id: selectedClient.id };
      const result = await trpc.createContact.mutate(contactData);
      setContacts(prev => [result, ...prev]);
      setContactForm({
        client_id: selectedClient.id,
        name: '',
        email: null,
        phone: null
      });
    } catch (error) {
      console.error('Failed to create contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    
    setIsLoading(true);
    try {
      const projectData = { ...projectForm, client_id: selectedClient.id };
      const result = await trpc.createProject.mutate(projectData);
      setProjects(prev => [result, ...prev]);
      setProjectForm({
        client_id: selectedClient.id,
        name: '',
        description: null,
        budget: null,
        status: 'active',
        start_date: null,
        end_date: null
      });
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    
    setIsLoading(true);
    try {
      const positionData = { ...positionForm, project_id: selectedProjectId };
      const result = await trpc.createPosition.mutate(positionData);
      setPositions(prev => [result, ...prev]);
      setPositionForm({
        project_id: selectedProjectId,
        name: '',
        description: null,
        budget: null,
        hourly_rate: null
      });
    } catch (error) {
      console.error('Failed to create position:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !currentUser) return;
    
    setIsLoading(true);
    try {
      const noteData = {
        ...noteForm,
        client_id: selectedClient.id,
        user_id: currentUser.id
      };
      const result = await trpc.createClientNote.mutate(noteData);
      setClientNotes(prev => [result, ...prev]);
      setNoteForm({
        client_id: selectedClient.id,
        user_id: currentUser.id,
        note: ''
      });
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !currentUser) return;
    
    setIsLoading(true);
    try {
      const activityData = {
        ...activityForm,
        client_id: selectedClient.id,
        user_id: currentUser.id
      };
      const result = await trpc.createActivityLog.mutate(activityData);
      setActivityLogs(prev => [result, ...prev]);
      setActivityForm({
        client_id: selectedClient.id,
        user_id: currentUser.id,
        activity_type: 'meeting',
        description: '',
        activity_date: new Date()
      });
    } catch (error) {
      console.error('Failed to create activity log:', error);
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

  return (
    <div className="grid gap-6">
      {/* Client Selection and Creation */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏢 Client Management
            </CardTitle>
            <CardDescription>
              Manage your client portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name *</Label>
                <Input
                  id="client-name"
                  value={clientForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setClientForm(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-industry">Industry</Label>
                <Input
                  id="client-industry"
                  value={clientForm.industry || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setClientForm(prev => ({ ...prev, industry: e.target.value || null }))
                  }
                  placeholder="Technology, Healthcare, Finance..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-address">Address</Label>
                <Textarea
                  id="client-address"
                  value={clientForm.address || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setClientForm(prev => ({ ...prev, address: e.target.value || null }))
                  }
                  placeholder="123 Business St, City, State 12345"
                  rows={3}
                />
              </div>
              
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Creating...' : 'Create Client'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Select Client
            </CardTitle>
            <CardDescription>
              Choose a client to manage details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No clients yet.</p>
                <p className="text-sm">Create your first client to get started!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {clients.map((client: Client) => (
                  <div
                    key={client.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedClient?.id === client.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{client.name}</h3>
                        {client.industry && (
                          <Badge variant="outline" className="mt-1">
                            {client.industry}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {client.created_at.toLocaleDateString()}
                      </div>
                    </div>
                    {client.address && (
                      <p className="text-sm text-gray-600 mt-2 truncate">
                        📍 {client.address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client Details */}
      {selectedClient && (
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔍 Client Details: {selectedClient.name}
            </CardTitle>
            <CardDescription>
              Manage contacts, projects, positions, and CRM activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="contacts" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="contacts">👥 Contacts</TabsTrigger>
                <TabsTrigger value="projects">📁 Projects</TabsTrigger>
                <TabsTrigger value="positions">💼 Positions</TabsTrigger>
                <TabsTrigger value="notes">📝 Notes</TabsTrigger>
                <TabsTrigger value="activities">📞 Activities</TabsTrigger>
              </TabsList>

              <TabsContent value="contacts" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Add New Contact</h3>
                    <form onSubmit={handleCreateContact} className="space-y-3">
                      <Input
                        value={contactForm.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setContactForm(prev => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Contact name"
                        required
                      />
                      <Input
                        type="email"
                        value={contactForm.email || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setContactForm(prev => ({ ...prev, email: e.target.value || null }))
                        }
                        placeholder="email@example.com"
                      />
                      <Input
                        type="tel"
                        value={contactForm.phone || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setContactForm(prev => ({ ...prev, phone: e.target.value || null }))
                        }
                        placeholder="(555) 123-4567"
                      />
                      <Button type="submit" disabled={isLoading}>
                        Add Contact
                      </Button>
                    </form>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Current Contacts</h3>
                    {contacts.length === 0 ? (
                      <p className="text-gray-500 text-sm">No contacts yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {contacts.map((contact: Contact) => (
                          <div key={contact.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium">{contact.name}</div>
                            {contact.email && (
                              <div className="text-sm text-gray-600">✉️ {contact.email}</div>
                            )}
                            {contact.phone && (
                              <div className="text-sm text-gray-600">📱 {contact.phone}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="projects" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Create New Project</h3>
                    <form onSubmit={handleCreateProject} className="space-y-3">
                      <Input
                        value={projectForm.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProjectForm(prev => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Project name"
                        required
                      />
                      <Textarea
                        value={projectForm.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setProjectForm(prev => ({ ...prev, description: e.target.value || null }))
                        }
                        placeholder="Project description"
                        rows={2}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={projectForm.budget || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setProjectForm(prev => ({ ...prev, budget: parseFloat(e.target.value) || null }))
                          }
                          placeholder="Budget ($)"
                        />
                        <Select
                          value={projectForm.status || 'active'}
                          onValueChange={(value) =>
                            setProjectForm(prev => ({ ...prev, status: value as 'active' | 'completed' | 'on_hold' | 'cancelled' }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" disabled={isLoading}>
                        Create Project
                      </Button>
                    </form>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Current Projects</h3>
                    {projects.length === 0 ? (
                      <p className="text-gray-500 text-sm">No projects yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {projects.map((project: Project) => (
                          <div
                            key={project.id}
                            className={`p-3 bg-gray-50 rounded-lg cursor-pointer transition-colors ${
                              selectedProjectId === project.id ? 'bg-blue-100 border-blue-300' : ''
                            }`}
                            onClick={() => setSelectedProjectId(
                              selectedProjectId === project.id ? null : project.id
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{project.name}</div>
                              <Badge variant={
                                project.status === 'active' ? 'default' :
                                project.status === 'completed' ? 'secondary' :
                                project.status === 'on_hold' ? 'outline' : 'destructive'
                              }>
                                {project.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            {project.description && (
                              <div className="text-sm text-gray-600 mt-1 truncate">
                                {project.description}
                              </div>
                            )}
                            {project.budget && (
                              <div className="text-sm text-green-600 mt-1">
                                Budget: ${project.budget.toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="positions" className="space-y-4">
                {selectedProjectId ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Create New Position</h3>
                      <form onSubmit={handleCreatePosition} className="space-y-3">
                        <Input
                          value={positionForm.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPositionForm(prev => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="Position name (e.g., Senior Developer)"
                          required
                        />
                        <Textarea
                          value={positionForm.description || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setPositionForm(prev => ({ ...prev, description: e.target.value || null }))
                          }
                          placeholder="Position description"
                          rows={2}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={positionForm.budget || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPositionForm(prev => ({ ...prev, budget: parseFloat(e.target.value) || null }))
                            }
                            placeholder="Budget ($)"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={positionForm.hourly_rate || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setPositionForm(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || null }))
                            }
                            placeholder="Hourly rate ($)"
                          />
                        </div>
                        <Button type="submit" disabled={isLoading}>
                          Create Position
                        </Button>
                      </form>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-3">Current Positions</h3>
                      {positions.length === 0 ? (
                        <p className="text-gray-500 text-sm">No positions yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {positions.map((position: Position) => (
                            <div key={position.id} className="p-3 bg-gray-50 rounded-lg">
                              <div className="font-medium">{position.name}</div>
                              {position.description && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {position.description}
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                {position.hourly_rate && (
                                  <Badge variant="outline">
                                    ${position.hourly_rate}/hr
                                  </Badge>
                                )}
                                {position.budget && (
                                  <div className="text-sm text-green-600">
                                    Budget: ${position.budget.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Select a project from the Projects tab to manage its positions.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Add Note</h3>
                    <form onSubmit={handleCreateNote} className="space-y-3">
                      <Textarea
                        value={noteForm.note}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setNoteForm(prev => ({ ...prev, note: e.target.value }))
                        }
                        placeholder="Add a note about this client..."
                        rows={4}
                        required
                      />
                      <Button type="submit" disabled={isLoading}>
                        Add Note
                      </Button>
                    </form>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Client Notes</h3>
                    {clientNotes.length === 0 ? (
                      <p className="text-gray-500 text-sm">No notes yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {clientNotes.map((note: ClientNote) => (
                          <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm">{note.note}</p>
                            <div className="text-xs text-gray-500 mt-2">
                              By User {note.user_id} • {note.created_at.toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activities" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Log Activity</h3>
                    <form onSubmit={handleCreateActivity} className="space-y-3">
                      <Select
                        value={activityForm.activity_type || 'meeting'}
                        onValueChange={(value) =>
                          setActivityForm(prev => ({ ...prev, activity_type: value as 'call' | 'meeting' | 'email' | 'other' }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">📞 Call</SelectItem>
                          <SelectItem value="meeting">🤝 Meeting</SelectItem>
                          <SelectItem value="email">✉️ Email</SelectItem>
                          <SelectItem value="other">📋 Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        value={activityForm.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setActivityForm(prev => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Describe the activity..."
                        rows={3}
                        required
                      />
                      <Input
                        type="date"
                        value={activityForm.activity_date.toISOString().split('T')[0]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setActivityForm(prev => ({ ...prev, activity_date: new Date(e.target.value) }))
                        }
                      />
                      <Button type="submit" disabled={isLoading}>
                        Log Activity
                      </Button>
                    </form>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Activity History</h3>
                    {activityLogs.length === 0 ? (
                      <p className="text-gray-500 text-sm">No activities logged yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {activityLogs.map((activity: ActivityLog) => (
                          <div key={activity.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {activity.activity_type === 'call' ? '📞' :
                                 activity.activity_type === 'meeting' ? '🤝' :
                                 activity.activity_type === 'email' ? '✉️' : '📋'}
                                {activity.activity_type}
                              </Badge>
                              <div className="text-xs text-gray-500">
                                {activity.activity_date.toLocaleDateString()}
                              </div>
                            </div>
                            <p className="text-sm">{activity.description}</p>
                            <div className="text-xs text-gray-500 mt-1">
                              By User {activity.user_id}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}