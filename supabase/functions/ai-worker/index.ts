import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get secrets from Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Create Supabase client to fetch secrets
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Fetch OpenAI API key from Supabase secrets
async function getOpenAIKey() {
  const { data, error } = await supabase.rpc('vault_get_secret', { secret_name: 'OPENAI_API_KEY' });
  if (error) {
    console.error('Error fetching OpenAI API key:', error);
    throw new Error('Failed to fetch OpenAI API key from secrets');
  }
  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AI Worker starting...');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    // Get OpenAI API key from Supabase secrets
    const openAIApiKey = await getOpenAIKey();
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured in Supabase secrets');
    }

    // 1) Dequeue a small batch of tasks
    const { data: tasks, error: dqErr } = await supabase.rpc('ai_dequeue', { p_batch: 3 });
    if (dqErr) {
      console.error('Dequeue error:', dqErr);
      throw dqErr;
    }

    if (!tasks || tasks.length === 0) {
      console.log('No tasks to process');
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${tasks.length} tasks`);
    let processed = 0;

    for (const task of tasks) {
      try {
        console.log(`Processing task ${task.id} of type ${task.task_type}`);
        
        // 2) Load question context
        const { data: question, error: qErr } = await supabase
          .from('questions')
          .select('id, subject, chapter, topic, stem, options, correct_index, explanation, difficulty, language, tags')
          .eq('id', task.question_id)
          .single();

        if (qErr || !question) {
          console.error('Question fetch error:', qErr);
          throw qErr ?? new Error('Question not found');
        }

        // 3) Process task with OpenAI
        const result = await handleTask(task, question, openAIApiKey);
        console.log(`Task ${task.id} completed with result:`, result);

        // 4) Apply result atomically
        const { error: applyErr } = await supabase.rpc('ai_apply_result', {
          p_task_id: task.id,
          p_result: result
        });

        if (applyErr) {
          console.error('Apply result error:', applyErr);
          throw applyErr;
        }

        processed++;
        console.log(`Task ${task.id} applied successfully`);
      } catch (err: any) {
        console.error(`Error processing task ${task.id}:`, err);
        await supabase.rpc('ai_mark_error', { 
          p_task_id: task.id, 
          p_error: String(err?.message ?? err) 
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('Worker error:', e);
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Task handlers
async function handleTask(task: any, question: any, openAIApiKey: string) {
  switch (task.task_type) {
    case 'explain':
      return await explainPrompt(question, task.payload, openAIApiKey);
    case 'difficulty':
      return await difficultyPrompt(question, openAIApiKey);
    case 'tags':
      return await tagsPrompt(question, openAIApiKey);
    case 'bloom':
      return await bloomPrompt(question, openAIApiKey);
    case 'translate':
      return await translatePrompt(question, task.locale || task.payload?.language || 'hi', openAIApiKey);
    case 'qc':
      return await qcPrompt(question, openAIApiKey);
    case 'summary':
      return await summaryPrompt(question, task.payload, openAIApiKey);
    default:
      throw new Error(`Unknown task type: ${task.task_type}`);
  }
}

async function chatJSON(messages: any[], openAIApiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content ?? '{}';
  return JSON.parse(content);
}

// Prompt implementations
async function explainPrompt(question: any, payload: any, openAIApiKey: string) {
  const systemPrompt = `You are a NEET physics, chemistry, and biology expert. Generate clear, concise explanations for multiple choice questions. Output ONLY valid JSON: {"text": "main explanation", "why_others_wrong": {"A":"reason","B":"reason","C":"reason","D":"reason"}}. Be exam-accurate and student-friendly.`;
  
  const userPrompt = {
    question: {
      stem: question.stem,
      options: question.options,
      correct_index: question.correct_index,
      subject: question.subject,
      chapter: question.chapter
    },
    style: payload?.style ?? 'neet',
    language: payload?.language ?? 'en'
  };

  return await chatJSON([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(userPrompt) }
  ], openAIApiKey);
}

async function difficultyPrompt(question: any, openAIApiKey: string) {
  const systemPrompt = `Classify NEET MCQ difficulty on scale 1-5 (1=very easy, 2=easy, 3=moderate, 4=hard, 5=very hard). Consider concept depth, calculation complexity, and typical student performance. Output ONLY JSON: {"difficulty": <1-5>}`;
  
  const userPrompt = {
    stem: question.stem,
    options: question.options,
    subject: question.subject,
    chapter: question.chapter,
    topic: question.topic
  };

  return await chatJSON([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(userPrompt) }
  ], openAIApiKey);
}

async function tagsPrompt(question: any, openAIApiKey: string) {
  const systemPrompt = `Suggest up to 5 relevant tags for this NEET question and suggest corrected metadata if needed. Output ONLY JSON: {"tags":["tag1","tag2"...],"subject":"Physics|Chemistry|Biology","chapter":"chapter name","topic":"specific topic"}`;
  
  const userPrompt = {
    stem: question.stem,
    current: {
      subject: question.subject,
      chapter: question.chapter,
      topic: question.topic,
      tags: question.tags ?? []
    }
  };

  return await chatJSON([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(userPrompt) }
  ], openAIApiKey);
}

async function bloomPrompt(question: any, openAIApiKey: string) {
  const systemPrompt = `Classify this question according to Bloom's Taxonomy. Output ONLY JSON: {"bloom":"Remember|Understand|Apply|Analyze|Evaluate|Create"}`;
  
  const userPrompt = {
    stem: question.stem,
    options: question.options,
    subject: question.subject
  };

  return await chatJSON([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(userPrompt) }
  ], openAIApiKey);
}

async function translatePrompt(question: any, targetLang: string, openAIApiKey: string) {
  const systemPrompt = `Translate this NEET question faithfully to the target language, maintaining scientific accuracy. Output ONLY JSON: {"language":"<language_code>","stem":"translated stem","options":["A","B","C","D"],"explanation":{"text":"translated explanation"}}`;
  
  const userPrompt = {
    target_language: targetLang,
    source_language: question.language ?? 'English',
    stem: question.stem,
    options: question.options,
    explanation: question.explanation
  };

  return await chatJSON([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(userPrompt) }
  ], openAIApiKey);
}

async function qcPrompt(question: any, openAIApiKey: string) {
  const systemPrompt = `Quality check this NEET MCQ for common issues. Output ONLY JSON: {"duplicate": false, "weak_distractors":[], "unclear_stem": false, "notes":"any additional observations"}`;
  
  const userPrompt = {
    stem: question.stem,
    options: question.options,
    chapter: question.chapter,
    subject: question.subject,
    tags: question.tags
  };

  return await chatJSON([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(userPrompt) }
  ], openAIApiKey);
}

async function summaryPrompt(question: any, payload: any, openAIApiKey: string) {
  const systemPrompt = `Create actionable insights from admin analytics data. Output ONLY JSON: {"bullets":["insight 1","insight 2","insight 3"]}`;
  
  return await chatJSON([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(payload || { context: 'general_summary' }) }
  ], openAIApiKey);
}