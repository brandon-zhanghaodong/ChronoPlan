import { Task, RecurrenceFrequency } from '../types';

/**
 * Generates virtual task instances for a specific time range based on recurrence rules.
 */
export const generateRecurringTasks = (
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date
): Task[] => {
  const result: Task[] = [];

  tasks.forEach((task) => {
    // If not recurring, just check if it falls in range
    if (!task.recurrence || task.recurrence.frequency === RecurrenceFrequency.NONE) {
      const taskStart = new Date(task.start);
      if (taskStart < rangeEnd && new Date(task.end) > rangeStart) {
        result.push(task);
      }
      return;
    }

    // Handle Recurrence
    const { frequency, interval = 1, until } = task.recurrence;
    const taskDuration = new Date(task.end).getTime() - new Date(task.start).getTime();
    let currentStart = new Date(task.start);
    const untilDate = until ? new Date(until) : null;

    // Safety break for infinite loops
    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (
        currentStart < rangeEnd && 
        (!untilDate || currentStart <= untilDate) && 
        iterations < MAX_ITERATIONS
    ) {
      iterations++;

      const currentEnd = new Date(currentStart.getTime() + taskDuration);

      // Check if this instance overlaps with the view range
      if (currentStart < rangeEnd && currentEnd > rangeStart) {
        const startIso = currentStart.toISOString();
        
        // Check if this specific instance is marked as completed
        const isInstanceCompleted = task.completedInstances?.includes(startIso) || false;

        result.push({
          ...task,
          id: `${task.id}::${startIso}`, // Virtual ID
          start: startIso,
          end: currentEnd.toISOString(),
          completed: isInstanceCompleted, // Override master completion status
        });
      }

      // Advance to next interval
      switch (frequency) {
        case RecurrenceFrequency.DAILY:
          currentStart.setDate(currentStart.getDate() + interval);
          break;
        case RecurrenceFrequency.WEEKLY:
          currentStart.setDate(currentStart.getDate() + (7 * interval));
          break;
        case RecurrenceFrequency.MONTHLY:
          currentStart.setMonth(currentStart.getMonth() + interval);
          break;
        case RecurrenceFrequency.YEARLY:
          currentStart.setFullYear(currentStart.getFullYear() + interval);
          break;
      }
    }
  });

  return result;
};

/**
 * Helper to parse a virtual ID back to the original task ID and instance date
 */
export const parseVirtualId = (virtualId: string): { originalId: string; instanceDate: string | null } => {
  const parts = virtualId.split('::');
  if (parts.length === 2) {
    return { originalId: parts[0], instanceDate: parts[1] };
  }
  return { originalId: virtualId, instanceDate: null };
};