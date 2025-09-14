// Deepseek API integration for AI-powered mental health insights

interface DeepseekResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface MentalHealthContext {
  currentMood: string;
  journalEntry: string;
  moodHistory: number[];
  sentimentAnalysis: any;
  riskLevel: string;
}

export class DeepseekService {
  private apiKey: string;
  private baseUrl: string = 'https://api.deepseek.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateInsights(context: MentalHealthContext): Promise<string> {
    const prompt = this.buildInsightPrompt(context);
    
    try {
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
              content: `You are a compassionate AI mental health assistant. Provide supportive, evidence-based insights and gentle recommendations. Always maintain a caring, non-judgmental tone. Never provide clinical diagnosis or replace professional mental health care. Focus on wellness, coping strategies, and positive support.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`Deepseek API error: ${response.status}`);
      }

      const data: DeepseekResponse = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling Deepseek API:', error);
      // Fallback response
      return this.generateFallbackResponse(context);
    }
  }

  async generateCopingStrategies(context: MentalHealthContext): Promise<string[]> {
    const prompt = `Based on the following mental health context, suggest 3-5 specific, actionable coping strategies:
    
Current mood: ${context.currentMood}
Risk level: ${context.riskLevel}
Recent journal entry: "${context.journalEntry}"
Mood trend: ${this.analyzeTrend(context.moodHistory)}

Provide practical, evidence-based coping strategies that are appropriate for this situation. Focus on techniques that can be immediately implemented.`;

    try {
      const response = await this.callDeepseekAPI(prompt);
      // Parse the response to extract individual strategies
      return this.parseStrategies(response);
    } catch (error) {
      console.error('Error generating coping strategies:', error);
      return this.getFallbackStrategies(context.riskLevel);
    }
  }

  async generateInterventionPlan(context: MentalHealthContext): Promise<{
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    resources: string[];
  }> {
    const prompt = `Create a comprehensive intervention plan for someone with:
    
Current mood: ${context.currentMood}
Risk level: ${context.riskLevel}
Mood trend: ${this.analyzeTrend(context.moodHistory)}
Sentiment analysis: ${JSON.stringify(context.sentimentAnalysis)}

Provide a structured plan with:
1. Immediate actions (next 24 hours)
2. Short-term goals (next week)
3. Long-term strategies (next month)
4. Resources and support options

Format as JSON with these categories.`;

    try {
      const response = await this.callDeepseekAPI(prompt);
      return this.parseInterventionPlan(response);
    } catch (error) {
      console.error('Error generating intervention plan:', error);
      return this.getFallbackInterventionPlan(context.riskLevel);
    }
  }

  private buildInsightPrompt(context: MentalHealthContext): string {
    return `Please analyze this mental health check-in and provide supportive insights:

Current mood: ${context.currentMood}
Journal entry: "${context.journalEntry}"
Recent mood scores (1-100): [${context.moodHistory.join(', ')}]
Risk level: ${context.riskLevel}
Sentiment analysis: ${JSON.stringify(context.sentimentAnalysis)}

Please provide:
1. A compassionate acknowledgment of their current state
2. Observations about patterns or trends
3. Gentle, actionable recommendations
4. Encouragement and positive reinforcement
5. When to seek additional support

Keep the tone warm, supportive, and hopeful while being informative.`;
  }

  private async callDeepseekAPI(prompt: string): Promise<string> {
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
            content: 'You are a knowledgeable mental health AI assistant providing evidence-based support and guidance.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error(`Deepseek API error: ${response.status}`);
    }

    const data: DeepseekResponse = await response.json();
    return data.choices[0].message.content;
  }

  private analyzeTrend(moodHistory: number[]): string {
    if (moodHistory.length < 2) return 'insufficient data';
    
    const recent = moodHistory.slice(-7); // Last 7 days
    const older = moodHistory.slice(-14, -7); // Previous 7 days
    
    if (older.length === 0) return 'new data';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 10) return 'improving significantly';
    if (diff > 5) return 'improving gradually';
    if (diff < -10) return 'declining significantly';
    if (diff < -5) return 'declining gradually';
    return 'stable';
  }

  private parseStrategies(response: string): string[] {
    // Extract numbered list or bullet points from response
    const lines = response.split('\n').filter(line => line.trim());
    const strategies: string[] = [];
    
    for (const line of lines) {
      // Match numbered lists (1. 2. etc.) or bullet points
      const match = line.match(/^\d+\.\s*(.+)$/) || line.match(/^[•\-\*]\s*(.+)$/);
      if (match) {
        strategies.push(match[1].trim());
      }
    }
    
    // If no structured list found, split by sentences
    if (strategies.length === 0) {
      return response.split('.').filter(s => s.trim().length > 10).slice(0, 5);
    }
    
    return strategies.slice(0, 5);
  }

  private parseInterventionPlan(response: string): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    resources: string[];
  } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return parsed;
    } catch {
      // Fallback to text parsing
      return {
        immediate: ['Take slow, deep breaths', 'Ensure you are in a safe environment'],
        shortTerm: ['Maintain daily routine', 'Connect with support system'],
        longTerm: ['Develop consistent coping strategies', 'Regular mental health check-ins'],
        resources: ['Crisis hotline: 988', 'Mental health apps', 'Community support groups']
      };
    }
  }

  private generateFallbackResponse(context: MentalHealthContext): string {
    const moodMessages = {
      excellent: "It's wonderful to see you feeling so positive! This is a great foundation to build upon.",
      good: "You're in a good place right now, which shows your resilience and strength.",
      neutral: "Neutral feelings are completely normal and valid. Every day doesn't need to be amazing.",
      low: "I hear that you're going through a challenging time. Your feelings are valid and temporary.",
      poor: "Thank you for sharing how you're feeling. Reaching out shows tremendous courage."
    };

    const riskResponses = {
      low: "Keep up the positive momentum with healthy habits and self-care.",
      moderate: "Consider implementing some additional coping strategies and staying connected with your support system.",
      high: "Please prioritize self-care and don't hesitate to reach out to a mental health professional if needed."
    };

    return `${moodMessages[context.currentMood as keyof typeof moodMessages] || moodMessages.neutral}

Based on your recent journal entry and mood patterns, ${riskResponses[context.riskLevel as keyof typeof riskResponses]}

Remember that seeking support is a sign of strength, not weakness. You're taking positive steps by monitoring your mental health and reflecting on your experiences.`;
  }

