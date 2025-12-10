import React, { useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Task } from '../types';

interface ReminderToastProps {
  task: Task;
  onDismiss: () => void;
}

const ReminderToast: React.FC<ReminderToastProps> = ({ task, onDismiss }) => {
  useEffect(() => {
    // Auto dismiss after 10 seconds
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-bounce-in">
      <div className="bg-white border-l-4 border-indigo-500 shadow-xl rounded-r-lg p-4 flex items-start gap-3 w-80">
        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
          <Bell size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-800 text-sm">任务提醒</h4>
          <p className="text-gray-900 font-medium truncate">{task.title}</p>
          <p className="text-gray-500 text-xs">
            开始时间: {new Date(task.start).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default ReminderToast;