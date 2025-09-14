// Vector embeddings and RAG system for mental health insights

import { supabase } from './supabase';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface SimilarEntry {
  id: string;
  content: string;
  similarity: number;
  created_at: string;
  mood_score?: number;
  emotions?: any;
}

export interface RAGContext {
  query: string;
  similarEntries: SimilarEntry[];
  userHistory: {
    avgMoodScore: number;
    commonEmotions: string[];
    recentTrends: string;
  };
}

export class EmbeddingService {
  private apiKey: string;
  private baseUrl: string = 'https://api.deepseek.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // In production, you would use a proper embedding API
      // For now, we'll simulate with Deepseek API or use a local model
      
      // Mock embedding generation for demonstration
      const embedding = this.generateMockEmbedding(text);
      
      return {
        embedding,
        model: 'gte-small',
        dimensions: 384
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate a deterministic but pseudo-random embedding based on text
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    
    for (let i = 0; i < 384; i++) {
      // Use hash to generate consistent embeddings for same text
      const seed = (hash + i) * 9301 + 49297;
      embedding.push((seed % 233280) / 233280 - 0.5);
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async storeJournalEmbedding(journalEntryId: string, userId: string, content: string): Promise<void> {
    try {
      const embeddingResult = await this.generateEmbedding(content);
      
      const { error } = await supabase
        .from('journal_embeddings')
        .insert({
          journal_entry_id: journalEntryId,
          user_id: userId,
          embedding: embeddingResult.embedding,
          model_version: embeddingResult.model
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error storing journal embedding:', error);
      throw error;
    }
  }

  async findSimilarJournalEntries(
    query: string, 
    userId: string, 
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<SimilarEntry[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Use the Supabase function we created in the migration
      const { data, error } = await supabase
        .rpc('match_journal_entries', {
          query_embedding: queryEmbedding.embedding,
          match_threshold: threshold,
          match_count: limit,
          target_user_id: userId
        });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error finding similar journal entries:', error);
      return [];
    }
  }

  async buildRAGContext(query: string, userId: string): Promise<RAGContext> {
    try {
      // Get similar entries
      const similarEntries = await this.findSimilarJournalEntries(query, userId);
      
      // Get user history for context
      const { data: recentEntries, error } = await supabase
        .from('journal_entries')
        .select('mood_score, emotions, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        throw error;
      }

      // Calculate user history insights
      const userHistory = this.analyzeUserHistory(recentEntries || []);

      return {
        query,
        similarEntries,
        userHistory
      };
    } catch (error) {
      console.error('Error building RAG context:', error);
      return {
        query,
        similarEntries: [],
        userHistory: {
          avgMoodScore: 50,
          commonEmotions: [],
          recentTrends: 'insufficient data'
        }
      };
    }
  }

  private analyzeUserHistory(entries: any[]): {
    avgMoodScore: number;
    commonEmotions: string[];
    recentTrends: string;
  } {
    if (entries.length === 0) {
      return {
        avgMoodScore: 50,
        commonEmotions: [],
        recentTrends: 'no data available'
      };
    }

    // Calculate average mood score
    const avgMoodScore = entries
      .filter(entry => entry.mood_score)
      .reduce((sum, entry) => sum + entry.mood_score, 0) / entries.length;

    // Extract common emotions
    const emotionCounts: Record<string, number> = {};
    entries.forEach(entry => {
      if (entry.emotions) {
        Object.keys(entry.emotions).forEach(emotion => {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + entry.emotions[emotion];
        });
      }
    });

    const commonEmotions = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion);

    // Analyze recent trends
    const recentScores = entries
      .slice(0, 7)
      .map(entry => entry.mood_score)
      .filter(score => score !== null);

    let recentTrends = 'stable';
    if (recentScores.length >= 3) {
      const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
      const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const difference = secondAvg - firstAvg;
      
      if (difference > 10) recentTrends = 'improving';
      else if (difference < -10) recentTrends = 'declining';
      else recentTrends = 'stable';
    }

    return {
      avgMoodScore: Math.round(avgMoodScore),
      commonEmotions,
      recentTrends
    };
  }

  async generateContextualInsights(ragContext: RAGContext): Promise<string> {
    try {
      // Build context for Deepseek API
      const contextPrompt = this.buildContextPrompt(ragContext);
      
      // Call Deepseek API for insights
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a compassionate AI mental health assistant. Provide supportive, evidence-based insights based on the user\'s journal history and current query. Be empathetic, non-judgmental, and focus on positive coping strategies.'
            },
            {
              role: 'user',
              content: contextPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`Deepseek API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating contextual insights:', error);
      return this.generateFallbackInsight(ragContext);
    }
  }

  private buildContextPrompt(ragContext: RAGContext): string {
    const { query, similarEntries, userHistory } = ragContext;
    
    let prompt = `Based on the user's current query: "${query}"\n\n`;
    
    prompt += `User's mental health context:\n`;
    prompt += `- Average mood score: ${userHistory.avgMoodScore}/100\n`;
    prompt += `- Recent trend: ${userHistory.recentTrends}\n`;
    prompt += `- Common emotions: ${userHistory.commonEmotions.join(', ')}\n\n`;
    
    if (similarEntries.length > 0) {
      prompt += `Similar past journal entries:\n`;
      similarEntries.forEach((entry, index) => {
        prompt += `${index + 1}. "${entry.content.substring(0, 200)}..." (Mood: ${entry.mood_score || 'N/A'}/100)\n`;
      });
      prompt += '\n';
    }
    
    prompt += `Please provide:\n`;
    prompt += `1. Empathetic acknowledgment of their current state\n`;
    prompt += `2. Insights based on patterns from their history\n`;
    prompt += `3. Personalized coping strategies\n`;
    prompt += `4. Encouragement and hope\n`;
    prompt += `Keep the response warm, supportive, and actionable.`;
    
    return prompt;
  }

  private generateFallbackInsight(ragContext: RAGContext): string {
    const { userHistory } = ragContext;
    
    let insight = "Thank you for sharing your thoughts with me. ";
    
    if (userHistory.avgMoodScore > 70) {
      insight += "I can see you've been maintaining a positive outlook overall, which shows great resilience. ";
    } else if (userHistory.avgMoodScore < 40) {
      insight += "I notice you've been going through some challenging times. Your courage in continuing to journal and seek support is admirable. ";
    } else {
      insight += "You're navigating through various emotions, which is completely normal and human. ";
    }
    
    if (userHistory.recentTrends === 'improving') {
      insight += "The positive trend in your recent entries suggests that the strategies you're using are helping. Keep up the good work! ";
    } else if (userHistory.recentTrends === 'declining') {
      insight += "I see there have been some ups and downs recently. Remember that healing isn't always linear, and it's okay to have difficult days. ";
    }
    
    insight += "Consider practicing mindfulness, connecting with supportive people in your life, and maintaining healthy routines. ";
    insight += "Remember, seeking help is a sign of strength, not weakness.";
    
    return insight;
  }
}

// Utility functions for embedding operations
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
}

// Mock embedding service for development
export const mockEmbeddingService = new EmbeddingService('mock-api-key');