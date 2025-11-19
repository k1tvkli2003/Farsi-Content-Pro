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

// Indices of clients that passed the last health check. If null, health check has not run yet.
let healthyClientIndices: number[] | null = null;
let hasHealthCheckRun = false;

// Indices of clients that have been marked unhealthy during this session (runtime key errors)
const disabledClientIndices = new Set<number>();

// Once we discover that the primary model (gemini-3-pro-preview) is unstable but flash works,
// we permanently switch all remaining calls in this session to gemini-2.5-flash.
const PRIMARY_MODEL = 'gemini-3-pro-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash';
let forceFlashForAllCalls = false;

export interface ApiHealthSummary {
    totalCount: number;
    healthyCount: number;
}

/**
 * Runs a lightweight health check against all configured API keys.
 * Any key that successfully answers a tiny test prompt is considered "healthy".
 * The result is cached in-memory and used by getAiClient() for routing.
 */
export async function healthCheckAllApiKeys(): Promise<ApiHealthSummary> {
    if (aiClients.length === 0) {
        healthyClientIndices = [];
        hasHealthCheckRun = true;
        return { totalCount: 0, healthyCount: 0 };
    }

    const results = await Promise.allSettled(
        aiClients.map(async (client, index) => {
            try {
                // Use a very small, cheap request just to verify the key works.
                await client.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: 'سلام! این یک تست خیلی کوتاه برای بررسی سلامت کلید API است. فقط یک کلمه «سلام» جواب بده.',
                    config: {}
                });
                return true;
            } catch (err) {
                console.error(`API key health check failed for index ${index}:`, err);
                throw err;
            }
        })
    );

    const newHealthy: number[] = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            newHealthy.push(index);
        }
    });

    healthyClientIndices = newHealthy;
    hasHealthCheckRun = true;

    return {
        totalCount: aiClients.length,
        healthyCount: newHealthy.length,
    };
}

function getClientPoolIndices(): number[] {
    let baseIndices: number[];

    if (hasHealthCheckRun) {
        if (healthyClientIndices && healthyClientIndices.length > 0) {
            baseIndices = healthyClientIndices;
        } else {
            baseIndices = [];
        }
    } else {
        baseIndices = aiClients.map((_, index) => index);
    }

    return baseIndices.filter(index => !disabledClientIndices.has(index));
}

interface AiClientWithIndex {
    client: GoogleGenAI;
    index: number;
}

function getAiClientInternal(): AiClientWithIndex {
    if (aiClients.length === 0) {
        throw new Error('هیچ کلید API برای Gemini پیکربندی نشده است. لطفاً GEMINI_API_KEYS را تنظیم کن.');
    }

    const poolIndices = getClientPoolIndices();

    if (poolIndices.length === 0) {
        // All keys are either unhealthy from health check or have been disabled at runtime
        throw new Error('در حال حاضر هیچ کلید API فعالی در دسترس نیست. امیرکیوان باید کلیدهای جدید اضافه کند.');
    }

    const indexInPool = currentClientIndex % poolIndices.length;
    const clientIndex = poolIndices[indexInPool];
    currentClientIndex = (currentClientIndex + 1) % poolIndices.length;
    return { client: aiClients[clientIndex], index: clientIndex };
}

// Backwards-compatible helper for places that only need the client instance
function getAiClient(): GoogleGenAI {
    return getAiClientInternal().client;
}

function markClientAsDisabled(index: number) {
    disabledClientIndices.add(index);
    if (healthyClientIndices) {
        healthyClientIndices = healthyClientIndices.filter(i => i !== index);
    }
}

function isApiKeyError(error: any): boolean {
    if (!error) return false;

    const anyErr = error as any;
    const status = anyErr.status ?? anyErr.code;
    if (status === 401 || status === 403 || status === 'UNAUTHENTICATED' || status === 'PERMISSION_DENIED') {
        return true;
    }

    const message = String(anyErr.message || '').toLowerCase();

    const keyIndicators = [
        'api key',
        'apikey',
        'invalid api key',
        'invalid key',
        'key is invalid',
        'no api key',
        'gemini_api_keys',
        'billing',
        'unauthorized',
        'permission denied',
        'هیچ کلید api فعالی',
        'کلیدهای هوش مصنوعی'
    ];

    return keyIndicators.some(indicator => message.includes(indicator));
}

