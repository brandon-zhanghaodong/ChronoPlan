import React from 'react';
import { Task, Priority, RecurrenceFrequency, PriorityMap, FrequencyMap } from '../types';
import { CheckCircle2, Circle, AlertTriangle, Calendar, Clock, Trash2, Repeat } from 'lucide-react';

interface ListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (task: Task) => void;
  checkConflict: (task: Task) => boolean;
}

const ListView: React.FC<ListViewProps> = ({ tasks, onEdit, onDelete, onToggleComplete, checkConflict }) => {
  // Sort tasks: Incomplete first, then by date, then by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  if (sortedTasks.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Calendar size={48} className="mb-4 opacity-50"/>
              <p>暂无任务，请添加新任务。</p>
          </div>
      )
  }

  return (
    <div className="h-full overflow-y-auto bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <div className="space-y-3">
        {sortedTasks.map((task) => {
          // For recurring master tasks in List View, conflict checking against everything else is complex.
          // We disable conflict checking for master tasks in list view to avoid performance issues 
          // or confusing signals about future conflicts.
          const isRecurring = task.recurrence && task.recurrence.frequency !== RecurrenceFrequency.NONE;
          const isConflict = !isRecurring && checkConflict(task);
          
          return (
            <div
              key={task.id}
              className={`flex items-center gap-4 p-3 rounded-lg border transition-all hover:bg-slate-50
                ${isConflict ? 'border-red-200 bg-red-50/50' : 'border-slate-100'}
                ${task.completed ? 'opacity-60 bg-slate-50' : ''}
              `}
            >
              <button
                disabled={isRecurring} // Disable completion for master recurring tasks in list view
                onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
                className={`shrink-0 ${isRecurring ? 'opacity-30 cursor-not-allowed' : ''} ${task.completed ? 'text-green-500' : 'text-slate-300 hover:text-indigo-500'}`}
                title={isRecurring ? "请在日/周视图中完成特定日期的任务" : "标记完成"}
              >
                {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </button>

              <div className="flex-1 cursor-pointer" onClick={() => onEdit(task)}>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-semibold text-slate-800 ${task.completed ? 'line-through' : ''}`}>
                    {task.title}
                  </h3>
                  {isRecurring && (
                      <span className="text-xs flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                          <Repeat size={10} /> {FrequencyMap[task.recurrence!.frequency]}
                      </span>
                  )}
                  {isConflict && !task.completed && (
                    <span className="text-xs flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={12} /> 时间冲突
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide
                    ${task.priority === Priority.HIGH ? 'bg-red-100 text-red-700' : 
                      task.priority === Priority.MEDIUM ? 'bg-amber-100 text-amber-700' : 
                      'bg-green-100 text-green-700'}
                  `}>
                    {PriorityMap[task.priority]}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                     <Calendar size={12}/> {new Date(task.start).toLocaleDateString('zh-CN')}
                  </span>
                  <span className="flex items-center gap-1">
                     <Clock size={12}/> {new Date(task.start).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})} - 
                     {new Date(task.end).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="删除任务"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ListView;