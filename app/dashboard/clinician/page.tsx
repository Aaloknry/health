'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Clock,
  Search,
  Filter,
  Bell,
  Activity,
  Heart,
  MessageSquare,
  FileText,
  BarChart3
} from 'lucide-react';

export default function ClinicianDashboard() {
  const { session, logout } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!session?.isAuthenticated || session.user.user_type !== 'clinician') {
      router.push('/auth');
    }
  }, [session, router]);

  if (!session?.isAuthenticated) {
    return <div>Loading...</div>;
  }
  
  // Mock patient data
  const patients = [
    {
      id: 1,
      name: 'Sarah Johnson',
      riskLevel: 'moderate',
      lastMoodScore: 65,
      trend: 'declining',
      lastActivity: '2 hours ago',
      alerts: 2
    },
    {
      id: 2,
      name: 'Michael Chen',
      riskLevel: 'low',
      lastMoodScore: 85,
      trend: 'stable',
      lastActivity: '1 day ago',
      alerts: 0
    },
    {
      id: 3,
      name: 'Emma Davis',
      riskLevel: 'high',
      lastMoodScore: 45,
      trend: 'declining',
      lastActivity: '30 minutes ago',
      alerts: 5
    }
  ];

  const alerts = [
    {
      patient: 'Emma Davis',
      type: 'Risk Alert',
      message: 'Significant mood decline detected over past 3 days',
      severity: 'high',
      time: '15 minutes ago'
    },
    {
      patient: 'Sarah Johnson',
      type: 'Missed Check-in',
      message: 'No journal entry for 2 consecutive days',
      severity: 'medium',
      time: '2 hours ago'
    }
  ];

  const getRiskBadge = (level: string) => {
    const variants = {
      low: 'secondary',
      moderate: 'default', 
      high: 'destructive'
    } as const;
    return <Badge variant={variants[level as keyof typeof variants]}>{level}</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'declining' ? 
      <TrendingUp className="h-4 w-4 text-red-500 rotate-180" /> :
      <TrendingUp className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-green-600" />
              <span className="text-xl font-bold text-gray-900">Clinician Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
              </Button>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {session.user.full_name}
              </Badge>
              <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clinical Dashboard</h1>
          <p className="text-gray-600">Monitor patient progress and manage interventions</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900">24</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Risk</p>
                  <p className="text-2xl font-bold text-red-600">3</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-bold text-orange-600">7</p>
                </div>
                <Bell className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Wellness</p>
                  <p className="text-2xl font-bold text-green-600">72%</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="patients" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="patients">Patient Overview</TabsTrigger>
            <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="interventions">Interventions</TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="space-y-6">
            {/* Search and Filter */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search patients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                      <SelectItem value="moderate">Moderate Risk</SelectItem>
                      <SelectItem value="low">Low Risk</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Patient List */}
            <div className="grid gap-4">
              {patients.map((patient) => (
                <Card key={patient.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {patient.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                          <p className="text-sm text-gray-600">Last active: {patient.lastActivity}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getRiskBadge(patient.riskLevel)}
                        {patient.alerts > 0 && (
                          <Badge variant="destructive">{patient.alerts} alerts</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-gray-600">Mood Score:</span>
                        <span className="font-medium">{patient.lastMoodScore}%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(patient.trend)}
                        <span className="text-sm text-gray-600">Trend:</span>
                        <span className="font-medium capitalize">{patient.trend}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600">Last Entry:</span>
                        <span className="font-medium">{patient.lastActivity}</span>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        View Records
                      </Button>
                      <Button size="sm">
                        Send Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>Recent alerts requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className={`h-4 w-4 ${alert.severity === 'high' ? 'text-red-500' : 'text-orange-500'}`} />
                          <span className="font-medium">{alert.patient}</span>
                          <Badge variant={alert.severity === 'high' ? 'destructive' : 'default'}>
                            {alert.type}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">{alert.time}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{alert.message}</p>
                      <div className="flex space-x-2">
                        <Button size="sm">Review Patient</Button>
                        <Button variant="outline" size="sm">Dismiss</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <span>Population Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Advanced analytics dashboard coming soon</p>
                  <p className="text-sm text-gray-500">
                    This will include population trends, treatment effectiveness metrics, 
                    and predictive risk modeling
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interventions" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Intervention Management</CardTitle>
                <CardDescription>Create and manage therapeutic interventions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 rounded-lg p-8 text-center">
                  <Brain className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Intervention management system</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Design custom interventions, track effectiveness, and manage treatment protocols
                  </p>
                  <Button>Create New Intervention</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}