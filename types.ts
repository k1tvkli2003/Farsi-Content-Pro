import React from 'react';

export enum Mode {
  GENERATE_HEADLINES = 'GENERATE_HEADLINES',
  FIND_POEMS = 'FIND_POEMS',
  WRITE_ARTICLE = 'WRITE_ARTICLE',
  REWRITE_TEXT = 'REWRITE_TEXT',
  FIND_PROVERBS = 'FIND_PROVERBS',
}

export interface ModeOption {
  id: Mode;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  supportsThinkingMode: boolean;
  supportsSearchGrounding: boolean;
}

export interface ProverbSuggestion {
  proverb: string;
  meaning: string;
  usage: string;
}

export interface PoemSuggestion {
  poem: string;
  poet: string;
  meaning: string;
  usage: string;
}

export type OutputData = string | string[] | ProverbSuggestion[] | PoemSuggestion[];

export interface GenerateContentParams {
    mode: Mode;
    inputText: string;
    isThinkingMode: boolean;
    useSearchGrounding: boolean;
}

export interface RefineContentParams {
    originalInput: string;
    currentOutput: string;
    refinementInstruction: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// Tag system for prompt customization
export interface PromptTag {
    id: string;
    label: string;
    description: string;
    promptFragment: string;
}

export interface PromptTagGroup {
    id: string;
    label: string;
    tags: PromptTag[];
}

export interface ModeOptionWithTags extends ModeOption {
    tagGroups: PromptTagGroup[];
}

export interface GenerateContentParamsWithTags extends GenerateContentParams {
    selectedTags?: PromptTag[];
}