// Speech-to-Text and Text-to-Speech utilities

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechSynthesisOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export class SpeechService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private onResultCallback: ((result: SpeechRecognitionResult) => void) | null = null;

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  private initializeSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0.9;
          const isFinal = result.isFinal;

          if (this.onResultCallback) {
            this.onResultCallback({
              transcript,
              confidence,
              isFinal
            });
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          this.isListening = false;
        };

        this.recognition.onend = () => {
          this.isListening = false;
        };
      }
    }
  }

  private initializeSpeechSynthesis() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  startListening(onResult: (result: SpeechRecognitionResult) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }

      this.onResultCallback = onResult;
      this.isListening = true;

      try {
        this.recognition.start();
        resolve();
      } catch (error) {
        this.isListening = false;
        reject(error);
      }
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.onResultCallback = null;
    }
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  speak(text: string, options: SpeechSynthesisOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set options
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;

      // Set voice if specified
      if (options.voice) {
        const voices = this.synthesis.getVoices();
        const selectedVoice = voices.find(voice => 
          voice.name.includes(options.voice!) || voice.lang.includes(options.voice!)
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  // Utility method to get recommended voice for mental health applications
  getTherapeuticVoice(): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    
    // Prefer female voices with calm, soothing characteristics
    const preferredVoices = voices.filter(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.includes('Female') || 
       voice.name.includes('Samantha') || 
       voice.name.includes('Karen') ||
       voice.name.includes('Moira'))
    );

    return preferredVoices[0] || voices.find(voice => voice.lang.startsWith('en')) || null;
  }

  // Method to speak AI recommendations with therapeutic tone
  async speakRecommendation(text: string): Promise<void> {
    const therapeuticVoice = this.getTherapeuticVoice();
    
    const options: SpeechSynthesisOptions = {
      rate: 0.9, // Slightly slower for clarity
      pitch: 0.9, // Slightly lower pitch for calmness
      volume: 0.8, // Comfortable volume
      voice: therapeuticVoice?.name
    };

    // Add pauses for better comprehension
    const processedText = text
      .replace(/\./g, '... ') // Add pauses after sentences
      .replace(/,/g, ', '); // Add slight pauses after commas

    return this.speak(processedText, options);
  }

  // Method to transcribe audio for journal entries
  async transcribeForJournal(): Promise<string> {
    return new Promise((resolve, reject) => {
      let finalTranscript = '';
      let timeoutId: NodeJS.Timeout;

      const handleResult = (result: SpeechRecognitionResult) => {
        if (result.isFinal) {
          finalTranscript += result.transcript + ' ';
          
          // Reset timeout when we get final results
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            this.stopListening();
            resolve(finalTranscript.trim());
          }, 2000); // Stop after 2 seconds of silence
        }
      };

      // Set initial timeout
      timeoutId = setTimeout(() => {
        this.stopListening();
        if (finalTranscript.trim()) {
          resolve(finalTranscript.trim());
        } else {
          reject(new Error('No speech detected'));
        }
      }, 30000); // Maximum 30 seconds

      this.startListening(handleResult).catch(reject);
    });
  }
}

// Singleton instance
export const speechService = new SpeechService();

// Utility functions
export function formatTranscriptForJournal(transcript: string): string {
  // Clean up the transcript for journal entry
  return transcript
    .replace(/\s+/g, ' ') // Remove extra spaces
    .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
    .replace(/\.\s*\w/g, match => match.toUpperCase()) // Capitalize after periods
    .trim();
}

export function detectEmotionalCues(transcript: string): {
  emotionalWords: string[];
  intensity: 'low' | 'medium' | 'high';
  suggestedMoodScore: number;
} {
  const emotionalWords: string[] = [];
  const words = transcript.toLowerCase().split(/\s+/);
  
  const emotionKeywords = {
    positive: ['happy', 'good', 'great', 'excellent', 'wonderful', 'amazing', 'love', 'joy', 'excited', 'grateful', 'peaceful', 'calm'],
    negative: ['sad', 'bad', 'terrible', 'awful', 'hate', 'depressed', 'anxious', 'worried', 'angry', 'frustrated', 'overwhelmed', 'stressed'],
    intense: ['extremely', 'very', 'really', 'so', 'incredibly', 'absolutely', 'completely', 'totally']
  };

  // Find emotional words
  words.forEach(word => {
    if (emotionKeywords.positive.includes(word) || emotionKeywords.negative.includes(word)) {
      emotionalWords.push(word);
    }
  });

  // Determine intensity
  const intensifiers = words.filter(word => emotionKeywords.intense.includes(word)).length;
  let intensity: 'low' | 'medium' | 'high' = 'low';
  
  if (intensifiers > 2 || emotionalWords.length > 5) {
    intensity = 'high';
  } else if (intensifiers > 0 || emotionalWords.length > 2) {
    intensity = 'medium';
  }

  // Suggest mood score
  const positiveCount = words.filter(word => emotionKeywords.positive.includes(word)).length;
  const negativeCount = words.filter(word => emotionKeywords.negative.includes(word)).length;
  
  let suggestedMoodScore = 50; // neutral baseline
  
  if (positiveCount > negativeCount) {
    suggestedMoodScore = Math.min(90, 60 + (positiveCount - negativeCount) * 10);
  } else if (negativeCount > positiveCount) {
    suggestedMoodScore = Math.max(10, 40 - (negativeCount - positiveCount) * 10);
  }

  return {
    emotionalWords,
    intensity,
    suggestedMoodScore
  };
}