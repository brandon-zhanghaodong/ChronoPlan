import React, { useState, useEffect } from 'react';
import { X, Mic, Sparkles, Loader2, Repeat } from 'lucide-react';
import { Task, Priority, RecurrenceFrequency, PriorityMap, FrequencyMap } from '../types';
import { parseTaskFromText } from '../services/geminiService';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'completed'>) => void;
  initialData?: Task;
}

const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  
  // Recurrence State
  const [freq, setFreq] = useState<RecurrenceFrequency>(RecurrenceFrequency.NONE);
  const [interval, setInterval] = useState(1);
  const [until, setUntil] = useState('');

  // AI & Voice State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setStart(new Date(initialData.start).toISOString().slice(0, 16));
        setEnd(new Date(initialData.end).toISOString().slice(0, 16));
        setPriority(initialData.priority);
        setReminderMinutes(initialData.reminderMinutes);
        
        if (initialData.recurrence) {
            setFreq(initialData.recurrence.frequency);
            setInterval(initialData.recurrence.interval);
            setUntil(initialData.recurrence.until ? new Date(initialData.recurrence.until).toISOString().slice(0, 10) : ''); // Date only for Until input
        } else {
            setFreq(RecurrenceFrequency.NONE);
            setInterval(1);
            setUntil('');
        }

      } else {
        // Defaults
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15); // Snap to next 15 min
        setStart(now.toISOString().slice(0, 16));
        
        const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
        setEnd(nextHour.toISOString().slice(0, 16));
        
        setTitle('');
        setDescription('');
        setPriority(Priority.MEDIUM);
        setReminderMinutes(15);
        setFreq(RecurrenceFrequency.NONE);
        setInterval(1);
        setUntil('');
        setAiPrompt('');
        setShowAiInput(false);
      }
    }
  }, [isOpen, initialData]);

  // Handle Speech to Text for AI Prompt
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("您的浏览器不支持语音识别 API");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-CN';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAiPrompt(transcript);
    };

    recognition.start();
  };

  const handleAiParse = async () => {
    if (!aiPrompt.trim()) return;
    setIsProcessingAi(true);
    try {
      const parsed = await parseTaskFromText(aiPrompt);
      if (parsed) {
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.start) setStart(new Date(parsed.start).toISOString().slice(0, 16));
        if (parsed.end) setEnd(new Date(parsed.end).toISOString().slice(0, 16));
        if (parsed.priority) setPriority(parsed.priority);
        if (parsed.reminderMinutes !== undefined) setReminderMinutes(parsed.reminderMinutes);
        
        if (parsed.recurrence) {
            setFreq(parsed.recurrence.frequency);
            setInterval(parsed.recurrence.interval || 1);
            if (parsed.recurrence.until) {
                setUntil(new Date(parsed.recurrence.until).toISOString().slice(0, 10));
            }
        }

        setShowAiInput(false); // Close AI panel on success
      }
    } catch (e) {
      alert("AI 识别失败");
    } finally {
      setIsProcessingAi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(start) >= new Date(end)) {
      alert("结束时间必须晚于开始时间");
      return;
    }
    
    const recurrence = freq !== RecurrenceFrequency.NONE ? {
        frequency: freq,
        interval: Math.max(1, interval),
        until: until ? new Date(until).toISOString() : undefined
    } : undefined;

    onSave({
      title,
      description,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      priority,
      reminderMinutes,
      recurrence
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-4 border-b flex justify-between items-center bg-indigo-50">
          <h2 className="text-xl font-bold text-indigo-900">
            {initialData ? '编辑任务' : '新建任务'}
          </h2>
          <div className="flex gap-2">
             {!initialData && (
                <button 
                  onClick={() => setShowAiInput(!showAiInput)}
                  className={`p-2 rounded-full transition-colors ${showAiInput ? 'bg-indigo-200 text-indigo-700' : 'bg-white text-indigo-600 hover:bg-indigo-100'}`}
                  title="AI 智能填写"
                >
                  <Sparkles size={18} />
                </button>
             )}
            <button onClick={onClose} className="p-2 hover:bg-indigo-200 rounded-full text-indigo-900">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 custom-scrollbar">
          
          {/* AI Input Section */}
          {showAiInput && (
            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 animate-in slide-in-from-top-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                描述你的任务 (支持语音)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="例如：'每周一上午10点开周会'"
                  className="flex-1 p-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-md border ${isListening ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  title="点击说话"
                >
                   <Mic size={18} />
                </button>
                <button
                  onClick={handleAiParse}
                  disabled={isProcessingAi || !aiPrompt}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16}/>}
                  识别
                </button>
              </div>
            </div>
          )}

          {/* Standard Form */}
          <form id="taskForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">任务标题</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                <input
                  required
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                <input
                  required
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* Recurrence Section */}
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                    <Repeat size={16} className="text-slate-500"/>
                    <label className="text-sm font-medium text-gray-700">重复设置</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={freq}
                        onChange={(e) => setFreq(e.target.value as RecurrenceFrequency)}
                        className="p-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {Object.values(RecurrenceFrequency).map(f => (
                            <option key={f} value={f}>{FrequencyMap[f]}</option>
                        ))}
                    </select>
                    
                    {freq !== RecurrenceFrequency.NONE && (
                        <div className="flex gap-2 items-center">
                            <span className="text-xs text-slate-500 whitespace-nowrap">每</span>
                            <input 
                                type="number" 
                                min="1" 
                                value={interval} 
                                onChange={(e) => setInterval(Number(e.target.value))}
                                className="w-16 p-2 border rounded-md text-sm outline-none"
                            />
                            <span className="text-xs text-slate-500">
                                {freq === RecurrenceFrequency.DAILY ? '天' : 
                                 freq === RecurrenceFrequency.WEEKLY ? '周' : 
                                 freq === RecurrenceFrequency.MONTHLY ? '月' : '年'}
                            </span>
                        </div>
                    )}
                </div>
                {freq !== RecurrenceFrequency.NONE && (
                    <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">结束重复 (可选)</label>
                        <input
                            type="date"
                            value={until}
                            onChange={(e) => setUntil(e.target.value)}
                            className="w-full p-2 border rounded-md text-sm outline-none"
                        />
                    </div>
                )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <div className="flex gap-4">
                {Object.values(Priority).map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={priority === p}
                      onChange={() => setPriority(p)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                      p === Priority.HIGH ? 'bg-red-100 text-red-700' :
                      p === Priority.MEDIUM ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>{PriorityMap[p]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">提醒</label>
                  <select 
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(Number(e.target.value))}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={0}>任务开始时</option>
                    <option value={5}>提前 5 分钟</option>
                    <option value={10}>提前 10 分钟</option>
                    <option value={15}>提前 15 分钟</option>
                    <option value={30}>提前 30 分钟</option>
                    <option value={60}>提前 1 小时</option>
                  </select>
               </div>
            </div>

          </form>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            form="taskForm"
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm"
          >
            保存任务
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskForm;