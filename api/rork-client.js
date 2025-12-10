/**
 * Rork AI Client
 * Wrapper for Rork AI toolkit SDK functions
 */

/**
 * Generate text using AI
 * @param {Object} options - Generation options
 * @param {Array} options.messages - Messages array
 * @param {string} options.model - Model to use
 * @param {number} options.temperature - Temperature setting
 * @returns {Promise<string>} Generated text
 */
export async function generateText(options) {
  try {
    // This would use the actual Rork AI SDK in production
    // For now, this is a stub that shows the interface
    const { messages, model, temperature } = options;

    // Import the actual SDK function dynamically if available
    if (typeof window !== 'undefined' && window.RorkAI) {
      return await window.RorkAI.generateText(options);
    }

    // For server-side or when SDK is not available, use fetch
    const response = await fetch('/api/ai/generate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: model || 'gpt-4',
        temperature: temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('[generateText] Error:', error);
    throw new Error(`Failed to generate text: ${error.message}`);
  }
}

/**
 * Generate structured object using AI
 * @param {Object} options - Generation options
 * @param {Array} options.messages - Messages array
 * @param {Object} options.schema - Zod schema for validation
 * @param {string} options.model - Model to use
 * @returns {Promise<Object>} Generated and validated object
 */
export async function generateObject(options) {
  try {
    const { messages, schema, model } = options;

    // Import the actual SDK function dynamically if available
    if (typeof window !== 'undefined' && window.RorkAI) {
      return await window.RorkAI.generateObject(options);
    }

    // For server-side or when SDK is not available, use fetch
    const response = await fetch('/api/ai/generate-object', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        schemaDescription: describeSchema(schema),
        model: model || 'gpt-4',
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate against schema if provided
    if (schema) {
      const parsed = schema.parse(data.object);
      return parsed;
    }

    return data.object;
  } catch (error) {
    console.error('[generateObject] Error:', error);
    throw new Error(`Failed to generate object: ${error.message}`);
  }
}

/**
 * Create a Rork tool definition
 * @param {Object} options - Tool options
 * @param {string} options.description - Tool description
 * @param {Object} options.zodSchema - Zod schema for parameters
 * @param {Function} options.execute - Execution function
 * @returns {Object} Tool definition
 */
export function createRorkTool(options) {
  const { description, zodSchema, execute } = options;

  return {
    description,
    schema: zodSchema,
    execute: async (input) => {
      try {
        // Validate input against schema
        const validated = zodSchema.parse(input);
        
        // Execute the tool function
        const result = await execute(validated);
        
        return result;
      } catch (error) {
        console.error('[createRorkTool] Execution error:', error);
        throw error;
      }
    },
  };
}

/**
 * Use Rork agent hook interface
 * @param {Object} options - Agent options
 * @param {Object} options.tools - Tool definitions
 * @param {string} options.systemPrompt - System prompt
 * @returns {Object} Agent interface
 */
export function useRorkAgent(options) {
  // This is a stub that shows the interface
  // In production, this would use the actual Rork SDK hook
  
  const { tools, systemPrompt } = options;

  // Return a compatible interface
  return {
    messages: [],
    error: null,
    isLoading: false,
    sendMessage: async (message) => {
      console.log('[useRorkAgent] Sending message:', message);
      // Implementation would be provided by actual SDK
    },
    setMessages: (updater) => {
      console.log('[useRorkAgent] Setting messages:', updater);
      // Implementation would be provided by actual SDK
    },
  };
}

/**
 * Describe Zod schema for AI
 * @param {Object} schema - Zod schema
 * @returns {string} Schema description
 */
function describeSchema(schema) {
  if (!schema) return 'No schema provided';
  
  try {
    // Extract schema description
    const shape = schema._def?.shape || schema._def?.schema?._def?.shape;
    
    if (!shape) {
      return 'Complex schema - see documentation';
    }

    const fields = Object.keys(shape).map(key => {
      const field = shape[key];
      const description = field._def?.description || '';
      const type = field._def?.typeName || 'unknown';
      
      return `${key}: ${type}${description ? ` - ${description}` : ''}`;
    }).join(', ');

    return `Schema fields: {${fields}}`;
  } catch (error) {
    console.error('[describeSchema] Error:', error);
    return 'Schema description not available';
  }
}

/**
 * Parse AI response for structured data
 * @param {string} response - AI response text
 * @param {Object} schema - Expected schema
 * @returns {Object} Parsed data
 */
export function parseAIResponse(response, schema) {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate against schema if provided
    if (schema) {
      return schema.parse(parsed);
    }

    return parsed;
  } catch (error) {
    console.error('[parseAIResponse] Error:', error);
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

/**
 * Stream AI responses
 * @param {Object} options - Streaming options
 * @param {Array} options.messages - Messages array
 * @param {Function} options.onChunk - Callback for each chunk
 * @returns {Promise<void>}
 */
export async function streamText(options) {
  try {
    const { messages, onChunk } = options;

    const response = await fetch('/api/ai/stream-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value);
      onChunk(chunk);
    }
  } catch (error) {
    console.error('[streamText] Error:', error);
    throw new Error(`Failed to stream text: ${error.message}`);
  }
}

/**
 * Check AI service health
 * @returns {Promise<boolean>} Service health status
 */
export async function checkAIHealth() {
  try {
    const response = await fetch('/api/ai/health', {
      method: 'GET',
    });

    return response.ok;
  } catch (error) {
    console.error('[checkAIHealth] Error:', error);
    return false;
  }
}
