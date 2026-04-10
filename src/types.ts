export interface User {
  id: number;
  email: string;
  name: string;
}

export interface DailyInsight {
  mood_summary: string;
  key_activities: string[];
  emotional_tone: string;
  effort_level: string;
  growth_nugget: string;
}

export interface WeeklyReview {
  effort_consistency_summary: string;
  emotional_trend_summary: string;
  observed_strengths: string[];
  areas_needing_attention: string[];
  improvement_suggestions: string[];
}

export interface MonthlyReview {
  productivity_pattern_analysis: string;
  emotional_stability_pattern: string;
  dominant_life_focus_area: string;
  most_neglected_area: string;
  top_strengths_developed: string[];
  top_growth_gaps: string[];
  monthly_performance_score: string;
}

export interface ThreeMonthAnalysis {
  behavioral_evolution: string;
  discipline_growth_trend: string;
  emotional_maturity_shift: string;
  burnout_risk_detection: string;
  estimated_growth_percentage: string;
  strategic_improvement_roadmap: string[];
}

export interface SixMonthReview {
  identity_transformation_summary: string;
  most_consistent_behavior: string;
  most_unstable_pattern: string;
  life_balance_evaluation: string;
  sustainability_score: string;
}

export interface AnnualReflection {
  overall_life_balance_summary: string;
  strongest_growth_area: string;
  most_neglected_life_area: string;
  emotional_journey_narrative: string;
  personality_insights: string[];
  closing_message: string;
}

export interface AnalysisResponse {
  daily_insight?: DailyInsight;
  weekly_review?: WeeklyReview;
  monthly_review?: MonthlyReview;
  three_month_analysis?: ThreeMonthAnalysis;
  six_month_review?: SixMonthReview;
  annual_reflection?: AnnualReflection;
  scores?: {
    consistency_score: number;
    emotional_stability_score: number;
    productivity_index: number;
    life_balance_score: number;
  };
}

export interface Habit {
  id: number;
  name: string;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: number;
  title: string;
  time: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Score {
  id: number;
  entry_id: number;
  consistency_score: number;
  emotional_stability_score: number;
  productivity_index: number;
  life_balance_score: number;
  created_at: string;
}

export interface CoachMessage {
  role: 'user' | 'model';
  text: string;
}
