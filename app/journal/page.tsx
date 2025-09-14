'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Volume2, 
  VolumeX,
  Save,
  Sparkles,
  Heart,
  TrendingUp,
  Calendar,
  MessageSquare,
  Smile,
  Frown,
  Meh,
  Star,
  AlertTriangle
} from 'lucide-react';
import { tensorFlowService } from '@/lib/tensorflow';
import { speechService, formatTranscriptForJournal, detectEmotionalCues } from '@/lib/speech';
import { mockEmbeddingService } from '@/lib/embeddings';
import { mockDeepseekService } from '@/lib/deepseek';
import { supabase } from '@/lib/supabase';

export default function JournalPage() {
  const { session } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Journal state
  const [journalContent, setJournalContent] = useState('');
  const [currentMood, setCurrentMood] = useState('');
  const [moodScore, setMoodScore] = useState(50);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  
  // Audio/Video state
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isPlayingRecommendation, setIsPlayingRecommendation] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // AI Analysis state
  const [sentimentAnalysis, setSentimentAnalysis] = useState<any>(null);
  const [facialAnalysis, setFacialAnalysis] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (!session?.isAuthenticated || session.user.user_type !== 'user') {
      router.push('/auth');
    }
  }, [session, router]);

  useEffect(() => {
    // Initialize TensorFlow.js
    tensorFlowService.initialize().catch(console.error);
    
    return () => {
      // Cleanup
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      tensorFlowService.dispose();
    };
  }, [stream]);

  const moodOptions = [
    { value: 'excellent', label: 'Excellent', icon: <Star className="h-4 w-4" />, color: 'text-green-600' },
    { value: 'good', label: 'Good', icon: <Smile className="h-4 w-4" />, color: 'text-blue-600' },
    { value: 'neutral', label: 'Neutral', icon: <Meh className="h-4 w-4" />, color: 'text-yellow-600' },
    { value: 'low', label: 'Low', icon: <Frown className="h-4 w-4" />, color: 'text-orange-600' },
    { value: 'poor', label: 'Poor', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600' }
  ];

  const startVoiceRecording = async () => {
    try {
      setIsRecording(true);
      const transcript = await speechService.transcribeForJournal();
      const formattedTranscript = formatTranscriptForJournal(transcript);
      
      setJournalContent(prev => prev + (prev ? ' ' : '') + formattedTranscript);
      
      // Analyze emotional cues from speech
      const emotionalCues = detectEmotionalCues(transcript);
      setMoodScore(emotionalCues.suggestedMoodScore);
      
    } catch (error) {
      console.error('Voice recording failed:', error);
    } finally {
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    speechService.stopListening();
    setIsRecording(false);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: false 
      });
      
      setStream(mediaStream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      // Start periodic facial analysis
      startFacialAnalysis();
    } catch (error) {
      console.error('Camera access failed:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setFacialAnalysis(null);
  };

  const startFacialAnalysis = () => {
    const analyzeFrame = async () => {
      if (!isCameraActive || !videoRef.current || !canvasRef.current) return;
      
      try {
        const analysis = await tensorFlowService.analyzeFacialExpression(videoRef.current);
        setFacialAnalysis(analysis);
        
        // Update mood score based on facial analysis
        const moodFromFace = calculateMoodFromEmotions(analysis.emotions);
        setMoodScore(prev => Math.round((prev + moodFromFace) / 2));
        
      } catch (error) {
        console.error('Facial analysis failed:', error);
      }
    };

    // Analyze every 3 seconds
    const interval = setInterval(analyzeFrame, 3000);
    
    // Cleanup interval when camera stops
    setTimeout(() => {
      if (!isCameraActive) clearInterval(interval);
    }, 100);
  };

  const calculateMoodFromEmotions = (emotions: any): number => {
    const positiveEmotions = emotions.happy + emotions.surprised;
    const negativeEmotions = emotions.sad + emotions.angry + emotions.fearful + emotions.disgusted;
    const neutral = emotions.neutral;
    
    // Convert to 1-100 scale
    return Math.round((positiveEmotions * 100 + neutral * 50 + negativeEmotions * 10));
  };

  const analyzeJournalEntry = async () => {
    if (!journalContent.trim()) return;
    
    setIsAnalyzing(true);
    
    try {
      // Sentiment analysis
      const sentiment = await tensorFlowService.analyzeTextSentiment(journalContent);
      setSentimentAnalysis(sentiment);
      
      // Generate embeddings and store
      const userId = session!.user.id;
      
      // Create journal entry first
      const { data: journalEntry, error: journalError } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          content: journalContent,
          mood_score: moodScore,
          emotions: sentiment.emotions,
          sentiment_analysis: sentiment,
          facial_analysis: facialAnalysis,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (journalError) throw journalError;

      // Generate and store embeddings
      await mockEmbeddingService.storeJournalEmbedding(
        journalEntry.id,
        userId,
        journalContent
      );

      // Build RAG context and generate insights
      const ragContext = await mockEmbeddingService.buildRAGContext(journalContent, userId);
      const insights = await mockEmbeddingService.generateContextualInsights(ragContext);
      setAiInsights(insights);

      // Generate personalized recommendations
      const deepseekContext = {
        currentMood: currentMood,
        journalEntry: journalContent,
        moodHistory: [moodScore], // In production, fetch actual history
        sentimentAnalysis: sentiment,
        riskLevel: moodScore < 40 ? 'high' : moodScore < 60 ? 'moderate' : 'low'
      };

      const copingStrategies = await mockDeepseekService.generateCopingStrategies(deepseekContext);
      setRecommendations(copingStrategies);

      // Update journal entry with AI insights
      await supabase
        .from('journal_entries')
        .update({
          ai_insights: insights,
          ai_recommendations: copingStrategies
        })
        .eq('id', journalEntry.id);

      setAnalysisResults({
        sentiment,
        insights,
        recommendations: copingStrategies
      });

    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const playRecommendation = async (text: string) => {
    try {
      setIsPlayingRecommendation(true);
      await speechService.speakRecommendation(text);
    } catch (error) {
      console.error('Speech synthesis failed:', error);
    } finally {
      setIsPlayingRecommendation(false);
    }
  };

  const stopRecommendation = () => {
    speechService.stopSpeaking();
    setIsPlayingRecommendation(false);
  };

  const saveJournalEntry = async () => {
    if (!journalContent.trim()) return;
    
    try {
      const userId = session!.user.id;
      
      const { error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          content: journalContent,
          mood_score: moodScore,
          emotions: sentimentAnalysis?.emotions || {},
          sentiment_analysis: sentimentAnalysis,
          facial_analysis: facialAnalysis,
          ai_insights: aiInsights,
          ai_recommendations: recommendations
        });

      if (error) throw error;

      // Reset form
      setJournalContent('');
      setCurrentMood('');
      setMoodScore(50);
      setSentimentAnalysis(null);
      setFacialAnalysis(null);
      setAiInsights('');
      setRecommendations([]);
      setAnalysisResults(null);

      // Redirect to dashboard
      router.push('/dashboard/user');
    } catch (error) {
      console.error('Failed to save journal entry:', error);
    }
  };

  if (!session?.isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Journal Entry</span>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard/user')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Journal Entry */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mood Selection */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  <span>How are you feeling?</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
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
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mood Score: {moodScore}/100</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={moodScore}
                    onChange={(e) => setMoodScore(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Journal Content */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <span>Your Thoughts</span>
                </CardTitle>
                <CardDescription>
                  Share what's on your mind. Use voice recording or camera analysis for deeper insights.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="How was your day? What's on your mind? Share your thoughts and feelings..."
                  value={journalContent}
                  onChange={(e) => setJournalContent(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
                
                {/* Input Controls */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    disabled={isAnalyzing}
                  >
                    {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                    {isRecording ? 'Stop Recording' : 'Voice Input'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isCameraActive ? stopCamera : startCamera}
                    disabled={isAnalyzing}
                  >
                    {isCameraActive ? <CameraOff className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                    {isCameraActive ? 'Stop Camera' : 'Facial Analysis'}
                  </Button>
                  
                  <Button
                    onClick={analyzeJournalEntry}
                    disabled={!journalContent.trim() || isAnalyzing}
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                  </Button>
                </div>

                {/* Analysis Progress */}
                {isAnalyzing && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-blue-600 mb-2">
                      <Brain className="h-4 w-4 animate-pulse" />
                      <span className="text-sm font-medium">AI Analysis in Progress</span>
                    </div>
                    <Progress value={60} className="h-2" />
                    <p className="text-xs text-blue-600 mt-2">
                      Analyzing sentiment, emotions, and generating personalized insights...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Camera Feed */}
            {isCameraActive && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Camera className="h-5 w-5 text-purple-500" />
                    <span>Facial Expression Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className="w-full max-w-md mx-auto rounded-lg"
                      autoPlay
                      muted
                      playsInline
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  
                  {facialAnalysis && (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div>Dominant: <Badge>{facialAnalysis.dominantEmotion}</Badge></div>
                      <div>Confidence: {Math.round(facialAnalysis.confidence * 100)}%</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Analysis Results */}
          <div className="space-y-6">
            {/* Sentiment Analysis */}
            {sentimentAnalysis && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Overall Sentiment</span>
                      <Badge variant={
                        sentimentAnalysis.sentiment === 'positive' ? 'secondary' :
                        sentimentAnalysis.sentiment === 'negative' ? 'destructive' : 'default'
                      }>
                        {sentimentAnalysis.sentiment}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(sentimentAnalysis.emotions).map(([emotion, value]) => (
                        <div key={emotion} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{emotion}</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={(value as number) * 100} className="w-16 h-2" />
                            <span className="text-xs">{Math.round((value as number) * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Insights */}
            {aiInsights && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    <span>AI Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 leading-relaxed">{aiInsights}</p>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span>Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <p className="text-sm text-gray-700 mb-2">{rec}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playRecommendation(rec)}
                          disabled={isPlayingRecommendation}
                        >
                          {isPlayingRecommendation ? 
                            <VolumeX className="h-3 w-3 mr-1" /> : 
                            <Volume2 className="h-3 w-3 mr-1" />
                          }
                          {isPlayingRecommendation ? 'Playing...' : 'Listen'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            <Button 
              onClick={saveJournalEntry}
              disabled={!journalContent.trim()}
              className="w-full"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Journal Entry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}