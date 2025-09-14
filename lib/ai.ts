// AI and Machine Learning utilities for mental health analysis

export interface SentimentAnalysisResult {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
  };
}

export interface FacialExpressionResult {
  emotions: {
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
    neutral: number;
  };
  dominantEmotion: string;
  confidence: number;
}

export interface MoodPrediction {
  predictedMood: number;
  riskLevel: 'low' | 'moderate' | 'high';
  interventionSuggestions: string[];
  confidence: number;
}

// Simulated AI functions - In production, these would connect to real AI services
export async function analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock sentiment analysis based on simple keyword detection
  const positiveWords = ['happy', 'good', 'great', 'excellent', 'wonderful', 'amazing', 'love', 'joy'];
  const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'depressed', 'anxious', 'worried'];
  
  const words = text.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(word => positiveWords.some(pw => word.includes(pw))).length;
  const negativeCount = words.filter(word => negativeWords.some(nw => word.includes(nw))).length;
  
  let score: number;
  let label: 'positive' | 'negative' | 'neutral';
  
  if (positiveCount > negativeCount) {
    score = 0.7 + (Math.random() * 0.3);
    label = 'positive';
  } else if (negativeCount > positiveCount) {
    score = 0.1 + (Math.random() * 0.3);
    label = 'negative';
  } else {
    score = 0.4 + (Math.random() * 0.2);
    label = 'neutral';
  }
  
  return {
    score,
    label,
    confidence: 0.8 + (Math.random() * 0.2),
    emotions: {
      joy: label === 'positive' ? 0.6 + (Math.random() * 0.3) : Math.random() * 0.3,
      sadness: label === 'negative' ? 0.6 + (Math.random() * 0.3) : Math.random() * 0.3,
      anger: negativeWords.some(word => text.toLowerCase().includes(word)) ? Math.random() * 0.5 : Math.random() * 0.2,
      fear: text.toLowerCase().includes('worried') || text.toLowerCase().includes('anxious') ? Math.random() * 0.6 : Math.random() * 0.2,
      surprise: Math.random() * 0.3
    }
  };
}

export async function analyzeFacialExpression(imageData: string): Promise<FacialExpressionResult> {
  // Simulate TensorFlow.js facial expression analysis
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock facial expression results
  const emotions = {
    happy: Math.random() * 0.4,
    sad: Math.random() * 0.3,
    angry: Math.random() * 0.2,
    fearful: Math.random() * 0.2,
    disgusted: Math.random() * 0.1,
    surprised: Math.random() * 0.3,
    neutral: Math.random() * 0.5
  };
  
  // Find dominant emotion
  const dominantEmotion = Object.entries(emotions).reduce((a, b) => 
    emotions[a[0] as keyof typeof emotions] > emotions[b[0] as keyof typeof emotions] ? a : b
  )[0];
  
  return {
    emotions,
    dominantEmotion,
    confidence: 0.7 + (Math.random() * 0.3)
  };
}

export async function predictMoodTrend(historicalData: number[]): Promise<MoodPrediction> {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Simple trend analysis
  const recentTrend = historicalData.slice(-7); // Last 7 days
  const average = recentTrend.reduce((a, b) => a + b, 0) / recentTrend.length;
  const trend = recentTrend[recentTrend.length - 1] - recentTrend[0];
  
  let riskLevel: 'low' | 'moderate' | 'high';
  let interventionSuggestions: string[];
  
  if (average < 40 || trend < -20) {
    riskLevel = 'high';
    interventionSuggestions = [
      'Schedule immediate check-in with mental health professional',
      'Practice deep breathing exercises (4-7-8 technique)',
      'Engage in light physical activity for 15 minutes',
      'Use grounding techniques (5-4-3-2-1 sensory method)'
    ];
  } else if (average < 60 || trend < -10) {
    riskLevel = 'moderate';
    interventionSuggestions = [
      'Try mindfulness meditation for 10 minutes',
      'Take a walk outdoors',
      'Practice gratitude journaling',
      'Listen to calming music'
    ];
  } else {
    riskLevel = 'low';
    interventionSuggestions = [
      'Continue current wellness practices',
      'Maintain regular exercise routine',
      'Keep up healthy sleep schedule',
      'Stay connected with support network'
    ];
  }
  
  return {
    predictedMood: average + (Math.random() * 10 - 5),
    riskLevel,
    interventionSuggestions,
    confidence: 0.75 + (Math.random() * 0.2)
  };
}

// Deep learning model utilities (would integrate with TensorFlow.js in production)
export class MentalHealthModel {
  private modelLoaded = false;
  
  async loadModel() {
    // Simulate model loading
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.modelLoaded = true;
  }
  
  async predict(features: {
    moodScores: number[];
    journalSentiment: number[];
    activityLevel: number[];
    sleepQuality: number[];
  }) {
    if (!this.modelLoaded) {
      await this.loadModel();
    }
    
    // Mock prediction based on feature inputs
    const avgMood = features.moodScores.reduce((a, b) => a + b, 0) / features.moodScores.length;
    const avgSentiment = features.journalSentiment.reduce((a, b) => a + b, 0) / features.journalSentiment.length;
    
    return {
      riskScore: Math.max(0, Math.min(100, 100 - avgMood - (avgSentiment * 50))),
      recommendation: avgMood > 70 ? 'maintain' : avgMood > 40 ? 'monitor' : 'intervene'
    };
  }
}

// Vector embedding utilities for RAG system
export async function generateEmbedding(text: string): Promise<number[]> {
  // Simulate text embedding generation
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock 384-dimensional embedding (similar to sentence-transformers)
  return Array.from({ length: 384 }, () => Math.random() * 2 - 1);
}

export async function findSimilarEntries(queryEmbedding: number[], entryEmbeddings: { id: string, embedding: number[], text: string }[]): Promise<{ id: string, text: string, similarity: number }[]> {
  // Simple cosine similarity calculation
  const similarities = entryEmbeddings.map(entry => {
    const dotProduct = queryEmbedding.reduce((sum, a, i) => sum + a * entry.embedding[i], 0);
    const normA = Math.sqrt(queryEmbedding.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(entry.embedding.reduce((sum, b) => sum + b * b, 0));
    const similarity = dotProduct / (normA * normB);
    
    return {
      id: entry.id,
      text: entry.text,
      similarity
    };
  });
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5); // Return top 5 similar entries
}