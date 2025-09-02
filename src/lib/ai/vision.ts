interface OMRResult {
  answers: { q: number; sel: number; conf: number }[];
  warnings: string[];
  pages?: number;
}

interface DetectionMeta {
  questionCount: number;
  startIndex: number;
  qrPayload?: any;
}

export async function detectAnswers(
  imageBuffers: Buffer[],
  meta: DetectionMeta
): Promise<OMRResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Convert buffers to base64 for OpenAI API
    const base64Images = imageBuffers.map(buffer => 
      `data:image/jpeg;base64,${buffer.toString('base64')}`
    );

    const systemPrompt = `You are an OMR (Optical Mark Recognition) engine for NEET answer sheets. 
    Your job is to detect filled bubbles and return answers in JSON format.
    
    CRITICAL REQUIREMENTS:
    - Return ONLY valid JSON: {"answers":[{"q":1,"sel":0,"conf":0.95}],"warnings":["..."]}
    - q: question number (1-based)
    - sel: selected option (0=A, 1=B, 2=C, 3=D)
    - conf: confidence score 0.0 to 1.0
    - Include warnings for unclear, multiple, or missing answers
    - If a bubble is partially filled or unclear, use lower confidence score`;

    const userPrompt = `Analyze this OMR answer sheet and detect filled bubbles.
    
    Sheet Details:
    - Questions: ${meta.startIndex} to ${meta.startIndex + meta.questionCount - 1}
    - Total questions on sheet: ${meta.questionCount}
    - Each question has 4 options: A, B, C, D arranged horizontally
    - Look for dark, completely filled circular bubbles (●)
    - Ignore light marks, partial fills, or stray marks
    
    The sheet may have:
    - Alignment corners (black squares in corners - ignore these)
    - QR codes (ignore these)
    - Student information fields (ignore these)
    - Grid layout with question numbers and option bubbles
    
    Return JSON with detected answers and any issues found.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              ...base64Images.map(image => ({
                type: 'image_url',
                image_url: { url: image, detail: 'high' }
              }))
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI Vision API');
    }

    try {
      const parsed = JSON.parse(content) as OMRResult;
      
      // Validate the response structure
      if (!Array.isArray(parsed.answers)) {
        throw new Error('Invalid response: answers must be an array');
      }

      // Validate each answer
      parsed.answers.forEach((answer, index) => {
        if (typeof answer.q !== 'number' || typeof answer.sel !== 'number' || typeof answer.conf !== 'number') {
          throw new Error(`Invalid answer format at index ${index}`);
        }
        if (answer.sel < 0 || answer.sel > 3) {
          throw new Error(`Invalid selection ${answer.sel} at question ${answer.q}`);
        }
        if (answer.conf < 0 || answer.conf > 1) {
          throw new Error(`Invalid confidence ${answer.conf} at question ${answer.q}`);
        }
      });

      return {
        answers: parsed.answers,
        warnings: parsed.warnings || [],
        pages: imageBuffers.length,
      };

    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error(`Failed to parse OMR results: ${parseError.message}`);
    }

  } catch (error) {
    console.error('OMR detection error:', error);
    throw error;
  }
}