import React from 'react';
import { Task, Priority } from '../types';
import { Clock, AlertCircle } from 'lucide-react';

interface DayViewProps {
  tasks: Task[];
  date: Date;
  onEdit: (task: Task) => void;
  checkConflict: (task: Task) => boolean;
}

const DayView: React.FC<DayViewProps> = ({ tasks, date, onEdit, checkConflict }) => {
  // Filter tasks for this day
  const dayTasks = tasks.filter(task => {
    const taskDate = new Date(task.start);
    return (
      taskDate.getDate() === date.getDate() &&
      taskDate.getMonth() === date.getMonth() &&
      taskDate.getFullYear() === date.getFullYear()
    );
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Helper to calculate position
  const getPositionStyles = (task: Task) => {
    const start = new Date(task.start);
    const end = new Date(task.end);
    
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    return {
      top: `${(startMinutes / 1440) * 100}%`,
      height: `${Math.max((durationMinutes / 1440) * 100, 2.5)}%`, // Minimum height visual
    };
  };

  return (
    <div className="relative h-full overflow-y-auto bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="h-[1440px] relative min-w-[600px]">
        {/* Time Grid */}
        {hours.map((hour) => (
          <div key={hour} className="absolute w-full border-t border-slate-100 flex items-start" style={{ top: `${(hour / 24) * 100}%`, height: `${100 / 24}%` }}>
            <span className="text-xs text-slate-400 w-12 text-right pr-2 -mt-2 bg-white z-10">
              {hour.toString().padStart(2, '0')}:00
            </span>
          </div>
        ))}

        {/* Current Time Line (if today) */}
        {date.toDateString() === new Date().toDateString() && (
          <div 
            className="absolute w-full border-t-2 border-red-400 z-20 pointer-events-none"
            style={{ top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 1440) * 100}%` }}
          >
             <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-400 rounded-full"></div>
          </div>
        )}

        {/* Tasks */}
        {dayTasks.map((task) => {
          const isConflict = checkConflict(task);
          const styles = getPositionStyles(task);
          
          return (
            <div
              key={task.id}
              onClick={() => onEdit(task)}
              style={styles}
              className={`absolute left-14 right-4 rounded p-2 text-xs border cursor-pointer hover:z-50 hover:shadow-xl transition-all
                ${isConflict 
                    ? 'border-red-600 border-2 bg-red-100 z-20 shadow-[0_0_10px_rgba(220,38,38,0.4)]' 
                    : 'border-indigo-200 bg-indigo-50/90 z-0'
                }
                ${task.priority === Priority.HIGH && !isConflict ? 'bg-amber-50 border-amber-300' : ''}
                ${task.completed ? 'opacity-50 grayscale' : ''}
              `}
            >
              {/* Flashing Warning Icon for Conflict */}
              {isConflict && (
                <div className="absolute -top-2 -right-2 z-30">
                    <span className="relative flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-white items-center justify-center shadow-sm">
                        <AlertCircle size={12} className="text-white" />
                      </span>
                    </span>
                </div>
              )}

              <div className="flex justify-between items-start h-full overflow-hidden">
                <div className="flex flex-col">
                    <span className={`font-semibold ${isConflict ? 'text-red-900' : 'text-indigo-900'}`}>
                        {isConflict && <span className="text-red-700 mr-1 font-bold">!</span>}
                        {task.title}
                    </span>
                    <span className={`text-xs ${isConflict ? 'text-red-800' : 'text-slate-500'}`}>
                        {new Date(task.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                        {new Date(task.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
                {task.priority === Priority.HIGH && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1"></span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayView;