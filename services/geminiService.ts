import { GoogleGenAI, Type } from "@google/genai";
import type { Schema } from "@google/genai";
import { Priority, Task, RecurrenceFrequency } from "../types";

// Helper to get today's date context for the AI
const getContext = () => {
  const now = new Date();
  return `当前参考时间: ${now.toISOString()} (星期: ${now.toLocaleDateString('zh-CN', { weekday: 'long' })}).`;
};

// Schema definitions
const recurrenceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    frequency: { type: Type.STRING, enum: [RecurrenceFrequency.NONE, RecurrenceFrequency.DAILY, RecurrenceFrequency.WEEKLY, RecurrenceFrequency.MONTHLY, RecurrenceFrequency.YEARLY] },
    interval: { type: Type.NUMBER },
    until: { type: Type.STRING, description: "ISO 8601 format date-time (optional)" }
  }
};

const taskSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    start: { type: Type.STRING, description: "ISO 8601 format date-time" },
    end: { type: Type.STRING, description: "ISO 8601 format date-time" },
    priority: { type: Type.STRING, enum: [Priority.HIGH, Priority.MEDIUM, Priority.LOW] },
    reminderMinutes: { type: Type.NUMBER },
    recurrence: recurrenceSchema
  },
  required: ["title", "start", "end", "priority"],
};

export const parseTaskFromText = async (text: string): Promise<Partial<Task> | null> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `从用户的这段描述中提取任务详情: "${text}". ${getContext()}
      如果用户暗示了持续时间但未说明结束时间，请自动计算结束时间。
      如果没有提到具体日期，默认为今天。
      如果未指定，默认提醒时间为15分钟。
      如果未指定，默认优先级为中(Medium)。
      请检测重复模式 (例如 "每天", "每周一", "每两周").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: taskSchema,
      },
    });

    if (response.text) {
        return JSON.parse(response.text) as Partial<Task>;
    }
    return null;
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};

export const generatePlanFromContent = async (
  content: string, 
  attachment?: { data: string; mimeType: string }
): Promise<Partial<Task>[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const promptText = `你是一个智能时间规划助手。请分析提供的内容（可能是语音转录文本、图片、PDF文档或办公文档中的日程/笔记），并将其拆解为一系列具体的、可执行的任务列表。
      
      上下文/补充说明:
      """
      ${content}
      """
      
      ${getContext()}
      
      要求：
      1. 识别所有明确或隐含的任务。
      2. 如果提供了图片或文档，请仔细识别其中的文字、时间表、截止日期或待办事项。
      3. 为每个任务合理安排时间。如果源文件中包含具体时间，请严格遵守；如果没有，请根据任务性质和上下文智能推断。
      4. 确保返回的是JSON数组格式。
      `;

    // Manually define part structure to avoid import issues with 'Part' type
    const parts: any[] = [{ text: promptText }];
    
    // Add attachment part if provided (Image, PDF, etc.)
    if (attachment) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      });
    }

    const response = await ai.models.generateContent({
      // "gemini-2.5-flash" supports both Multimodal input (Images/PDFs) AND JSON Output.
      // Do NOT use "gemini-2.5-flash-image" as it does not support JSON mode.
      model: "gemini-2.5-flash", 
      contents: {
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: taskSchema
        },
      },
    });

    if (response.text) {
        return JSON.parse(response.text) as Partial<Task>[];
    }
    return [];
  } catch (error) {
    console.error("Gemini Planning Error:", error);
    throw error;
  }
};