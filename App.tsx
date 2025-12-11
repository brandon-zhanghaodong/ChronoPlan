
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Calendar as CalendarIcon, List, LayoutGrid, Clock, Search, Sparkles, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, MapPin } from 'lucide-react';
import { Task, ViewMode, RecurrenceFrequency, WeatherInfo } from './types';
import { loadTasks, saveTasks } from './services/storageService';
import { generateRecurringTasks, parseVirtualId } from './services/recurrenceService';
import { fetchLocalWeather } from './services/weatherService';
import TaskForm from './components/TaskForm';
import DayView from './components/DayView';
import WeekView from './components/WeekView';
import ListView from './components/ListView';
import ReminderToast from './components/ReminderToast';
import AiPlannerModal from './components/AiPlannerModal';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DAY);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Weather State
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  
  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAiPlannerOpen, setIsAiPlannerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  
  // Notification State
  const [activeReminder, setActiveReminder] = useState<Task | null>(null);
  const [notifiedTaskIds, setNotifiedTaskIds] = useState<Set<string>>(new Set());

  // Load initial data
  useEffect(() => {
    setTasks(loadTasks());
    
    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    // Fetch Weather
    fetchLocalWeather().then(setWeather).catch(err => console.warn("Weather load failed", err));
  }, []);

  // Save on change
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // Compute tasks visible in the current view (expanding recurring tasks)
  const visibleTasks = useMemo(() => {
    let tasksToDisplay: Task[];

    if (viewMode === ViewMode.LIST) {
        // List view shows master tasks + filtered instances could be complex.
        // For simplicity, List View shows all tasks stored (Master definitions).
        tasksToDisplay = tasks;
    } else {
        let start: Date;
        let end: Date;

        if (viewMode === ViewMode.DAY) {
            start = new Date(currentDate); 
            start.setHours(0,0,0,0);
            end = new Date(currentDate); 
            end.setHours(23,59,59,999);
        } else {
            // Week view range
            const s = new Date(currentDate); 
            s.setDate(s.getDate() - s.getDay()); // Start of week (Sunday)
            s.setHours(0,0,0,0);
            start = s;
            
            const e = new Date(s); 
            e.setDate(e.getDate() + 7); // End of week
            end = e;
        }
        tasksToDisplay = generateRecurringTasks(tasks, start, end);
    }

    // Apply Search Filter
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return tasksToDisplay.filter(t => 
            t.title.toLowerCase().includes(query) || 
            t.description.toLowerCase().includes(query)
        );
    }

    return tasksToDisplay;
  }, [tasks, viewMode, currentDate, searchQuery]);

  // Timer for Reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      // Generate instances for "Today" specifically for reminders check
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      const tasksForReminders = generateRecurringTasks(tasks, todayStart, todayEnd);

      tasksForReminders.forEach(task => {
        if (task.completed || notifiedTaskIds.has(task.id)) return;
        
        const startTime = new Date(task.start).getTime();
        const reminderTime = startTime - (task.reminderMinutes * 60 * 1000);
        
        // Trigger if time is passed within last minute tolerance
        if (now.getTime() >= reminderTime && now.getTime() < startTime + 60000) {
            setActiveReminder(task);
            setNotifiedTaskIds(prev => new Set(prev).add(task.id));
            
            // Native Notification
            if (Notification.permission === 'granted') {
               new Notification(`任务提醒: ${task.title}`, {
                 body: `开始时间: ${new Date(task.start).toLocaleTimeString()}`
               });
            }
            
            // Audio Cue
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {}); // catch play errors (user interaction policy)
        }
      });
    };

    const intervalId = setInterval(checkReminders, 10000); // Check every 10s
    return () => clearInterval(intervalId);
  }, [tasks, notifiedTaskIds]);

  // Conflict Logic
  const checkConflict = useCallback((task: Task) => {
    const { originalId: currentOriginalId } = parseVirtualId(task.id);

    return visibleTasks.some((t) => {
      // Don't check against self or instances of same task
      const { originalId: otherOriginalId } = parseVirtualId(t.id);
      if (currentOriginalId === otherOriginalId) return false;
      
      if (t.completed || task.completed) return false;

      const t1Start = new Date(task.start).getTime();
      const t1End = new Date(task.end).getTime();
      const t2Start = new Date(t.start).getTime();
      const t2End = new Date(t.end).getTime();

      return (t1Start < t2End && t1End > t2Start);
    });
  }, [visibleTasks]);

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'completed'>) => {
    if (editingTask) {
       // Update existing
       setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
    } else {
       // Create new
       const newTask: Task = {
           id: crypto.randomUUID(),
           completed: false,
           ...taskData
       };
       setTasks(prev => [...prev, newTask]);
    }
    setEditingTask(undefined);
  };

  const handleBatchImport = (newTasks: any[]) => {
      const formattedTasks: Task[] = newTasks.map(t => ({
          id: crypto.randomUUID(),
          title: t.title,
          description: t.description || '',
          start: t.start,
          end: t.end,
          priority: t.priority,
          reminderMinutes: t.reminderMinutes || 15,
          recurrence: t.recurrence,
          completed: false
      }));
      setTasks(prev => [...prev, ...formattedTasks]);
  };

  const handleEditTask = (task: Task) => {
      // If clicking a virtual instance, find the master task to edit the series
      const { originalId } = parseVirtualId(task.id);
      const masterTask = tasks.find(t => t.id === originalId);
      if (masterTask) {
          setEditingTask(masterTask);
          setIsFormOpen(true);
      }
  };

  const handleDeleteTask = (id: string) => {
      const { originalId } = parseVirtualId(id);
      if (confirm('确认删除？如果是重复任务，将删除整个系列。')) {
          setTasks(prev => prev.filter(t => t.id !== originalId));
          setIsFormOpen(false);
      }
  };

  const handleToggleComplete = (task: Task) => {
      const { originalId, instanceDate } = parseVirtualId(task.id);
      
      setTasks(prev => prev.map(t => {
          if (t.id !== originalId) return t;

          // If it's a recurring instance, toggle its specific date in completedInstances
          if (instanceDate) {
              const completedInstances = t.completedInstances || [];
              const isCompleted = completedInstances.includes(instanceDate);
              
              return {
                  ...t,
                  completedInstances: isCompleted 
                    ? completedInstances.filter(d => d !== instanceDate)
                    : [...completedInstances, instanceDate]
              };
          }

          // Regular task
          return { ...t, completed: !t.completed };
      }));
  };

  const getWeatherIcon = (code: number) => {
      if (code === 0) return <Sun className="text-amber-500" />;
      if (code >= 61 && code <= 65) return <CloudRain className="text-blue-500" />;
      if (code >= 71) return <CloudSnow className="text-cyan-500" />;
      if (code >= 95) return <CloudLightning className="text-purple-500" />;
      return <Cloud className="text-slate-400" />;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 shadow-sm">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <LayoutGrid size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">智能规划助手</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setViewMode(ViewMode.DAY)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium
              ${viewMode === ViewMode.DAY ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Clock size={20} />
            日视图
          </button>
          <button 
            onClick={() => setViewMode(ViewMode.WEEK)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium
              ${viewMode === ViewMode.WEEK ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <CalendarIcon size={20} />
            周视图
          </button>
          <button 
            onClick={() => setViewMode(ViewMode.LIST)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium
              ${viewMode === ViewMode.LIST ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <List size={20} />
            所有任务
          </button>
        </nav>

        {/* Mini Weather Widget in Sidebar Bottom (Optional fallback) or Footer */}
        <div className="p-4 border-t border-slate-100">
           <div className="text-xs text-slate-400 text-center">
              &copy; {new Date().getFullYear()} ChronoPlan AI
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10 gap-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-800">
              {viewMode === ViewMode.DAY && currentDate.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
              {viewMode === ViewMode.WEEK && '本周概览'}
              {viewMode === ViewMode.LIST && '任务管理'}
            </h2>
            
            {/* Weather Widget */}
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                <span>当前显示 {visibleTasks.length} 个任务</span>
                {weather ? (
                    <>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <div className="flex items-center gap-1.5 animate-in fade-in duration-500">
                            {getWeatherIcon(weather.weatherCode)}
                            <span className="font-semibold text-slate-800">{weather.temperature}°C</span>
                            <span>{weather.weatherText}</span>
                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 ml-1">
                                {weather.clothingAdvice}
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin size={12} />
                        <span>获取天气信息中...</span>
                    </div>
                )}
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Search Bar */}
             <div className="relative hidden md:block">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input 
                    type="text" 
                    placeholder="搜索任务..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
                />
             </div>

             <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

             <button 
              onClick={() => setIsAiPlannerOpen(true)}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 px-4 py-2.5 rounded-full font-medium flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap"
            >
              <Sparkles size={18} />
              AI 智能导入
            </button>

             <button 
              onClick={() => {
                setEditingTask(undefined);
                setIsFormOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-medium shadow-md shadow-indigo-200 flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap"
            >
              <Plus size={20} />
              新建任务
            </button>
          </div>
        </header>

        {/* View Area */}
        <div className="flex-1 overflow-hidden p-6 bg-slate-50/50 relative">
          {viewMode === ViewMode.DAY && (
            <DayView 
              tasks={visibleTasks} 
              date={currentDate} 
              onEdit={handleEditTask}
              checkConflict={checkConflict}
            />
          )}
          
          {viewMode === ViewMode.WEEK && (
            <WeekView 
              tasks={visibleTasks} 
              currentDate={currentDate} 
              onDateChange={setCurrentDate}
              onEdit={handleEditTask}
              checkConflict={checkConflict}
              weather={weather}
            />
          )}
          
          {viewMode === ViewMode.LIST && (
            <ListView 
              tasks={visibleTasks}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onToggleComplete={handleToggleComplete}
              checkConflict={checkConflict}
            />
          )}
        </div>
      </main>

      {/* Modals & Overlays */}
      <TaskForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSave={handleSaveTask}
        initialData={editingTask}
      />

      <AiPlannerModal 
        isOpen={isAiPlannerOpen} 
        onClose={() => setIsAiPlannerOpen(false)}
        onImportTasks={handleBatchImport}
      />

      {activeReminder && (
        <ReminderToast 
          task={activeReminder} 
          onDismiss={() => {
              setActiveReminder(null);
          }} 
        />
      )}
    </div>
  );
}

export default App;
