import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  User, Client, Project, Position,
  UtilizationReportInput, BudgetConsumptionInput, BookingDetailsInput
} from '../../../server/src/schema';

interface ReportingDashboardProps {
  users: User[];
}

export function ReportingDashboard({ users }: ReportingDashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Report filters
  const [utilizationFilter, setUtilizationFilter] = useState<UtilizationReportInput>({
    user_id: undefined,
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end_date: new Date()
  });

  const [budgetFilter, setBudgetFilter] = useState<BudgetConsumptionInput>({
    client_id: undefined,
    project_id: undefined,
    position_id: undefined
  });

  const [bookingFilter, setBookingFilter] = useState<BookingDetailsInput>({
    user_id: users[0]?.id || 0,
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end_date: new Date()
  });

  // Report results (stub data since handlers return empty)
  const [utilizationData, setUtilizationData] = useState<{
    user_id?: number;
    period: string;
    total_hours: number;
    billable_hours: number;
    utilization_rate: number;
    projects?: Array<{ project_name: string; hours: number; utilization: number }>;
  } | null>(null);
  const [budgetData, setBudgetData] = useState<{
    scope: string;
    total_budget: number;
    consumed_budget: number;
    consumption_rate: number;
    remaining_budget: number;
    breakdown?: Array<{ item: string; budgeted: number; consumed: number; rate: number }>;
  } | null>(null);
  const [bookingData, setBookingData] = useState<{
    user: string;
    period: string;
    total_hours: number;
    billable_hours: number;
    hourly_rate: number;
    total_revenue: number;
    bookings?: Array<{
      project: string;
      client: string;
      hours: number;
      rate: number;
      revenue: number;
      period: string;
    }>;
  } | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const result = await trpc.getClients.query();
      setClients(result);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  }, []);

  const loadProjectsByClient = useCallback(async (clientId: number) => {
    try {
      const result = await trpc.getProjectsByClient.query({ client_id: clientId });
      setProjects(result);
      setPositions([]); // Clear positions when client changes
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, []);

  const loadPositionsByProject = useCallback(async (projectId: number) => {
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
    if (budgetFilter.client_id) {
      loadProjectsByClient(budgetFilter.client_id);
    }
  }, [budgetFilter.client_id, loadProjectsByClient]);

  useEffect(() => {
    if (budgetFilter.project_id) {
      loadPositionsByProject(budgetFilter.project_id);
    }
  }, [budgetFilter.project_id, loadPositionsByProject]);

  const runUtilizationReport = async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getUtilizationReport.query(utilizationFilter);
      console.log('Utilization API result:', result); // Log for debugging
      
      // Stub data for demonstration since backend returns empty
      setUtilizationData({
        user_id: utilizationFilter.user_id,
        period: `${utilizationFilter.start_date.toLocaleDateString()} - ${utilizationFilter.end_date.toLocaleDateString()}`,
        total_hours: 120.5,
        billable_hours: 105.25,
        utilization_rate: 87.3,
        projects: [
          { project_name: 'E-commerce Platform', hours: 45.5, utilization: 38 },
          { project_name: 'Mobile App Development', hours: 32.75, utilization: 27 },
          { project_name: 'Database Migration', hours: 27, utilization: 22 }
        ]
      });
    } catch (error) {
      console.error('Failed to run utilization report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runBudgetReport = async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getBudgetConsumption.query(budgetFilter);
      console.log('Budget API result:', result); // Log for debugging
      
      // Stub data for demonstration since backend returns empty
      setBudgetData({
        scope: budgetFilter.position_id ? 'Position' : budgetFilter.project_id ? 'Project' : 'Client',
        total_budget: 50000,
        consumed_budget: 32750,
        consumption_rate: 65.5,
        remaining_budget: 17250,
        breakdown: [
          { item: 'Senior Developer', budgeted: 20000, consumed: 15750, rate: 78.75 },
          { item: 'Frontend Specialist', budgeted: 15000, consumed: 9500, rate: 63.33 },
          { item: 'Project Manager', budgeted: 15000, consumed: 7500, rate: 50.00 }
        ]
      });
    } catch (error) {
      console.error('Failed to run budget report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runBookingReport = async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getBookingDetails.query(bookingFilter);
      console.log('Booking API result:', result); // Log for debugging
      
      // Stub data for demonstration since backend returns empty
      const selectedUser = users.find(u => u.id === bookingFilter.user_id);
      setBookingData({
        user: selectedUser?.name || 'Unknown User',
        period: `${bookingFilter.start_date.toLocaleDateString()} - ${bookingFilter.end_date.toLocaleDateString()}`,
        total_hours: 145.5,
        billable_hours: 128.25,
        hourly_rate: selectedUser?.hourly_rate || 85,
        total_revenue: 10901.25,
        bookings: [
          { 
            project: 'E-commerce Platform',
            client: 'TechCorp Inc.',
            hours: 52.5,
            rate: 85,
            revenue: 4462.50,
            period: '2024-01-01 to 2024-01-15'
          },
          {
            project: 'Mobile App Development', 
            client: 'StartupXYZ',
            hours: 38.75,
            rate: 85,
            revenue: 3293.75,
            period: '2024-01-16 to 2024-01-31'
          },
          {
            project: 'Database Migration',
            client: 'Enterprise Corp',
            hours: 37,
            rate: 85,
            revenue: 3145.00,
            period: '2024-01-01 to 2024-01-31'
          }
        ]
      });
    } catch (error) {
      console.error('Failed to run booking report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 Reporting & Analytics</h2>
        <p className="text-gray-600">Track utilization, budget consumption, and booking details</p>
      </div>

      <Tabs defaultValue="utilization" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="utilization">📈 Utilization</TabsTrigger>
          <TabsTrigger value="budget">💰 Budget</TabsTrigger>
          <TabsTrigger value="bookings">📅 Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="utilization" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Utilization Report Filters</CardTitle>
                <CardDescription>
                  Track consultant utilization rates and efficiency
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Consultant (Optional)</Label>
                  <Select
                    value={utilizationFilter.user_id?.toString() || 'all'}
                    onValueChange={(value) =>
                      setUtilizationFilter(prev => ({ 
                        ...prev, 
                        user_id: value === 'all' ? undefined : parseInt(value) 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Consultants</SelectItem>
                      {users.map((user: User) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name} ({user.role.replace('_', ' ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={utilizationFilter.start_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUtilizationFilter(prev => ({ ...prev, start_date: new Date(e.target.value) }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={utilizationFilter.end_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUtilizationFilter(prev => ({ ...prev, end_date: new Date(e.target.value) }))
                      }
                    />
                  </div>
                </div>
                
                <Button onClick={runUtilizationReport} disabled={isLoading} className="w-full">
                  {isLoading ? 'Generating Report...' : 'Generate Utilization Report'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Utilization Results</CardTitle>
                <CardDescription>
                  {utilizationData ? `Report for ${utilizationData.period}` : 'Run a report to see results'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {utilizationData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {utilizationData.total_hours}h
                        </div>
                        <div className="text-sm text-gray-600">Total Hours</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {utilizationData.billable_hours}h
                        </div>
                        <div className="text-sm text-gray-600">Billable Hours</div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {utilizationData.utilization_rate}%
                      </div>
                      <Progress value={utilizationData.utilization_rate} className="w-full mb-2" />
                      <div className="text-sm text-gray-600">Utilization Rate</div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-3">Project Breakdown</h4>
                      <div className="space-y-2">
                        {utilizationData.projects?.map((project, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium text-sm">{project.project_name}</div>
                              <div className="text-xs text-gray-600">{project.hours}h logged</div>
                            </div>
                            <Badge variant="outline">
                              {project.utilization}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Configure filters and run a report to see utilization data.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Budget Consumption Filters</CardTitle>
                <CardDescription>
                  Monitor budget usage across clients, projects, and positions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Client (Optional)</Label>
                  <Select
                    value={budgetFilter.client_id?.toString() || 'all'}
                    onValueChange={(value) => {
                      setBudgetFilter(() => ({ 
                        client_id: value === 'all' ? undefined : parseInt(value),
                        project_id: undefined,
                        position_id: undefined
                      }));
                      setProjects([]);
                      setPositions([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client: Client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Project (Optional)</Label>
                  <Select
                    value={budgetFilter.project_id?.toString() || 'all'}
                    onValueChange={(value) => {
                      setBudgetFilter(prev => ({ 
                        ...prev,
                        project_id: value === 'all' ? undefined : parseInt(value),
                        position_id: undefined
                      }));
                      setPositions([]);
                    }}
                    disabled={!budgetFilter.client_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((project: Project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Position (Optional)</Label>
                  <Select
                    value={budgetFilter.position_id?.toString() || 'all'}
                    onValueChange={(value) =>
                      setBudgetFilter(prev => ({ 
                        ...prev,
                        position_id: value === 'all' ? undefined : parseInt(value)
                      }))
                    }
                    disabled={!budgetFilter.project_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Positions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {positions.map((position: Position) => (
                        <SelectItem key={position.id} value={position.id.toString()}>
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={runBudgetReport} disabled={isLoading} className="w-full">
                  {isLoading ? 'Generating Report...' : 'Generate Budget Report'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Budget Analysis</CardTitle>
                <CardDescription>
                  {budgetData ? `${budgetData.scope} level analysis` : 'Run a report to see budget analysis'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {budgetData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          ${budgetData.total_budget.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Total Budget</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          ${budgetData.consumed_budget.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Consumed</div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 mb-2">
                        {budgetData.consumption_rate}%
                      </div>
                      <Progress value={budgetData.consumption_rate} className="w-full mb-2" />
                      <div className="text-sm text-gray-600">Consumption Rate</div>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        ${budgetData.remaining_budget.toLocaleString()}
                      </div>
                      <div className="text-sm text-green-600">Remaining Budget</div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-3">Detailed Breakdown</h4>
                      <div className="space-y-2">
                        {budgetData.breakdown?.map((item, index: number) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{item.item}</div>
                              <Badge variant={
                                item.rate > 80 ? 'destructive' : 
                                item.rate > 60 ? 'default' : 'secondary'
                              }>
                                {item.rate}%
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              ${item.consumed.toLocaleString()} of ${item.budgeted.toLocaleString()}
                            </div>
                            <Progress value={item.rate} className="mt-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Configure filters and run a report to see budget consumption data.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Booking Details Filters</CardTitle>
                <CardDescription>
                  View detailed booking information per consultant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Consultant</Label>
                  <Select
                    value={bookingFilter.user_id.toString()}
                    onValueChange={(value) =>
                      setBookingFilter(prev => ({ ...prev, user_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: User) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name} ({user.role.replace('_', ' ')})
                          {user.hourly_rate && (
                            <span className="text-gray-500 ml-2">- ${user.hourly_rate}/hr</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={bookingFilter.start_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setBookingFilter(prev => ({ ...prev, start_date: new Date(e.target.value) }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={bookingFilter.end_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setBookingFilter(prev => ({ ...prev, end_date: new Date(e.target.value) }))
                      }
                    />
                  </div>
                </div>
                
                <Button onClick={runBookingReport} disabled={isLoading} className="w-full">
                  {isLoading ? 'Generating Report...' : 'Generate Booking Report'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
                <CardDescription>
                  {bookingData ? `${bookingData.user} - ${bookingData.period}` : 'Run a report to see booking details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookingData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">
                          {bookingData.total_hours}h
                        </div>
                        <div className="text-sm text-blue-600">Total Hours</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xl font-bold text-green-600">
                          {bookingData.billable_hours}h
                        </div>
                        <div className="text-sm text-green-600">Billable Hours</div>
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        ${bookingData.total_revenue.toLocaleString()}
                      </div>
                      <div className="text-sm text-purple-600">Total Revenue</div>
                      <div className="text-xs text-gray-600 mt-1">
                        @ ${bookingData.hourly_rate}/hour
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-3">Booking Details</h4>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {bookingData.bookings?.map((booking, index: number) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{booking.project}</div>
                              <Badge variant="outline">
                                ${booking.revenue.toLocaleString()}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 mb-1">
                              Client: {booking.client}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>{booking.hours}h @ ${booking.rate}/hr</span>
                              <span className="text-xs text-gray-500">{booking.period}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Select a consultant and date range to see booking details.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Alert>
        <AlertDescription>
          <strong>Note:</strong> This reporting dashboard uses sample data for demonstration purposes. 
          In a production environment, these reports would be generated from actual time tracking data 
          stored in the database and calculated by the backend handlers.
        </AlertDescription>
      </Alert>
    </div>
  );
}