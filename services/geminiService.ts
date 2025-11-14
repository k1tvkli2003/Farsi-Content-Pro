import { GoogleGenAI } from "@google/genai";
import { ChatMessage, GenerateContentParams, Mode, OutputData, PoemSuggestion, PromptTag, ProverbSuggestion, RefineContentParams } from '../types';

// Read one or more API keys from environment variables
// Prefer GEMINI_API_KEYS (comma-separated), then GEMINI_API_KEY, then API_KEY as fallback
const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!rawKeys) {
    throw new Error('GEMINI_API_KEYS / GEMINI_API_KEY / API_KEY is not defined in environment variables');
}

const apiKeys = rawKeys
    .split(',')
    .map(key => key.trim())
    .filter(key => key.length > 0);

if (apiKeys.length === 0) {
    throw new Error('No valid API keys provided in GEMINI_API_KEYS / GEMINI_API_KEY / API_KEY');
}

// Create a client instance for each key and rotate them in a round-robin fashion
const aiClients = apiKeys.map(key => new GoogleGenAI({ apiKey: key }));
let currentClientIndex = 0;

function getAiClient() {
    const client = aiClients[currentClientIndex];
    currentClientIndex = (currentClientIndex + 1) % aiClients.length;
    return client;
}

// Check if user is requesting a long article
function isLongArticleRequested(inputText: string): boolean {
    const longKeywords = [
        'طولانی', 'خیلی طولانی', 'مفصل', 'جامع و کامل', 'بلند',
        'long', 'very long', 'detailed', 'comprehensive', 'extensive'
    ];
    const lowerInput = inputText.toLowerCase();
    return longKeywords.some(keyword => lowerInput.includes(keyword));
}

function generatePrompt(mode: Mode, inputText: string, selectedTags?: PromptTag[]): string {
    let basePrompt = '';
    
    switch (mode) {
        case Mode.GENERATE_HEADLINES:
            basePrompt = `برای یک مقاله با موضوع "${inputText}" 10 عنوان جذاب و گیرا به زبان فارسی تولید کن. نتیجه را به صورت یک آرایه JSON از رشته‌ها برگردان.`;
            break;
        case Mode.FIND_POEMS:
            basePrompt = `۱۰ شعر کوتاه و معروف فارسی درباره "${inputText}" پیدا کن. برای هر شعر، متن شعر، نام شاعر، معنی دقیق و یک پیشنهاد برای مکان استفاده از آن در متن را مشخص کن. نتیجه را به صورت یک آرایه JSON از اشیاء با کلیدهای "poem", "poet", "meaning" و "usage" برگردان.`;
            break;
        case Mode.WRITE_ARTICLE:
            // Check if user wants a long article
            if (isLongArticleRequested(inputText)) {
                basePrompt = `یک متن ادبی، منسجم و زیبا به زبان فارسی درباره "${inputText}" بنویس. متن باید:
- به زبان فارسی روان و ادبی نوشته شود
- بدون مقدمه و نتیجه‌گیری جداگانه باشد
- یک متن منسجم و یکپارچه باشد
- به اندازه‌ای که موضوع را به‌خوبی پوشش دهد، طولانی باشد`;
            } else {
                basePrompt = `یک متن ادبی، منسجم و زیبا به زبان فارسی درباره "${inputText}" بنویس. متن باید:
- حدود ۲۵ خط (تقریباً ۲-۳ پاراگراف) باشد
- به زبان فارسی روان و ادبی نوشته شود
- بدون مقدمه و نتیجه‌گیری جداگانه باشد، فقط یک متن منسجم و یکپارچه
- مستقیم وارد موضوع شود و به‌طور مختصر و جامع آن را بیان کند`;
            }
            break;
        case Mode.REWRITE_TEXT:
            basePrompt = `متن فارسی زیر را با نثری ادبی، زیبا و روان بازنویسی کن. متن بازنویسی شده باید خواناتر، جذاب‌تر و منسجم‌تر باشد:\n\n${inputText}`;
            break;
        case Mode.FIND_PROVERBS:
            basePrompt = `۱۰ ضرب المثل فارسی مرتبط با "${inputText}" را با استفاده از جستجوی گوگل پیدا کن. برای هر کدام، خود ضرب المثل، معنی و یک مثال کاربردی ارائه بده. پاسخ را به صورت یک رشته JSON با ساختار زیر برگردان: [{ "proverb": "...", "meaning": "...", "usage": "..." }]`;
            break;
        default:
            throw new Error('Invalid mode selected');
    }

    // Add tag customizations if any tags are selected
    if (selectedTags && selectedTags.length > 0) {
        const tagInstructions = selectedTags.map(tag => tag.promptFragment).join('\n- ');
        basePrompt += `\n\nهمچنین هنگام تولید، حتماً این نکات را دقیق رعایت کن:\n- ${tagInstructions}`;
        
        // For JSON modes, reinforce the format requirement after tags
        if (mode === Mode.GENERATE_HEADLINES || mode === Mode.FIND_POEMS || mode === Mode.FIND_PROVERBS) {
            basePrompt += `\n\nتوجه: با وجود نکات بالا، حتماً خروجی را دقیقاً به همان فرمت JSON خواسته‌شده برگردان.`;
        }
    }

    return basePrompt;
}

