import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, StopCircle, Upload, FileText, Loader2, Sparkles, Play, Check, ArrowDownWideNarrow, Image as ImageIcon, Trash2, FileType } from 'lucide-react';
import { generatePlanFromContent } from '../services/geminiService';
import { Task, PriorityMap, Priority } from '../types';

interface AiPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTasks: (tasks: any[]) => void;
}

const AiPlannerModal: React.FC<AiPlannerModalProps> = ({ isOpen, onClose, onImportTasks }) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'file'>('voice');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  
  // Attachment State (Image or Document)
  const [filePreview, setFilePreview] = useState<string | null>(null); // For Images
  const [attachment, setAttachment] = useState<{ data: string; mimeType: string } | undefined>(undefined);
  const [fileType, setFileType] = useState<'image' | 'doc' | null>(null);

  const recognitionRef = useRef<any>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setGeneratedTasks([]);
      setFileName('');
      setFilePreview(null);
      setAttachment(undefined);
      setFileType(null);
      setIsListening(false);
    }
  }, [isOpen]);

  // Voice Logic
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("您的浏览器不支持语音识别 API");
        return;
      }
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
            setInputText(prev => prev + finalTranscript + " ");
        }
      };

      recognition.onend = () => {
          if (isListening) {
             setIsListening(false);
          }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    }
  };

  // File Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    // Determine type
    const isImage = file.type.startsWith('image/');
    const isText = file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.txt');
    
    if (isText) {
        // Read as Text
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setInputText(content);
            setFilePreview(null);
            setAttachment(undefined);
            setFileType(null);
        };
        reader.readAsText(file);
    } else {
        // Read as Base64 (Image or Binary Doc)
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const base64Data = result.split(',')[1];
            
            setAttachment({
                data: base64Data,
                mimeType: file.type || 'application/octet-stream' // Fallback
            });

            if (isImage) {
                setFilePreview(result);
                setFileType('image');
                if (!inputText) setInputText("请帮我整理图片中的日程安排。");
            } else {
                setFilePreview(null);
                setFileType('doc');
                if (!inputText) setInputText(`请分析文档 ${file.name} 中的任务和日程。`);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
      setFilePreview(null);
      setAttachment(undefined);
      setFileType(null);
      setFileName('');
  };

  // Intelligent Sorting Logic
  const sortGeneratedTasks = (tasks: Partial<Task>[]) => {
    return [...tasks].sort((a, b) => {
      // 1. Sort by Start Time
      const startA = a.start ? new Date(a.start).getTime() : 0;
      const startB = b.start ? new Date(b.start).getTime() : 0;
      
      if (startA !== startB) {
        return startA - startB; // Ascending
      }

      // 2. Sort by Priority
      const getPriorityValue = (p?: Priority | string) => {
        switch (p) {
          case Priority.HIGH: return 3;
          case Priority.MEDIUM: return 2;
          case Priority.LOW: return 1;
          default: return 0;
        }
      };
      return getPriorityValue(b.priority) - getPriorityValue(a.priority); // Descending
    });
  };

  // AI Analysis Logic
  const handleAnalyze = async () => {
    if (!inputText.trim() && !attachment) return;
    setIsAnalyzing(true);
    try {
      const rawTasks = await generatePlanFromContent(inputText, attachment);
      const sortedTasks = sortGeneratedTasks(rawTasks);
      setGeneratedTasks(sortedTasks);
    } catch (error) {
      alert("AI 分析失败，请检查网络或重试。\n如果是文档，请确保文件未损坏。");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmImport = () => {
    onImportTasks(generatedTasks);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="text-yellow-300" />
            <h2 className="text-xl font-bold">AI 智能规划助手</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-indigo-500 rounded-full text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {generatedTasks.length === 0 ? (
            /* Input Section */
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              <div className="flex gap-4 mb-6 border-b pb-2">
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'voice' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                  语音录入
                </button>
                <button
                  onClick={() => setActiveTab('file')}
                  className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'file' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                  文件导入
                </button>
              </div>

              {activeTab === 'voice' && (
                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                  <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-100' : 'bg-slate-100'}`}>
                    {isListening && <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-20"></span>}
                    <button 
                        onClick={toggleListening}
                        className={`z-10 w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 ${isListening ? 'bg-red-500' : 'bg-indigo-600'}`}
                    >
                        {isListening ? <StopCircle size={32} /> : <Mic size={32} />}
                    </button>
                  </div>
                  <p className="text-sm text-slate-500">
                    {isListening ? '正在聆听... 点击停止' : '点击麦克风开始录音，支持长时间叙述'}
                  </p>
                </div>
              )}

              {activeTab === 'file' && (
                <div className="space-y-4">
                    {!attachment ? (
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50/30 transition-colors cursor-pointer relative">
                            <input 
                                type="file" 
                                accept=".txt,.md,.json,.csv,.png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.ppt,.pptx"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex gap-4 mb-2">
                                <FileText size={32} className="text-slate-400" />
                                <ImageIcon size={32} className="text-slate-400" />
                            </div>
                            <p className="text-slate-600 font-medium">{fileName || "点击上传文件"}</p>
                            <p className="text-xs text-slate-400 mt-1">支持文档 (Word/PDF/PPT/Txt) 或图片</p>
                        </div>
                    ) : (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                            {fileType === 'image' && filePreview ? (
                                <img src={filePreview} alt="Preview" className="w-full h-48 object-contain bg-slate-800/5" />
                            ) : (
                                <div className="w-full h-32 flex flex-col items-center justify-center bg-indigo-50 text-indigo-900">
                                    <FileType size={40} className="mb-2 text-indigo-500" />
                                    <span className="font-semibold text-sm">{fileName}</span>
                                    <span className="text-xs text-indigo-400">文档已就绪</span>
                                </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                    onClick={clearFile}
                                    className="bg-white/90 text-red-600 px-4 py-2 rounded-full font-medium flex items-center gap-2 hover:bg-white"
                                >
                                    <Trash2 size={16} /> 移除文件
                                </button>
                            </div>
                        </div>
                    )}
                </div>
              )}

              <div className="mt-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {attachment ? '补充说明 (可选)' : '内容预览 (可编辑)'}
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={activeTab === 'voice' 
                        ? "语音转录内容将显示在这里..." 
                        : (attachment ? "关于此文件的额外说明..." : "文件内容将显示在这里...")}
                    className="w-full h-32 p-3 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50"
                  />
              </div>
            </div>
          ) : (
            /* Results Preview Section */
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Check className="text-green-500" />
                        已生成 {generatedTasks.length} 个任务
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                        <ArrowDownWideNarrow size={14} />
                        已按时间与优先级智能排序
                    </div>
                </div>
                
                <div className="space-y-3">
                    {generatedTasks.map((task, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-indigo-900">{task.title}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium
                                    ${task.priority === Priority.HIGH ? 'bg-red-100 text-red-700' : 
                                      task.priority === Priority.MEDIUM ? 'bg-amber-100 text-amber-700' : 
                                      'bg-green-100 text-green-700'}`}>
                                    {PriorityMap[task.priority as keyof typeof PriorityMap] || '中'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{task.description || '无描述'}</p>
                            <div className="flex gap-4 text-xs text-slate-400">
                                <span>开始: {new Date(task.start).toLocaleString('zh-CN')}</span>
                                <span>结束: {new Date(task.end).toLocaleString('zh-CN')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
            {generatedTasks.length === 0 ? (
                 <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || (!inputText.trim() && !attachment)}
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                >
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isAnalyzing ? '智能分析中...' : '生成任务规划'}
                </button>
            ) : (
                <>
                    <button
                        onClick={() => setGeneratedTasks([])}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:underline"
                    >
                        重新分析
                    </button>
                    <button
                        onClick={handleConfirmImport}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700 shadow-lg shadow-green-200"
                    >
                        <Check size={18} />
                        确认导入规划
                    </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default AiPlannerModal;