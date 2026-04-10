import { z } from 'zod';

// Auth Schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// Journal Schemas
export const journalSaveSchema = z.object({
  id: z.number().nullable().optional(),
  content: z.string().optional().default(''),
  title: z.string().optional(),
  mood: z.string().optional().nullable(),
  date: z.string().optional(), // YYYY-MM-DD
  is_draft: z.number().min(0).max(1).optional(),
});

export const journalUpdateSchema = z.object({
  id: z.number(),
  content: z.string().min(1, 'Content cannot be empty'),
  title: z.string().optional(),
});

// Habit Schemas
export const habitSchema = z.object({
  name: z.string().min(1, 'Habit name is required').max(100),
});

export const habitStatusSchema = z.object({
  status: z.number().min(0).max(1),
});

// Reminder Schemas
export const reminderSchema = z.object({
  title: z.string().min(1, 'Reminder title is required').max(200),
  time: z.string().optional().nullable(),
});

export const reminderStatusSchema = z.object({
  completed: z.boolean(),
});

// AI Insight Schemas
export const saveInsightSchema = z.object({
  insight: z.any(), // AnalysisResponse structure
  journal_id: z.number().optional().nullable(),
  scores: z.object({
    emotional_stability: z.number().min(0).max(100),
    productivity: z.number().min(0).max(100),
    consistency: z.number().min(0).max(100),
    life_balance: z.number().min(0).max(100),
  }).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type JournalSaveInput = z.infer<typeof journalSaveSchema>;
export type HabitInput = z.infer<typeof habitSchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;
