export enum Priority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum ViewMode {
  DAY = 'Day',
  WEEK = 'Week',
  LIST = 'List',
}

export enum RecurrenceFrequency {
  NONE = 'None',
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
  YEARLY = 'Yearly',
}

export const PriorityMap: Record<Priority, string> = {
  [Priority.HIGH]: '高',
  [Priority.MEDIUM]: '中',
  [Priority.LOW]: '低',
};

export const FrequencyMap: Record<RecurrenceFrequency, string> = {
  [RecurrenceFrequency.NONE]: '不重复',
  [RecurrenceFrequency.DAILY]: '每天',
  [RecurrenceFrequency.WEEKLY]: '每周',
  [RecurrenceFrequency.MONTHLY]: '每月',
  [RecurrenceFrequency.YEARLY]: '每年',
};

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  interval: number; // e.g., 1 for "every day", 2 for "every 2 days"
  until?: string;   // ISO Date String for end of recurrence
}

export interface Task {
  id: string;
  title: string;
  description: string;
  start: string; // ISO Date String
  end: string;   // ISO Date String
  priority: Priority;
  reminderMinutes: number;
  completed: boolean;
  
  // Recurrence fields
  recurrence?: RecurrenceConfig;
  completedInstances?: string[]; // List of start times (ISO strings) for completed instances of a recurring task
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingTaskIds: string[];
}