'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  Heart, 
  TrendingUp, 
  Calendar, 
  MessageSquare, 
  Camera, 
  Activity,
  Smile,
  Frown,
  Meh,
  AlertTriangle,
  CheckCircle,
  Star,
  Target,
  Lightbulb
} from 'lucide-react';

export default function UserDashboard() {
  const { session, logout } = useAuth();
  const router = useRouter();
  const [moodScore, setMoodScore] = useState(75);
  const [currentMood, setCurrentMood] = useState('');
  const [journalEntry, setJournalEntry] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!session?.isAuthenticated || session.user.user_type !== 'user') {
      router.push('/auth');
    }
  }, [session, router]);

  if (!session?.isAuthenticated) {
    return <div>Loading...</div>;
  }

  // Mock data for demonstration
  const weeklyTrend = [65, 70, 68, 75, 80, 75, 78];
  const moodOptions = [
    { value: 'excellent', label: 'Excellent', icon: <Star className="h-4 w-4" />, color: 'text-green-600' },
    { value: 'good', label: 'Good', icon: <Smile className="h-4 w-4" />, color: 'text-blue-600' },
    { value: 'neutral', label: 'Neutral', icon: <Meh className="h-4 w-4" />, color: 'text-yellow-600' },
    { value: 'low', label: 'Low', icon: <Frown className="h-4 w-4" />, color: 'text-orange-600' },
    { value: 'poor', label: 'Poor', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600' }
  ];

  const handleJournalSubmit = () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      // Here you would integrate with your sentiment analysis API
    }, 2000);
  };

  const interventionSuggestions = [
    {
      type: 'Breathing Exercise',
      description: 'Try the 4-7-8 breathing technique for immediate stress relief',
      priority: 'high'
    },
    {
      type: 'Physical Activity',
      description: 'A 15-minute walk can boost mood and energy levels',
      priority: 'medium'
    },
    {
      type: 'Mindfulness',
      description: 'Practice 5-minute mindful meditation to center yourself',
      priority: 'low'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">MindWell Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active Session
              </Badge>
              <Button variant="outline" onClick={logout}>Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Good morning, {session.user.full_name}!</h1>
          <p className="text-gray-600">Let's check in on your mental wellness journey today.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Mood */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  <span>How are you feeling today?</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {moodOptions.map((mood) => (
                    <Button
                      key={mood.value}
                      variant={currentMood === mood.value ? "default" : "outline"}
                      className="flex flex-col items-center space-y-2 h-auto py-4"
                      onClick={() => setCurrentMood(mood.value)}
                    >
                      <div className={mood.color}>{mood.icon}</div>
                      <span className="text-xs">{mood.label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Journal Entry */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <span>Daily Journal</span>
                </CardTitle>
                <CardDescription>
                  Share your thoughts and feelings. Our AI will analyze sentiment and provide insights.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="How was your day? What's on your mind?"
                  value={journalEntry}
                  onChange={(e) => setJournalEntry(e.target.value)}
                  className="min-h-[120px]"
                />
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Camera className="h-4 w-4 mr-1" />
                      Add Photo
                    </Button>
                    <Button variant="outline" size="sm">Voice Note</Button>
                  </div>
                  <Button 
                    onClick={handleJournalSubmit}
                    disabled={!journalEntry.trim() || isAnalyzing}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Submit Entry'}
                  </Button>
                </div>

                {isAnalyzing && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-blue-600 mb-2">
                      <Brain className="h-4 w-4 animate-pulse" />
                      <span className="text-sm font-medium">AI Analysis in Progress</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Facial Expression Monitoring */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="h-5 w-5 text-purple-500" />
                  <span>Facial Expression Analysis</span>
                </CardTitle>
                <CardDescription>
                  Enable camera access for real-time emotion detection (Optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Camera access disabled</p>
                  <Button variant="outline">Enable Camera Analysis</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wellness Score */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  <span>Wellness Score</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">{moodScore}%</div>
                <Progress value={moodScore} className="mb-4" />
                <p className="text-sm text-gray-600">Above your 30-day average</p>
              </CardContent>
            </Card>

            {/* Weekly Trend */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <span>7-Day Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weeklyTrend.map((score, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Day {index + 1}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Progress value={score} className="w-20 h-2" />
                        <span className="text-sm font-medium">{score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Intervention Suggestions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <span>Suggested Interventions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {interventionSuggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{suggestion.type}</span>
                        <Badge 
                          variant={suggestion.priority === 'high' ? 'destructive' : 
                                  suggestion.priority === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {suggestion.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{suggestion.description}</p>
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        Start Activity
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Goals */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-indigo-500" />
                  <span>Today's Goals</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Morning meditation</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Journal entry</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                    <span className="text-sm text-gray-600">Evening reflection</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}