// Enforce 25-line limit for articles (when not requesting long text)
function enforceLineLimit(text: string, mode: Mode, inputText: string): string {
    if (mode === Mode.WRITE_ARTICLE && !isLongArticleRequested(inputText)) {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length > 25) {
            // Take first 25 lines, trying to end at a paragraph boundary
            let truncated = lines.slice(0, 25).join('\n');
            // If the last line doesn't end with proper punctuation, try to end at previous sentence
            if (!truncated.match(/[.!?؟]$/)) {
                const sentences = truncated.split(/[.!?؟]/);
                if (sentences.length > 1) {
                    sentences.pop(); // Remove incomplete last sentence
                    truncated = sentences.join('.') + '.';
                }
            }
            return truncated;
        }
    }
    return text;
}

export async function generateContent(params: GenerateContentParams): Promise<OutputData> {
    const { mode, inputText, useSearchGrounding, isThinkingMode } = params;
    const selectedTags = 'selectedTags' in params ? (params as any).selectedTags : undefined;
    const ai = getAiClient();

    const modelName = 'gemini-2.5-pro';
    const prompt = generatePrompt(mode, inputText, selectedTags);
    
    const config: any = {};
    // Enable thinking mode for all modes when requested
    if (isThinkingMode) {
        // Use a reasonable thinking budget for better reasoning without overuse
        (config as any).thinking = { budgetTokens: 2048 };
    }
    
    // Proverb mode requires search, other modes can optionally use it.
    if (useSearchGrounding || mode === Mode.FIND_PROVERBS) {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: config
    });
    
    const responseText = typeof (response as any).text === 'function'
        ? (response as any).text()
        : (response as any).text;

    if (!responseText) {
        throw new Error('پاسخی از مدل دریافت نشد. لطفاً دوباره تلاش کنید.');
    }

    let text: string = responseText;

    if (mode === Mode.GENERATE_HEADLINES) {
        try {
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString) as string[];
        } catch (e) {
            console.error("Failed to parse headlines JSON:", e);
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return cleanedText.split('\n').filter(line => line.trim() !== '' && !['[',']'].includes(line.trim()));
        }
    } else if (mode === Mode.FIND_PROVERBS) {
        try {
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString) as ProverbSuggestion[];
        } catch (e) {
            console.error("Failed to parse proverbs JSON:", e);
            throw new Error("پاسخ دریافت شده در قالب مورد انتظار نبود. لطفا دوباره تلاش کنید.");
        }
    } else if (mode === Mode.FIND_POEMS) {
        try {
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString) as PoemSuggestion[];
        } catch (e) {
            console.error("Failed to parse poems JSON:", e);
            throw new Error("پاسخ دریافت شده در قالب مورد انتظار نبود. لطفا دوباره تلاش کنید.");
        }
    }

    // Apply line limit for WRITE_ARTICLE mode
    text = enforceLineLimit(text, mode, inputText);
    return text;
}