async function withClientForModel<T>(
    modelName: string,
    operation: (client: GoogleGenAI, modelName: string, clientIndex: number) => Promise<T>
): Promise<T> {
    let lastError: any = null;

    // We never want to loop forever; at most try each client once for this call.
    const maxAttempts = aiClients.length;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let aiWithIndex: AiClientWithIndex;
        try {
            aiWithIndex = getAiClientInternal();
        } catch (err) {
            // No available clients
            lastError = lastError || err;
            break;
        }

        try {
            return await operation(aiWithIndex.client, modelName, aiWithIndex.index);
        } catch (err) {
            // If this looks like a key-related error, mark this client as unhealthy
            if (isApiKeyError(err)) {
                markClientAsDisabled(aiWithIndex.index);
                lastError = err;
                continue; // Try next available client
            }

            // For non-key errors (network, server, model issues), propagate immediately
            throw err;
        }
    }

    if (lastError) {
        throw lastError;
    }

    // Fallback safety – should normally be unreachable
    throw new Error('در حال حاضر هیچ کلید API فعالی در دسترس نیست. امیرکیوان باید کلیدهای جدید اضافه کند.');
}

async function callWithProThenFlash<T>(
    operation: (client: GoogleGenAI, modelName: string) => Promise<T>
): Promise<T> {
    // If we already discovered that pro is unstable but flash works, always go straight to flash.
    if (forceFlashForAllCalls) {
        return withClientForModel(FALLBACK_MODEL, (client) => operation(client, FALLBACK_MODEL));
    }

    try {
        return await withClientForModel(PRIMARY_MODEL, (client) => operation(client, PRIMARY_MODEL));
    } catch (error) {
        // If the failure is clearly due to API keys, trying another model will not help.
        if (isApiKeyError(error)) {
            throw error;
        }

        // Primary model had a non-key error (capacity, transient server failure, etc.).
        // Try the lighter flash model as a fallback.
        try {
            const result = await withClientForModel(FALLBACK_MODEL, (client) => operation(client, FALLBACK_MODEL));
            // If flash worked, switch all future calls in this session to flash.
            forceFlashForAllCalls = true;
            return result;
        } catch (fallbackError) {
            // If flash also failed, bubble up that error so the UI can show the global error popup.
            throw fallbackError;
        }
    }
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
            basePrompt = `۱۰ ضرب‌المثل کاملاً مازندرانی (گویش مازنی) مرتبط با «${inputText}» را با استفاده از جستجوی وب پیدا کن.
نکات مهم:
- فقط ضرب‌المثل‌های اصیل مازندرانی را برگردان، نه معادل‌ها یا ترجمه‌های فارسیِ آن‌ها
- اگر برای برخی مفاهیم ضرب‌المثل مازندرانی معتبر پیدا نکردی، تعداد آیتم‌ها را کمتر کن؛ ولی هرگز ضرب‌المثل فارسیِ سراسری را جایگزین نکن
- متنِ خودِ ضرب‌المثل باید دقیقاً به گویش مازندرانی نوشته شود (با خط فارسی، ولی واژگان و ساختار مازندرانی)

برای هر مورد، خروجی را به صورت یک آرایه JSON از اشیاء با کلیدهای زیر برگردان:
- "proverb": خودِ ضرب‌المثل به گویش مازندرانی
- "meaning": توضیح معنی به زبان فارسی معیار و روان
- "usage": یک جملهٔ نمونهٔ فارسی که نشان بدهد این ضرب‌المثل در چه موقعیتی به‌کار می‌رود

پاسخ را دقیقاً در قالب یک JSON معتبر با ساختار زیر برگردان:
[{ "proverb": "...", "meaning": "...", "usage": "..." }]`;
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

    // Global language enforcement
    if (mode === Mode.FIND_PROVERBS) {
        // For Mazandarani proverbs: proverb in Mazandarani, explanations in Farsi
        basePrompt += `\n\nدر خروجی JSON:
- مقدار فیلد "proverb" باید حتماً به گویش مازندرانی نوشته شود (نه فارسی معیار)
- مقادیر فیلدهای "meaning" و "usage" باید به فارسی معیار، روان و قابل‌فهم برای عموم باشند
- نام کلیدهای JSON (proverb, meaning, usage) را دقیقاً به همین صورت و به زبان انگلیسی حفظ کن و هرگز آن‌ها را ترجمه نکن.
از نوشتن متن انگلیسی در مقادیر متنی خودداری کن، مگر در نام‌های خاص یا اصطلاحات غیرقابل‌جایگزین.`;
    } else if (mode === Mode.GENERATE_HEADLINES || mode === Mode.FIND_POEMS) {
        // JSON modes: keep keys in English, but all text values must be Farsi
        basePrompt += `\n\nدر تمام مقادیر متنی داخل JSON، متن را کاملاً به زبان فارسی روان و طبیعی بنویس. نام کلیدهای JSON (مانند poem, poet, meaning, usage) را دقیقاً مطابق الگوی داده‌شده و به زبان انگلیسی نگه دار و آن‌ها را ترجمه نکن. از نوشتن جملات یا توضیحات انگلیسی در مقادیر متنی خودداری کن، مگر در نام‌های خاص یا اصطلاحات واقعاً غیرقابل‌جایگزین.`;
    } else {
        // Text modes: everything should be Farsi
        basePrompt += `\n\nدر هر صورت، خروجی نهایی را ۱۰۰٪ به زبان فارسی روان و طبیعی بنویس و از نوشتن متن انگلیسی خودداری کن، مگر برای نام‌های خاص یا واژه‌هایی که معادل دقیق فارسی ندارند.`;
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

    return callWithProThenFlash(async (client, modelName) => {
        const response = await client.models.generateContent({
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
    });
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
    const modelName = forceFlashForAllCalls ? FALLBACK_MODEL : PRIMARY_MODEL;
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
- از نوشتن جملات یا بخش‌های انگلیسی خودداری کن، مگر در نام‌های خاص یا اگر خود کاربر صراحتاً متن انگلیسی خواسته باشد

فقط متن نهایی را برگردان، بدون توضیح اضافی.`;

    return callWithProThenFlash(async (client, modelName) => {
        const response = await client.models.generateContent({
            model: modelName,
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
    });
}

// Streaming refinement
export async function refineContentStream(
    params: RefineContentParams,
    onChunk: (chunk: string) => void
): Promise<string> {
    const { originalInput, currentOutput, refinementInstruction } = params;
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
- از نوشتن جملات یا بخش‌های انگلیسی خودداری کن، مگر در نام‌های خاص یا اگر خود کاربر صراحتاً متن انگلیسی خواسته باشد

فقط متن نهایی را برگردان، بدون توضیح اضافی.`;

    const ai = getAiClient();

    const modelName = forceFlashForAllCalls ? FALLBACK_MODEL : PRIMARY_MODEL;

    const response = await ai.models.generateContentStream({
        model: modelName,
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
    const systemPrompt = `تو نقش "امیرکیوان", پسر مهربان علی را بازی می‌کنی که با پدرش صحبت می‌کند. همیشه با نثر فارسی روان، صمیمی و خودمانی جواب بده؛ مثل وقتی که یک پسر با لفظ «باباجون» با پدرش حرف می‌زند.

در تمام پاسخ‌ها:
- مخاطبت را همیشه «باباجون» صدا بزن
- محترمانه و مهربان باش، اما کاملاً خودمانی و صمیمی
- می‌توانی شوخی‌های ملایم و محترمانه کنی تا فضا گرم و دوستانه باشد
- از جملات کوتاه و محاوره‌ایِ مؤدبانه استفاده کن، نه خیلی رسمی و خشک
- در عین خودمونی بودن، نوشته‌ات مرتب، قابل خواندن و خوش‌نویس باشد
 - همه پاسخ‌ها باید ۱۰۰٪ به زبان فارسی باشند. از نوشتن متن انگلیسی خودداری کن، مگر اگر خودِ باباجون صراحتاً متن یا کلمه‌ای را به انگلیسی بخواهد یا در نام‌های خاص.

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

    return callWithProThenFlash(async (client, modelName) => {
        const response = await client.models.generateContent({
            model: modelName,
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
    });
}

// Generate short personal message (for welcome popup or header subtitle)
export async function generatePersonalMessage(type: 'welcome' | 'subtitle'): Promise<string> {
    const prompts = {
        welcome: `تو نقش "امیرکیوان", پسر مهربان علی هستی که مستقیماً با باباجونش صحبت می‌کنی. یک جمله خیلی کوتاه و صمیمی (حداکثر ۱۰-۱۵ کلمه) برای خوشامدگویی به باباجون بنویس. حتماً از "من" و "تو" استفاده کن، نه شخص سوم. خروجی باید کاملاً به زبان فارسی باشد و از نوشتن کلمات یا عبارات انگلیسی خودداری کن. مثال: "باباجون سلام! امیدوارم امروز روز خوبی داشته باشی" یا "باباجون عزیز، چه خوب که اومدی!" یا "سلام بابا! خوشحالم که اینجایی" - فقط یک جمله فارسی بنویس، بدون توضیح اضافی.`,
        subtitle: `تو نقش "امیرکیوان", پسر مهربان علی هستی. یک جمله خیلی کوتاه و صمیمی (حداکثر ۱۰-۱۵ کلمه) برای نوشتن در بالای صفحه بنویس که نشان‌دهنده محبت و علاقه‌ات به باباجون باشه. خروجی باید کاملاً به زبان فارسی باشد و از نوشتن کلمات یا عبارات انگلیسی خودداری کن. مثال: "بابا، خیلی دوستت دارم" یا "همیشه کنارتم باباجون" یا "برای بهترین بابای دنیا" - فقط یک جمله فارسی بنویس، بدون توضیح اضافی.`
    };
    const modelName = FALLBACK_MODEL;

    const response = await withClientForModel(modelName, async (client, selectedModel) => {
        const res = await client.models.generateContent({
            model: selectedModel,
            contents: prompts[type],
            config: {}
        });

        const responseText = typeof (res as any).text === 'function'
            ? (res as any).text()
            : (res as any).text;

        if (!responseText) {
            throw new Error('پاسخی از مدل دریافت نشد. لطفاً دوباره تلاش کنید.');
        }

        return responseText as string;
    });

    if (!response) {
        return type === 'welcome' ? 'باباجون سلام! خوش اومدی' : 'برای بهترین بابای دنیا';
    }

    return (response as string).trim();
}

// Streaming chat
export async function sendChatMessageStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    isThinkingMode?: boolean
): Promise<string> {
    const systemPrompt = `تو نقش "امیرکیوان", پسر مهربان علی را بازی می‌کنی که با پدرش صحبت می‌کند. همیشه با نثر فارسی روان، صمیمی و خودمانی جواب بده؛ مثل وقتی که یک پسر با لفظ «باباجون» با پدرش حرف می‌زند.

در تمام پاسخ‌ها:
- مخاطبت را همیشه «باباجون» صدا بزن
- محترمانه و مهربان باش، اما کاملاً خودمانی و صمیمی
- می‌توانی شوخی‌های ملایم و محترمانه کنی تا فضا گرم و دوستانه باشد
- از جملات کوتاه و محاوره‌ایِ مؤدبانه استفاده کن، نه خیلی رسمی و خشک
- در عین خودمونی بودن، نوشته‌ات مرتب، قابل خواندن و خوش‌نویس باشد
- همه پاسخ‌ها باید ۱۰۰٪ به زبان فارسی باشند. از نوشتن متن انگلیسی خودداری کن، مگر اگر خودِ باباجون صراحتاً متن یا کلمه‌ای را به انگلیسی بخواهد یا در نام‌های خاص.

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

    const modelName = forceFlashForAllCalls ? FALLBACK_MODEL : PRIMARY_MODEL;

    const response = await ai.models.generateContentStream({
        model: modelName,
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
