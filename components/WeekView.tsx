import React from 'react';
import { Task, Priority } from '../types';
import { ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

interface WeekViewProps {
  tasks: Task[];
  currentDate: Date;
  onDateChange: (d: Date) => void;
  onEdit: (task: Task) => void;
  checkConflict: (task: Task) => boolean;
}

const WeekView: React.FC<WeekViewProps> = ({ tasks, currentDate, onDateChange, onEdit, checkConflict }) => {
  // Get start of week (Sunday)
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const getTasksForDay = (date: Date) => {
    return tasks.filter(t => {
      const tDate = new Date(t.start);
      return tDate.toDateString() === date.toDateString();
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
           <button onClick={() => {
               const d = new Date(currentDate);
               d.setDate(d.getDate() - 7);
               onDateChange(d);
           }} className="p-1 hover:bg-slate-100 rounded">
               <ChevronLeft size={20}/>
           </button>
           <span className="font-semibold text-slate-700">
               {weekDays[0].toLocaleDateString('zh-CN')} - {weekDays[6].toLocaleDateString('zh-CN')}
           </span>
           <button onClick={() => {
               const d = new Date(currentDate);
               d.setDate(d.getDate() + 7);
               onDateChange(d);
           }} className="p-1 hover:bg-slate-100 rounded">
               <ChevronRight size={20}/>
           </button>
        </div>
        <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-7 h-full min-w-[800px] divide-x divide-slate-100">
            {weekDays.map((day, idx) => {
                const dayTasks = getTasksForDay(day);
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                <div key={idx} className="flex flex-col h-full bg-slate-50/30">
                    <div className={`p-2 text-center text-sm border-b ${isToday ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}>
                    <div className="uppercase text-xs text-slate-400">{day.toLocaleDateString('zh-CN', { weekday: 'short' })}</div>
                    <div>{day.getDate()}</div>
                    </div>
                    <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                    {dayTasks.map(task => {
                        const isConflict = checkConflict(task);
                        return (
                        <div
                            key={task.id}
                            onClick={() => onEdit(task)}
                            className={`p-1.5 rounded text-xs border cursor-pointer truncate transition-all hover:scale-[1.02] relative
                                ${isConflict 
                                    ? 'bg-red-100 border-red-600 border-2 text-red-900 shadow-[0_0_8px_rgba(239,68,68,0.3)] z-10' 
                                    : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                                }
                                ${task.priority === Priority.HIGH && !isConflict ? 'border-l-4 border-l-red-400' : ''}
                                ${task.completed ? 'opacity-50 line-through' : ''}
                            `}
                        >
                            {/* Animated indicator for Week View */}
                            {isConflict && (
                                <div className="absolute -top-1 -right-1 z-20">
                                     <span className="relative flex h-2.5 w-2.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                                    </span>
                                </div>
                            )}

                            <span className="font-semibold block flex items-center gap-1">
                                {isConflict && <AlertCircle size={10} className="text-red-600 shrink-0"/>}
                                {new Date(task.start).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})}
                            </span>
                            {task.title}
                        </div>
                        );
                    })}
                    </div>
                </div>
                );
            })}
            </div>
        </div>
    </div>
  );
};

export default WeekView;