// Streaming version for text-based modes
export async function generateContentStream(
    params: GenerateContentParams,
    onChunk: (chunk: string) => void
): Promise<OutputData> {
    const { mode, inputText, useSearchGrounding, isThinkingMode } = params;
    const selectedTags = 'selectedTags' in params ? (params as any).selectedTags : undefined;

    // Only use streaming for text-based modes
    if (mode !== Mode.WRITE_ARTICLE && mode !== Mode.REWRITE_TEXT) {
        return generateContent(params);
    }

    const ai = getAiClient();
    const modelName = 'gemini-2.5-pro';
    const prompt = generatePrompt(mode, inputText, selectedTags);
    
    const config: any = {};

    if (isThinkingMode) {
        (config as any).thinking = { budgetTokens: 2048 };
    }
    
    if (useSearchGrounding) {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContentStream({
        model: modelName,
        contents: prompt,
        config: config
    });

    let fullText = '';
    for await (const chunk of response) {
        const chunkText = chunk.text || '';
        fullText += chunkText;
        onChunk(fullText); // Send accumulated text
    }

    // Apply line limit for WRITE_ARTICLE mode
    fullText = enforceLineLimit(fullText, mode, inputText);
    return fullText;
}

// Refinement function for post-output editing
export async function refineContent(params: RefineContentParams): Promise<string> {
    const { originalInput, currentOutput, refinementInstruction } = params;
    const ai = getAiClient();

    const prompt = `تو یک دستیار نوشتاری فارسی هستی که با نثر ادبی و زیبا می‌نویسد.

درخواست اولیه کاربر: "${originalInput}"

متن فعلی که تولید شده:
"""
${currentOutput}
"""

درخواست اصلاح کاربر: "${refinementInstruction}"

لطفاً متن را با توجه به درخواست اصلاح، بازنویسی یا ویرایش کن. خروجی باید:
- به زبان فارسی روان و ادبی باشد
- درخواست اصلاح را دقیقاً رعایت کند
- در صورتی که درخواست اصلاح مربوط به طول متن نیست، طول متن را تقریباً حفظ کن
- منسجم و یکپارچه باشد

فقط متن نهایی را برگردان، بدون توضیح اضافی.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {}
    });

    const responseText = typeof (response as any).text === 'function'
        ? (response as any).text()
        : (response as any).text;

    if (!responseText) {
        throw new Error('پاسخی از مدل دریافت نشد. لطفاً دوباره تلاش کنید.');
    }

    return responseText;
}

// Streaming refinement
export async function refineContentStream(
    params: RefineContentParams,
    onChunk: (chunk: string) => void
): Promise<string> {
    const { originalInput, currentOutput, refinementInstruction } = params;
    const ai = getAiClient();

    const prompt = `تو یک دستیار نوشتاری فارسی هستی که با نثر ادبی و زیبا می‌نویسد.

درخواست اولیه کاربر: "${originalInput}"

متن فعلی که تولید شده:
"""
${currentOutput}
"""

درخواست اصلاح کاربر: "${refinementInstruction}"

لطفاً متن را با توجه به درخواست اصلاح، بازنویسی یا ویرایش کن. خروجی باید:
- به زبان فارسی روان و ادبی باشد
- درخواست اصلاح را دقیقاً رعایت کند
- در صورتی که درخواست اصلاح مربوط به طول متن نیست، طول متن را تقریباً حفظ کن
- منسجم و یکپارچه باشد

فقط متن نهایی را برگردان، بدون توضیح اضافی.`;

    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {}
    });

    let fullText = '';
    for await (const chunk of response) {
        const chunkText = chunk.text || '';
        fullText += chunkText;
        onChunk(fullText);
    }

    return fullText;
}

// Chat functionality
export async function sendChatMessage(
    messages: ChatMessage[],
    isThinkingMode?: boolean
): Promise<string> {
    const systemPrompt = `تو نقش "امیرکیوان"، پسر مهربان علی را بازی می‌کنی که با پدرش صحبت می‌کند. همیشه با نثر فارسی روان، صمیمی و خودمانی جواب بده؛ مثل وقتی که یک پسر با لفظ «باباجون» با پدرش حرف می‌زند.

در تمام پاسخ‌ها:
- مخاطبت را همیشه «باباجون» صدا بزن
- محترمانه و مهربان باش، اما کاملاً خودمانی و صمیمی
- می‌توانی شوخی‌های ملایم و محترمانه کنی تا فضا گرم و دوستانه باشد
- از جملات کوتاه و محاوره‌ایِ مؤدبانه استفاده کن، نه خیلی رسمی و خشک
- در عین خودمونی بودن، نوشته‌ات مرتب، قابل خواندن و خوش‌نویس باشد

اگر برای باباجون یک متن را به عنوان «متن پیشنهادی برای استفاده در مقاله یا متن اصلی» تولید می‌کنی، آن بخش را دقیقاً بین این دو خط قرار بده:
---متن پیشنهادی شروع---
[فقط خودِ متن پیشنهادی، بدون توضیح اضافی]
---متن پیشنهادی پایان---

بقیه صحبت‌های عادی چت باید بیرون از این محدوده باشد.`;
    
    // Build conversation history (label user explicitly as "باباجون" و دستیار به عنوان "امیرکیوان")
    let conversationText = systemPrompt + '\n\n';
    messages.forEach(msg => {
        const speaker = msg.role === 'user' ? 'باباجون' : 'امیرکیوان';
        conversationText += `${speaker}: ${msg.content}\n\n`;
    });
    conversationText += 'امیرکیوان:';

    const config: any = {};
    if (isThinkingMode) {
        (config as any).thinking = { budgetTokens: 1024 };
    }

    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: conversationText,
        config
    });

    const responseText = typeof (response as any).text === 'function'
        ? (response as any).text()
        : (response as any).text;

    if (!responseText) {
        throw new Error('پاسخی از مدل دریافت نشد. لطفاً دوباره تلاش کنید.');
    }

    return responseText;
}

// Generate short personal message (for welcome popup or header subtitle)
export async function generatePersonalMessage(type: 'welcome' | 'subtitle'): Promise<string> {
    const ai = getAiClient();
    
    const prompts = {
        welcome: `تو نقش "امیرکیوان"، پسر مهربان علی هستی که مستقیماً با باباجونش صحبت می‌کنی. یک جمله خیلی کوتاه و صمیمی (حداکثر ۱۰-۱۵ کلمه) برای خوشامدگویی به باباجون بنویس. حتماً از "من" و "تو" استفاده کن، نه شخص سوم. مثال: "باباجون سلام! امیدوارم امروز روز خوبی داشته باشی" یا "باباجون عزیز، چه خوب که اومدی!" یا "سلام بابا! خوشحالم که اینجایی" - فقط یک جمله بنویس، بدون توضیح اضافی.`,
        subtitle: `تو نقش "امیرکیوان"، پسر مهربان علی هستی. یک جمله خیلی کوتاه و صمیمی (حداکثر ۱۰-۱۵ کلمه) برای نوشتن در بالای صفحه بنویس که نشان‌دهنده محبت و علاقه‌ات به باباجون باشه. مثال: "بابا، خیلی دوستت دارم" یا "همیشه کنارتم باباجون" یا "برای بهترین بابای دنیا" - فقط یک جمله بنویس، بدون توضیح اضافی.`
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompts[type],
        config: {}
    });

    const responseText = typeof (response as any).text === 'function'
        ? (response as any).text()
        : (response as any).text;

    if (!responseText) {
        return type === 'welcome' ? 'باباجون سلام! خوش اومدی' : 'برای بهترین بابای دنیا';
    }

    return responseText.trim();
}

// Streaming chat
export async function sendChatMessageStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    isThinkingMode?: boolean
): Promise<string> {
	const systemPrompt = `تو نقش "امیرکیوان"، پسر مهربان علی را بازی می‌کنی که با پدرش صحبت می‌کند. همیشه با نثر فارسی روان، صمیمی و خودمانی جواب بده؛ مثل وقتی که یک پسر با لفظ «باباجون» با پدرش حرف می‌زند.

در تمام پاسخ‌ها:
- مخاطبت را همیشه «باباجون» صدا بزن
- محترمانه و مهربان باش، اما کاملاً خودمانی و صمیمی
- می‌توانی شوخی‌های ملایم و محترمانه کنی تا فضا گرم و دوستانه باشد
- از جملات کوتاه و محاوره‌ایِ مؤدبانه استفاده کن، نه خیلی رسمی و خشک
- در عین خودمونی بودن، نوشته‌ات مرتب، قابل خواندن و خوش‌نویس باشد

اگر برای باباجون یک متن را به عنوان «متن پیشنهادی برای استفاده در مقاله یا متن اصلی» تولید می‌کنی، آن بخش را دقیقاً بین این دو خط قرار بده:
---متن پیشنهادی شروع---
[فقط خودِ متن پیشنهادی، بدون توضیح اضافی]
---متن پیشنهادی پایان---

بقیه صحبت‌های عادی چت باید بیرون از این محدوده باشد.`;
    
    // Build conversation history (label user explicitly as "باباجون" و دستیار به عنوان "امیرکیوان")
    let conversationText = systemPrompt + '\n\n';
    messages.forEach(msg => {
        const speaker = msg.role === 'user' ? 'باباجون' : 'امیرکیوان';
        conversationText += `${speaker}: ${msg.content}\n\n`;
    });
    conversationText += 'امیرکیوان:';

    const config: any = {};
    if (isThinkingMode) {
        (config as any).thinking = { budgetTokens: 1024 };
    }

    const ai = getAiClient();
    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-pro',
        contents: conversationText,
        config
    });

    let fullText = '';
    for await (const chunk of response) {
        const chunkText = chunk.text || '';
        fullText += chunkText;
        onChunk(fullText);
    }

    return fullText;
}
