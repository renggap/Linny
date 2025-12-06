import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// Note: API Key must be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateIssueDescription = async (title: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `
      You are an expert Product Manager at a high-growth tech startup. 
      Your goal is to write concise, actionable, and structured issue descriptions based on a short title.
      Use Markdown formatting.
      Structure the output with the following headers if applicable: "Context", "Requirements", "Acceptance Criteria".
      Keep the tone professional, direct, and minimalist (Linear style).
      Do not include conversational filler.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `Write a description for a software engineering task titled: "${title}"`,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    });

    return response.text || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate description. Please try again.";
  }
};

export const suggestPriority = async (title: string, description: string): Promise<string> => {
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `
            Analyze the following software issue and suggest a priority level.
            Options: Urgent, High, Medium, Low, No Priority.
            
            Title: ${title}
            Description: ${description}

            Return ONLY the priority string.
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });

        const text = response.text?.trim() || 'No Priority';
        return text;
    } catch (error) {
        return 'No Priority';
    }
}