  private getFallbackStrategies(riskLevel: string): string[] {
    const strategies = {
      low: [
        'Continue with regular exercise and outdoor activities',
        'Practice gratitude by writing down three good things each day',
        'Maintain social connections with friends and family',
        'Keep a consistent sleep schedule'
      ],
      moderate: [
        'Try the 4-7-8 breathing technique when feeling stressed',
        'Take short breaks every hour to stretch or walk',
        'Practice mindfulness meditation for 10 minutes daily',
        'Limit caffeine and alcohol consumption',
        'Engage in a creative or enjoyable hobby'
      ],
      high: [
        'Focus on basic needs: eat, hydrate, rest',
        'Use grounding techniques (5-4-3-2-1 sensory method)',
        'Reach out to a trusted friend, family member, or counselor',
        'Consider contacting a mental health crisis line',
        'Avoid making major decisions while in distress'
      ]
    };

    return strategies[riskLevel as keyof typeof strategies] || strategies.moderate;
  }

  private getFallbackInterventionPlan(riskLevel: string): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    resources: string[];
  } {
    const plans = {
      low: {
        immediate: ['Continue current wellness practices', 'Celebrate today\'s positive moments'],
        shortTerm: ['Maintain regular exercise routine', 'Keep up healthy sleep schedule'],
        longTerm: ['Build resilience through mindfulness practice', 'Strengthen social connections'],
        resources: ['Mental health apps', 'Wellness podcasts', 'Community groups']
      },
      moderate: {
        immediate: ['Practice deep breathing', 'Ensure basic needs are met'],
        shortTerm: ['Implement stress management techniques', 'Schedule regular self-care'],
        longTerm: ['Consider counseling or therapy', 'Develop coping skill toolkit'],
        resources: ['Therapist directory', 'Mental health apps', 'Support groups']
      },
      high: {
        immediate: ['Ensure safety', 'Contact support system', 'Consider professional help'],
        shortTerm: ['Schedule mental health appointment', 'Daily wellness check-ins'],
        longTerm: ['Ongoing therapy or counseling', 'Medication evaluation if needed'],
        resources: ['Crisis hotline: 988', 'Emergency services: 911', 'Local mental health centers']
      }
    };

    return plans[riskLevel as keyof typeof plans] || plans.moderate;
  }
}

// Mock implementation for development
export const mockDeepseekService = new DeepseekService('mock-api-key');