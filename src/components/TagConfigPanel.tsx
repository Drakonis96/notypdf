import React, { useState, useEffect } from 'react';
import notionService from '../services/notionService';
import configService, { AppConfig } from '../services/configService';
import aiCompletionService from '../services/aiCompletionService';
import apiKeyService from '../services/apiKeyService';
import { NotionConfig, NotionProperty, SavedDatabaseId, TagMapping, TranslationProvider, TranslationModel } from '../types';
import { Trash2, Play } from 'lucide-react';

interface TagConfigPanelProps {
  savedDatabaseIds?: SavedDatabaseId[];
  isActive?: boolean;
}

// AI provider/model options (copied from ConfigPanel/TranslationConfigPanel)
const PROVIDER_OPTIONS: { label: string; value: TranslationProvider }[] = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'Google Gemini', value: 'gemini' },
  { label: 'DeepSeek', value: 'deepseek' },
];
const OPENAI_MODELS = [
  { label: 'gpt-4.1', value: 'gpt-4.1' },
  { label: 'gpt-4.1-mini', value: 'gpt-4.1-mini' },
  { label: 'gpt-4o', value: 'gpt-4o' },
  { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
];
const OPENROUTER_MODELS = [
  { label: 'Gemma 3 27B IT (free)', value: 'google/gemma-3-27b-it:free' },
  { label: 'Gemini 2.0 Flash Exp (free)', value: 'google/gemini-2.0-flash-exp:free' },
  { label: 'Llama 4 Maverick (free)', value: 'meta-llama/llama-4-maverick:free' },
  { label: 'Llama 4 Scout (free)', value: 'meta-llama/llama-4-scout:free' },
  { label: 'DeepSeek Chat v3 (free)', value: 'deepseek/deepseek-chat-v3-0324:free' },
  { label: 'Qwen 3 32B (free)', value: 'qwen/qwen3-32b:free' },
  { label: 'Mistral Small 3.1 (free)', value: 'mistralai/mistral-small-3.1-24b-instruct:free' },
];
const GEMINI_MODELS = [
  { label: 'Gemini 2.0 Pro', value: 'gemini-2.0-pro' },
  { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
];
const DEEPSEEK_MODELS = [
  { label: 'DeepSeek Chat', value: 'deepseek-chat' },
  { label: 'DeepSeek Reasoner', value: 'deepseek-reasoner' },
];

// Default semantic tagging prompts
const DEFAULT_TAGGING_PROMPT_SPANISH = `INSTRUCCIÓN CRÍTICA: Debes responder ÚNICAMENTE en {{language}}. NO uses ningún otro idioma.

Eres un asistente especializado en etiquetar textos con temas específicos de manera precisa y relevante.

TAREA:

Analiza cuidadosamente el texto proporcionado y genera etiquetas temáticas específicas que reflejen con exactitud y claridad los conceptos, temas, lugares, personas o eventos tratados en él.

REGLAS OBLIGATORIAS:

Responde SOLO en {{language}} — no utilices palabras ni términos en otro idioma.

Genera etiquetas específicas directamente relacionadas con el contenido del texto (evita etiquetas generales como "texto", "información" o "ejemplo").

Las etiquetas pueden ser conceptos específicos, nombres de lugares, personas mencionadas, fechas concretas o eventos específicos.

Puedes elegir etiquetas existentes, siempre que sean pertinentes y encajen claramente con los temas tratados en el texto del contexto.

Si consideras que las etiquetas existentes no son suficientes o no reflejan adecuadamente el contenido, puedes generar nuevas etiquetas más precisas.

Las etiquetas deben estar separadas únicamente por comas.

NO agregues explicaciones, introducciones ni texto adicional.

EJEMPLOS DE ETIQUETAS CORRECTAS EN ESPAÑOL:

Historia contemporánea, Guerra Civil española, Franquismo

Economía internacional, Crisis financiera, Inflación

Literatura latinoamericana, Realismo mágico, Gabriel García Márquez

EJEMPLOS DE ETIQUETAS INCORRECTAS (NO usar):

Ejemplo, Texto, Información general, Contenido

CONTENIDO A ANALIZAR:

{{context_column_content}}

ETIQUETAS ACTUALES:

{{tag_column_values}}

IDIOMA OBLIGATORIO:

{{language}}

RESPUESTA:

(solo etiquetas en {{language}}, separadas por comas):`;

const DEFAULT_TAGGING_PROMPT_ENGLISH = `CRITICAL INSTRUCTION: You must respond ONLY in {{language}}. DO NOT use any other language.

You are an assistant specialized in tagging texts with specific topics in a precise and relevant manner.

TASK:

Carefully analyze the provided text and generate specific thematic tags that accurately and clearly reflect the concepts, topics, places, people, or events discussed in it.

MANDATORY RULES:

Respond ONLY in {{language}} — do not use words or terms in any other language.

Generate specific tags directly related to the content of the text (avoid general tags like "text", "information" or "example").

Tags can be specific concepts, names of places, mentioned people, concrete dates, or specific events.

You may choose existing tags, as long as they are relevant and clearly fit the topics covered in the context text.

If you consider that the existing tags are not sufficient or do not adequately reflect the content, you may generate new, more precise tags.

Tags must be separated only by commas.

DO NOT add explanations, introductions, or any additional text.

EXAMPLES OF CORRECT TAGS IN ENGLISH:

Contemporary history, Spanish Civil War, Francoism

International economy, Financial crisis, Inflation

Latin American literature, Magical realism, Gabriel García Márquez

EXAMPLES OF INCORRECT TAGS (DO NOT use):

Example, Text, General information, Content

CONTENT TO ANALYZE:

{{context_column_content}}

CURRENT TAGS:

{{tag_column_values}}

MANDATORY LANGUAGE:

{{language}}

RESPONSE:

(only tags in {{language}}, separated by commas):`;

const DEFAULT_TAGGING_PROMPTS = [DEFAULT_TAGGING_PROMPT_SPANISH, DEFAULT_TAGGING_PROMPT_ENGLISH];

const LANGUAGE_OPTIONS = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Arabic', 'Hindi', 'Other...'
];

const TagConfigPanel: React.FC<TagConfigPanelProps> = ({ savedDatabaseIds, isActive }) => {
  const [databaseId, setDatabaseId] = useState('');
  const [properties, setProperties] = useState<NotionProperty[]>([]);
  const [contextColumns, setContextColumns] = useState<string[]>([]);
  const [tagColumns, setTagColumns] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiConfig, setAiConfig] = useState<{ provider: TranslationProvider; model: TranslationModel }>({ provider: '', model: '' });
  const [promptInput, setPromptInput] = useState('');
  const [prompts, setPrompts] = useState<string[]>([]);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(0);
  const [executedPrompt, setExecutedPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptResult, setPromptResult] = useState<string | null>(null);
  const [statusTotal, setStatusTotal] = useState<number | null>(null);
  const [statusUntagged, setStatusUntagged] = useState<number | null>(null);
  const [statusProcess, setStatusProcess] = useState<'idle' | 'start' | 'in-progress' | 'finished'>('idle');

  // Tagging process state
  const [tagging, setTagging] = useState(false);
  const [taggingProgress, setTaggingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [taggingLog, setTaggingLog] = useState<string[]>([]);
  const taggingAbortRef = React.useRef<AbortController | null>(null);

  // Language selector state (persist per database/tag mapping)
  const [language, setLanguage] = useState<string>('Spanish');

  // Añadir estado para el número máximo de tags
  const [maximumTags, setMaximumTags] = useState<number>(5);

  // Modal state for prompt preview
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [modalPromptText, setModalPromptText] = useState<string>('');

  // Load AI config when databaseId changes
  useEffect(() => {
    if (!databaseId) {
      setAiConfig({ provider: '', model: '' });
      return;
    }
    configService.getConfig().then((cfg: AppConfig) => {
      const mapping: TagMapping | undefined = cfg && cfg.tagMappings ? cfg.tagMappings[databaseId] : undefined;
      if (mapping && mapping.aiConfig) {
        setAiConfig(mapping.aiConfig);
      } else {
        setAiConfig({ provider: '', model: '' });
      }
    });
  }, [databaseId]);

  // Load mapping and properties when databaseId changes
  useEffect(() => {
    if (!databaseId) {
      setProperties([]);
      setContextColumns([]);
      setTagColumns([]);
      return;
    }
    setLoading(true);
    setError('');
    notionService.getDatabaseProperties({ databaseId } as NotionConfig)
      .then(props => setProperties(props))
      .catch(err => setError(err.message || 'Error loading properties'))
      .finally(() => setLoading(false));
    configService.getConfig().then((cfg: AppConfig) => {
      const mapping: TagMapping | undefined = cfg && cfg.tagMappings ? cfg.tagMappings[databaseId] : undefined;
      if (mapping) {
        setContextColumns(mapping.contextColumns || []);
        setTagColumns(mapping.tagColumns || []);
      } else {
        setContextColumns([]);
        setTagColumns([]);
      }
    });
  }, [databaseId]);

  // Load prompts when databaseId changes
  useEffect(() => {
    if (!databaseId) {
      setPrompts([]);
      setSelectedPromptIndex(0);
      return;
    }
    configService.getConfig().then((cfg: AppConfig) => {
      const mapping: TagMapping | undefined = cfg && cfg.tagMappings ? cfg.tagMappings[databaseId] : undefined;
      if (mapping && mapping.prompts && mapping.prompts.length > 0) {
        setPrompts(mapping.prompts);
        setSelectedPromptIndex(0);
      } else {
        // Automatically add default prompts if none exist
        setPrompts(DEFAULT_TAGGING_PROMPTS);
        setSelectedPromptIndex(0);
        // Save to backend
        const tagMappings = { ...(cfg.tagMappings || {}) };
        const newMapping: TagMapping = mapping || { contextColumns: [], tagColumns: [] };
        tagMappings[databaseId] = { ...newMapping, prompts: DEFAULT_TAGGING_PROMPTS };
        configService.updateConfig({ tagMappings });
      }
    });
  }, [databaseId]);

  // Load language from config when databaseId changes
  useEffect(() => {
    if (!databaseId) {
      setLanguage('Spanish');
      return;
    }
    configService.getConfig().then((cfg: AppConfig) => {
      const mapping: TagMapping | undefined = cfg && cfg.tagMappings ? cfg.tagMappings[databaseId] : undefined;
      if (mapping && mapping.language) {
        setLanguage(mapping.language);
      } else {
        setLanguage('Spanish');
      }
    });
  }, [databaseId]);

  // Save language to config when changed
  useEffect(() => {
    if (!databaseId) return;
    configService.getConfig().then((cfg: AppConfig) => {
      const tagMappings = { ...(cfg.tagMappings || {}) };
      const mapping: TagMapping = tagMappings[databaseId] || { contextColumns: [], tagColumns: [] };
      if (mapping.language !== language) {
        tagMappings[databaseId] = { ...mapping, language };
        configService.updateConfig({ tagMappings });
      }
    });
  }, [language, databaseId]);

  // Fetch status info when databaseId, contextColumns, or tagColumns change
  useEffect(() => {
    if (!databaseId || !contextColumns.length) {
      setStatusTotal(null);
      setStatusUntagged(null);
      setStatusProcess('idle');
      return;
    }
    setStatusProcess('start');
    // Build a minimal NotionConfig for queryDatabase
    const notionConfig = { databaseId } as NotionConfig;
    notionService.queryDatabase(notionConfig)
      .then((entries: any[]) => {
        setStatusTotal(entries.length);
        // Count entries without any tags in the first tag column mapping
        let untagged = 0;
        if (tagColumns[0] && tagColumns[0].length > 0) {
          const tagProps = tagColumns[0];
          for (const entry of entries) {
            let hasTag = false;
            for (const tagProp of tagProps) {
              if (entry.properties && entry.properties[tagProp] && Array.isArray(entry.properties[tagProp].multi_select)) {
                if (entry.properties[tagProp].multi_select.length > 0) {
                  hasTag = true;
                  break;
                }
              }
            }
            if (!hasTag) untagged++;
          }
        } else {
          untagged = entries.length;
        }
        setStatusUntagged(untagged);
        setStatusProcess('finished');
      })
      .catch(() => {
        setStatusTotal(null);
        setStatusUntagged(null);
        setStatusProcess('idle');
      });
  }, [databaseId, contextColumns, tagColumns]);

  const addContextColumn = () => {
    setContextColumns([...contextColumns, '']);
    setTagColumns([...tagColumns, []]);
  };

  const removeContextColumn = (idx: number) => {
    setContextColumns(contextColumns.filter((_, i) => i !== idx));
    setTagColumns(tagColumns.filter((_, i) => i !== idx));
  };

  const updateContextColumn = (idx: number, value: string) => {
    const updated = [...contextColumns];
    updated[idx] = value;
    setContextColumns(updated);
  };

  const updateTagColumns = (idx: number, values: string[]) => {
    const updated = [...tagColumns];
    updated[idx] = values;
    setTagColumns(updated);
  };

  // Guardar automáticamente el mapping de columnas de tags al cambiar
  useEffect(() => {
    if (!databaseId) return;
    (async () => {
      const cfg = await configService.getConfig();
      const tagMappings = { ...(cfg.tagMappings || {}) };
      const mapping: TagMapping = tagMappings[databaseId] || { contextColumns: [], tagColumns: [] };
      tagMappings[databaseId] = {
        ...mapping,
        contextColumns,
        tagColumns,
        aiConfig,
        prompts,
        language,
        maximumTags
      };
      await configService.updateConfig({ tagMappings });
    })();
  }, [databaseId, JSON.stringify(contextColumns), JSON.stringify(tagColumns), JSON.stringify(aiConfig), JSON.stringify(prompts), language, maximumTags]);

  // Helper: get model options based on provider
  const getModelOptions = () => {
    switch (aiConfig.provider) {
      case 'openai':
        return OPENAI_MODELS;
      case 'openrouter':
        return OPENROUTER_MODELS;
      case 'gemini':
        return GEMINI_MODELS;
      case 'deepseek':
        return DEEPSEEK_MODELS;
      default:
        return [];
    }
  };

  // Helper: handle provider change with default model selection
  const handleProviderChange = (provider: TranslationProvider) => {
    let defaultModel: TranslationModel = '';
    if (provider === 'openai') defaultModel = 'gpt-4o-mini';
    if (provider === 'openrouter') defaultModel = 'google/gemma-3-27b-it:free';
    if (provider === 'gemini') defaultModel = 'gemini-2.0-flash';
    if (provider === 'deepseek') defaultModel = 'deepseek-chat';
    setAiConfig({ provider, model: defaultModel });
  };

  // Al cargar la configuración, cargar también maximumTags si existe
  useEffect(() => {
    if (!databaseId) {
      setMaximumTags(5);
      return;
    }
    configService.getConfig().then((cfg: AppConfig) => {
      const mapping: TagMapping | undefined = cfg && cfg.tagMappings ? cfg.tagMappings[databaseId] : undefined;
      if (mapping && typeof mapping.maximumTags === 'number') {
        setMaximumTags(mapping.maximumTags);
      } else {
        setMaximumTags(5);
      }
    });
  }, [databaseId]);

  // Al guardar la configuración, guardar también maximumTags
  const handleSave = async () => {
    if (!databaseId) {
      setError('Database ID is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const cfg: AppConfig = await configService.getConfig();
      const tagMappings = { ...(cfg.tagMappings || {}) };
      tagMappings[databaseId] = { contextColumns, tagColumns, aiConfig, maximumTags };
      const result = await configService.updateConfig({ tagMappings });
      if (result.success) {
        setSuccess('Mapping saved!');
      } else {
        setError(result.message || 'Error saving mapping');
      }
    } catch (e: any) {
      setError(e.message || 'Error saving mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!promptInput.trim()) return;
    const newPrompts = [...prompts, promptInput.trim()];
    setPrompts(newPrompts);
    setPromptInput('');
    // Save to backend
    const cfg: AppConfig = await configService.getConfig();
    const tagMappings = { ...(cfg.tagMappings || {}) };
    const mapping: TagMapping = tagMappings[databaseId] || { contextColumns: [], tagColumns: [] };
    tagMappings[databaseId] = { ...mapping, contextColumns, tagColumns, aiConfig, prompts: newPrompts };
    await configService.updateConfig({ tagMappings });
  };

  const handleDeletePrompt = async (idx: number) => {
    const newPrompts = prompts.filter((_, i) => i !== idx);
    setPrompts(newPrompts);
    // Save to backend
    const cfg: AppConfig = await configService.getConfig();
    const tagMappings = { ...(cfg.tagMappings || {}) };
    const mapping: TagMapping = tagMappings[databaseId] || { contextColumns: [], tagColumns: [] };
    tagMappings[databaseId] = { ...mapping, contextColumns, tagColumns, aiConfig, prompts: newPrompts };
    await configService.updateConfig({ tagMappings });
  };

  const handleExecutePrompt = async (idx: number) => {
    setPromptLoading(true);
    setPromptError(null);
    setPromptResult(null);
    try {
      const prompt = prompts[idx];
      const contextCol = contextColumns[0] || '';
      const tagCols = tagColumns[0] || [];
      const contextVal = contextCol ? `[Context: {${contextCol}}]` : '';
      const tagsVal = tagCols.length ? `[Tags: {${tagCols.join(', ')}}]` : '';
      // Insert language into prompt
      let finalPrompt = prompt.replace(/\{\{language\}\}/g, language) + `\n${contextVal}\n${tagsVal}`;
      finalPrompt = finalPrompt.replace(/\{\{maximum_tags\}\}/g, maximumTags.toString());
      setExecutedPrompt(finalPrompt);
      if (!aiConfig.provider || !aiConfig.model) {
        setPromptError('Please select an AI provider and model.');
        setPromptLoading(false);
        return;
      }
      const apiKey = await apiKeyService.getApiKey(aiConfig.provider);
      if (!apiKey) {
        setPromptError('Missing API key for selected provider.');
        setPromptLoading(false);
        return;
      }
      const aiResponse = await aiCompletionService.completeText(finalPrompt, {
        provider: aiConfig.provider,
        model: aiConfig.model,
        apiKey,
        temperature: 0.3, // Lower temperature for more consistent results
        maxTokens: 512, // Shorter response since we only need tags
      });
      setPromptResult(aiResponse);
    } catch (err: any) {
      setPromptError(err.message || 'Error executing prompt');
    } finally {
      setPromptLoading(false);
    }
  };

  const handleRestoreDefaultPrompt = async () => {
    // Check if any default prompts are missing
    const missingPrompts = DEFAULT_TAGGING_PROMPTS.filter(defaultPrompt => !prompts.includes(defaultPrompt));
    
    if (missingPrompts.length > 0) {
      const newPrompts = [...missingPrompts, ...prompts];
      setPrompts(newPrompts);
      // Save to backend
      const cfg: AppConfig = await configService.getConfig();
      const tagMappings = { ...(cfg.tagMappings || {}) };
      const mapping: TagMapping = tagMappings[databaseId] || { contextColumns: [], tagColumns: [] };
      tagMappings[databaseId] = { ...mapping, contextColumns, tagColumns, aiConfig, prompts: newPrompts };
      await configService.updateConfig({ tagMappings });
    }
  };

  const handleStartTagging = async () => {
    if (tagging || !databaseId || !contextColumns.length || !tagColumns.length || !aiConfig.provider || !aiConfig.model) return;
    setTagging(true);
    setTaggingLog([`🚀 Tagging started at ${new Date().toLocaleTimeString()}`]);
    setStatusProcess('in-progress');
    taggingAbortRef.current = new AbortController();
    try {
      // Fetch all entries
      setTaggingLog(log => [...log, `📋 Fetching entries from database...`]);
      const notionConfig = { databaseId } as NotionConfig;
      const entries = await notionService.queryDatabase(notionConfig);
      setTaggingLog(log => [...log, `📊 Found ${entries.length} entries in database`]);
      setTaggingProgress({ current: 0, total: entries.length });
      // Get all possible tag options from the Notion database (for the first tag property)
      const tagProps = tagColumns[0] || [];
      const tagOptionsMap: Record<string, string[]> = {};
      // Try to get options from the Notion database schema (if available)
      if (properties && properties.length > 0) {
        // The properties array comes from getDatabaseProperties, but does not include options by default.
        // If you want to support options, you need to fetch the raw schema from Notion API and parse options for multi_select.
        // For now, we will just use the tags that already exist in the entries as possible options.
        for (const tagProp of tagProps) {
          const allTags = new Set<string>();
          for (const entry of entries) {
            const tags = (entry.properties?.[tagProp]?.multi_select || []).map((t: any) => t.name);
            tags.forEach((t: string) => allTags.add(t));
          }
          tagOptionsMap[tagProp] = Array.from(allTags);
        }
      }
      
      // Show available tags to AI
      let entriesWithoutTags = 0;
      for (const entry of entries) {
        for (const tagProp of tagProps) {
          const currentTags = (entry.properties?.[tagProp]?.multi_select || []).map((t: any) => t.name);
          if (currentTags.length === 0) {
            entriesWithoutTags++;
            break; // Only count each entry once even if multiple tag columns are empty
          }
        }
      }
      
      const entriesToProcess: { entry: any, index: number, tagProp: string }[] = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        for (const tagProp of tagProps) {
          const currentTags = (entry.properties?.[tagProp]?.multi_select || []).map((t: any) => t.name);
          if (currentTags.length === 0) {
            entriesToProcess.push({ entry, index: i, tagProp });
            break; // Solo una vez por entrada
          }
        }
      }
      setTaggingLog(log => [...log, `${entriesToProcess.length} tags available to process: [${entriesToProcess.map(e => e.entry.id?.substring(0, 8)).join(', ')}]`]);
      
      for (const tagProp of tagProps) {
        if (tagOptionsMap[tagProp] && tagOptionsMap[tagProp].length > 0) {
          setTaggingLog(log => [...log, `🏷️ Available tags for "${tagProp}": ${tagOptionsMap[tagProp].join(', ')}`]);
        } else {
          setTaggingLog(log => [...log, `🏷️ No existing tags found for "${tagProp}" - AI will create new ones`]);
        }
      }
      
      setTaggingLog(log => [...log, `📊 Entries without tags: ${entriesWithoutTags}`]);
      let processedEntries = 0;
      for (let j = 0; j < entriesToProcess.length; j++) {
        if (taggingAbortRef.current?.signal.aborted) {
          setTaggingLog(log => [...log, 'Tagging stopped by user.']);
          setStatusProcess('finished');
          setTagging(false);
          return;
        }
        const { entry, index: i, tagProp } = entriesToProcess[j];
        const contextCol = contextColumns[0];
        setTaggingLog(log => [...log, `🏷️ #${j + 1} Processing entry ${entry.id?.substring(0, 8)}... for property: ${tagProp}`]);
        const contextVal = entry.properties?.[contextCol]?.title?.[0]?.plain_text || entry.properties?.[contextCol]?.rich_text?.[0]?.plain_text || '';
        if (!contextVal) {
          setTaggingLog(log => [...log, `⚠️ #${j + 1} No context found, skipping entry`]);
          continue;
        }
        let prompt = prompts[selectedPromptIndex] || DEFAULT_TAGGING_PROMPTS[0];
        let availableTagsText = '';
        if (tagOptionsMap[tagProp] && tagOptionsMap[tagProp].length > 0) {
          availableTagsText = `\nAVAILABLE TAGS: ${tagOptionsMap[tagProp].join(', ')}`;
        }
        prompt = prompt.replace('{{context_column_content}}', contextVal)
                       .replace('{{tag_column_values}}', '')
                       .replace(/\{\{language\}\}/g, language)
                       .replace(/\{\{maximum_tags\}\}/g, maximumTags.toString()) + availableTagsText;
        try {
          setTaggingLog(log => [...log, `🤖 #${j + 1} Calling AI for tagging...`]);
          const apiKey = await apiKeyService.getApiKey(aiConfig.provider);
          const aiResponse = await aiCompletionService.completeText(prompt, {
            provider: aiConfig.provider,
            model: aiConfig.model,
            apiKey,
            temperature: 0.1,
            maxTokens: 256,
          });
          setTaggingLog(log => [...log, `🤖 #${j + 1} AI response received: ${aiResponse.substring(0, 100)}...`]);
          let tagLine = aiResponse.trim();
          if (tagLine.includes('\n')) {
            const lines = tagLine.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            tagLine = lines[lines.length - 1];
          }
          if (tagLine.includes(':')) {
            tagLine = tagLine.split(':').pop()?.trim() || tagLine;
          }
          tagLine = tagLine.replace(/\*\*/g, '');
          // Solo usar las sugeridas, pero si alguna coincide con una existente, usar el nombre exacto existente
          let suggestedTags = tagLine.split(',').map(t => t.trim()).filter(Boolean);
          // Limitar el número de tags a maximumTags
          if (suggestedTags.length > maximumTags) {
            suggestedTags = suggestedTags.slice(0, maximumTags);
          }
          let newTags: string[] = [];
          if (tagOptionsMap[tagProp]) {
            newTags = suggestedTags.map(tag => {
              const match = tagOptionsMap[tagProp].find(opt => opt.toLowerCase() === tag.toLowerCase());
              return match || tag;
            });
          } else {
            newTags = suggestedTags;
          }
          // Añadir nuevas tags al schema si es necesario
          for (const tag of newTags) {
            if (!tagOptionsMap[tagProp] || !tagOptionsMap[tagProp].some(opt => opt.toLowerCase() === tag.toLowerCase())) {
              try {
                await notionService.addMultiSelectOption({ databaseId }, tagProp, tag);
                if (!tagOptionsMap[tagProp]) tagOptionsMap[tagProp] = [];
                tagOptionsMap[tagProp].push(tag);
              } catch (e) {}
            }
          }
          if (newTags.length > 0) {
            await notionService.updatePage(entry.id, {
              [tagProp]: { multi_select: newTags.map(name => ({ name })) },
            });
            setTaggingLog(log => [...log, `✅ #${j + 1} Tags assigned: ${newTags.join(', ')}`]);
            processedEntries++;
          }
        } catch (err: any) {
          setTaggingLog(log => [...log, `❌ #${j + 1} Error processing entry: ${err.message}`]);
        }
        setTaggingProgress({ current: j + 1, total: entriesToProcess.length });
        if (tagging) {
          setTaggingLog(log => {
            // Elimina cualquier línea de progreso anterior
            const filtered = log.filter(line => !line.startsWith('⚡ Processing...'));
            return [...filtered, `⚡ Processing... ${j + 1}/${entriesToProcess.length}`];
          });
        }
      }
      
      // Count final statistics
      let finalEntriesTagged = 0;
      for (const entry of entries) {
        for (const tagProp of tagProps) {
          const currentTags = (entry.properties?.[tagProp]?.multi_select || []).map((t: any) => t.name);
          if (currentTags.length > 0) {
            finalEntriesTagged++;
            break; // Only count each entry once
          }
        }
      }
      
      setTaggingLog(log => [...log, `🎉 Tagging finished successfully! Processed ${entriesToProcess.length} entries.`]);
      setTaggingLog(log => [...log, `📊 Total processed entries: ${entriesToProcess.length}`]);
      setTaggingLog(log => [...log, `✅ Entries correctly tagged: ${processedEntries}`]);
      
      // Update status for UI display
      setStatusTotal(entries.length);
      setStatusUntagged(entries.length - finalEntriesTagged);
      setStatusProcess('finished');
    } catch (err: any) {
      setTaggingLog(log => [...log, `❌ Tagging error: ${err.message}`]);
      setStatusProcess('idle');
    }
    setTagging(false);
  };

  const handleStopTagging = () => {
    if (taggingAbortRef.current) {
      taggingAbortRef.current.abort();
    }
    setTagging(false);
    setStatusProcess('finished');
  };

  // Filter helpers
  const contextOptions = properties.filter(p => p.type === 'title' || p.type === 'rich_text');
  const tagOptions = properties.filter(p => p.type === 'multi_select');

  // Add useEffect to reload config when isActive becomes true
  useEffect(() => {
    if (!isActive) return;
    if (!databaseId) return;
    // Reload all config state from backend when tab is activated
    configService.getConfig().then((cfg: AppConfig) => {
      const mapping: TagMapping | undefined = cfg && cfg.tagMappings ? cfg.tagMappings[databaseId] : undefined;
      if (mapping) {
        setContextColumns(mapping.contextColumns || []);
        setTagColumns(mapping.tagColumns || []);
        setAiConfig(mapping.aiConfig || { provider: '', model: '' });
        setPrompts(mapping.prompts || DEFAULT_TAGGING_PROMPTS);
        setLanguage(mapping.language || 'Spanish');
        setMaximumTags(typeof mapping.maximumTags === 'number' ? mapping.maximumTags : 5);
      }
    });
  }, [isActive, databaseId]);

  return (
    <div className="tag-config-panel">
      <div className="config-section" style={{ paddingTop: 32 }}>
        <h3 className="config-section-title">Tag Config</h3>
        <div className="config-field">
          <label className="config-label">Database</label>
          <select
            className="config-select"
            value={databaseId}
            onChange={e => setDatabaseId(e.target.value)}
          >
            <option value="">Select a database</option>
            {savedDatabaseIds && savedDatabaseIds.map(db => (
              <option key={db.id} value={db.databaseId}>{db.name}</option>
            ))}
          </select>
        </div>
        {loading && <div style={{ color: '#888', padding: '8px 0' }}>Loading properties...</div>}
        {error && <div style={{ color: '#c00', padding: '8px 0' }}>{error}</div>}
        {success && <div style={{ color: '#080', padding: '8px 0' }}>{success}</div>}
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', paddingTop: 24 }}>
          {/* Context Columns */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>Context Columns</div>
            {contextColumns.map((col, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <select
                  className="config-select"
                  value={col}
                  onChange={e => updateContextColumn(idx, e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Select property</option>
                  {contextOptions.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({p.type})</option>
                  ))}
                </select>
                <button
                  className="config-btn config-btn-secondary"
                  style={{ marginLeft: 8, minWidth: 32 }}
                  onClick={() => removeContextColumn(idx)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
            <button className="config-btn config-btn-primary" type="button" onClick={addContextColumn}>
              + Add Context Column
            </button>
          </div>
          {/* Tag Columns */}
          <div style={{ flex: 2, paddingTop: 0 }}>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>Tag Columns (multi-select)</div>
            {contextColumns.map((_, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <select
                  className="config-select"
                  multiple
                  value={tagColumns[idx]}
                  onChange={e => {
                    const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
                    updateTagColumns(idx, options);
                  }}
                  style={{ flex: 1, minHeight: 40 }}
                >
                  {tagOptions.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({p.type})</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Campo para configurar el número máximo de tags */}
      <div className="config-section" style={{ marginBottom: 24 }}>
        <h3 className="config-section-title">Maximum Tags per Entry</h3>
        <div className="config-field">
          <label className="config-label" htmlFor="maximumTags">Maximum number of tags assigned by AI</label>
          <input
            id="maximumTags"
            type="number"
            min={1}
            max={20}
            className="config-input"
            value={maximumTags}
            onChange={e => setMaximumTags(Math.max(1, Math.min(20, Number(e.target.value))))}
            style={{ width: 120 }}
          />
          <span style={{ color: '#888', fontSize: 13, marginLeft: 8 }}>
            This value will be sent to the AI and limits the number of tags per entry.
          </span>
        </div>
      </div>
      <div className="config-section" style={{ marginBottom: 24 }}>
        <h3 className="config-section-title">Language for Tagging</h3>
        <div className="config-field">
          <label className="config-label">Language</label>
          <select
            className="config-select"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          >
            {LANGUAGE_OPTIONS.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="config-section" style={{ marginBottom: 24 }}>
        <h3 className="config-section-title">AI Selector</h3>
        <div className="config-field">
          <label className="config-label">Provider</label>
          <select
            className="config-select"
            value={aiConfig.provider}
            onChange={e => handleProviderChange(e.target.value as TranslationProvider)}
          >
            <option value="">Select provider</option>
            {PROVIDER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="config-field">
          <label className="config-label">Model</label>
          <select
            className="config-select"
            value={aiConfig.model}
            onChange={e => setAiConfig({ ...aiConfig, model: e.target.value as TranslationModel })}
            disabled={!aiConfig.provider}
          >
            <option value="">Select model</option>
            {getModelOptions().map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="config-section" style={{ marginBottom: 24 }}>
        <h3 className="config-section-title">Prompt Maker</h3>
        <div className="config-field">
          <label className="config-label">Custom Prompt</label>
          <textarea
            className="config-textarea"
            value={promptInput}
            onChange={e => setPromptInput(e.target.value)}
            placeholder="Enter your custom prompt here..."
            rows={3}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button
            className="config-btn config-btn-primary"
            type="button"
            style={{ marginTop: 4 }}
            onClick={handleSavePrompt}
            disabled={!promptInput.trim() || !databaseId}
          >
            Save Prompt
          </button>
        </div>
        {prompts.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Active Prompt Selection</div>
            <div className="config-field" style={{ marginBottom: 16 }}>
              <label className="config-label">Selected Prompt for Tagging</label>
              <select
                className="config-select"
                value={selectedPromptIndex}
                onChange={e => setSelectedPromptIndex(parseInt(e.target.value))}
              >
                {prompts.map((prompt, idx) => (
                  <option key={idx} value={idx}>
                    {idx === 0 && prompt.includes('INSTRUCCIÓN CRÍTICA') ? 'Spanish Prompt' :
                     idx === 1 && prompt.includes('CRITICAL INSTRUCTION') ? 'English Prompt' :
                     `Custom Prompt ${idx + 1}`} - {prompt.slice(0, 50)}...
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>All Saved Prompts</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {prompts.map((p, idx) => (
                <li key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: 8, 
                  background: selectedPromptIndex === idx ? '#e3f2fd' : '#f8f9fa', 
                  borderRadius: 6, 
                  padding: 8,
                  border: selectedPromptIndex === idx ? '2px solid #2196f3' : '1px solid transparent',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedPromptIndex(idx)}
                >
                  <span style={{ flex: 1, fontSize: 14 }}>
                    {selectedPromptIndex === idx && <span style={{ color: '#2196f3', fontWeight: 'bold' }}>● </span>}
                    {p.slice(0, 100)}...
                  </span>
                  <button
                    className="config-btn config-btn-secondary"
                    style={{ marginLeft: 8, minWidth: 32, padding: 6, backgroundColor: selectedPromptIndex === idx ? '#2196f3' : undefined, color: selectedPromptIndex === idx ? 'white' : undefined }}
                    onClick={e => { e.stopPropagation(); setModalPromptText(p); setShowPromptModal(true); }}
                    title="Show full prompt"
                    type="button"
                  >
                    <span role="img" aria-label="show">👁️</span>
                  </button>
                  <button
                    className="config-btn config-btn-danger"
                    style={{ marginLeft: 4, minWidth: 32, padding: 6 }}
                    onClick={e => { e.stopPropagation(); handleDeletePrompt(idx); }}
                    title="Delete Prompt"
                    disabled={promptLoading}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
            {promptLoading && <div style={{ color: '#888', marginTop: 8 }}>Running prompt...</div>}
            {promptError && <div style={{ color: '#c00', marginTop: 8 }}>{promptError}</div>}
            {promptResult && (
              <div style={{ marginTop: 16, background: '#f1f8e9', border: '1px solid #c5e1a5', borderRadius: 6, padding: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>AI Response:</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 15 }}>{promptResult}</div>
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          className="config-btn config-btn-secondary"
          type="button"
          onClick={handleRestoreDefaultPrompt}
          disabled={DEFAULT_TAGGING_PROMPTS.every(defaultPrompt => prompts.includes(defaultPrompt))}
        >
          Restore Default Prompts
        </button>
      </div>
      <div style={{ textAlign: 'right' }}>
        <button className="config-btn config-btn-primary" type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Mapping'}
        </button>
      </div>

      {/* Start/Stop Tagging Buttons */}
      <div className="config-section" style={{ marginTop: 24 }}>
        <h3 className="config-section-title">AI Tagging Process</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <button
            className="config-btn config-btn-primary"
            type="button"
            onClick={handleStartTagging}
            disabled={tagging || !databaseId || !contextColumns.length || !tagColumns.length || !aiConfig.provider || !aiConfig.model}
            style={{ fontSize: 16, padding: '12px 24px' }}
          >
            {tagging ? 'Tagging in Progress...' : 'Start Tagging'}
          </button>
          {tagging && (
            <button
              className="config-btn config-btn-danger"
              type="button"
              onClick={handleStopTagging}
              style={{ fontSize: 16, padding: '12px 24px' }}
            >
              Stop Tagging
            </button>
          )}
        </div>
      </div>

      {/* Status Panel / Console */}
      <div className="config-section" style={{ marginTop: 32, background: '#f8f9fa', borderRadius: 8, padding: 16, border: '1px solid #e0e0e0' }}>
        <h3 className="config-section-title" style={{ marginBottom: 12 }}>Status Panel / Console</h3>
        {/* Remove static status display, show all info in terminal below */}
        <div style={{ background: '#222', color: '#39ff14', fontFamily: 'monospace', fontSize: 13, borderRadius: 4, padding: 8, minHeight: 80, maxHeight: 220, overflowY: 'auto' }}>
          {taggingLog.length === 0 ? (
            <span style={{ color: '#888' }}>Console output will appear here...</span>
          ) : (
            taggingLog.map((line, i) => <div key={i}>{line}</div>)
          )}
          {tagging && (
            <div style={{ color: '#ffa000' }}>⚡ Processing... {taggingProgress.current}/{taggingProgress.total}</div>
          )}
          {/* Removed summary with emojis when finished to avoid duplication */}
        </div>
      </div>

      {/* Prompt Modal */}
      {showPromptModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.35)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
          onClick={() => setShowPromptModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 10,
              maxWidth: 600,
              width: '90vw',
              maxHeight: '80vh',
              padding: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'none',
                border: 'none',
                fontSize: 22,
                cursor: 'pointer',
                color: '#888',
              }}
              onClick={() => setShowPromptModal(false)}
              aria-label="Close"
              type="button"
            >
              ×
            </button>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Full Prompt</div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 15, margin: 0 }}>{modalPromptText}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagConfigPanel;
