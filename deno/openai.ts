import OpenAI from '@openai/openai'

const client = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
})

const baseSystemMessage = await Deno.readTextFile('./deno/prompt.txt')

type AITrack = {
  title: string
  code: string
}

export async function generateAITrack(
  userMessage: string,
  temperature: number = 0.3,
  topP: number = 1.0,
  model: string = 'gpt-5.2-chat-latest',
): Promise<AITrack> {
  try {
    const systemMessage = `${baseSystemMessage}

You are generating a completely new track from scratch. The user will describe what they want, and you should create DSP code that matches their description. Be creative and generate interesting musical patterns.

Answer in JSON format with the following structure:
\`\`\`
{
  "title": "string",
  "code": "string"
}
\`\`\`
`

    const response = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      temperature,
      top_p: topP,
      messages: [
        {
          role: 'assistant',
          content: systemMessage,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    console.log(response.choices[0]?.message?.content)
    const reply = JSON.parse(response.choices[0]?.message?.content || '{}')
    console.log(reply.code)
    return reply
  }
  catch (error) {
    console.error('Error talking to assistant:', error)
    throw error
  }
}

export async function modifyAITrack(
  userMessage: string,
  currentCode: string,
  temperature: number = 0.3,
  topP: number = 1.0,
  model: string = 'gpt-5.2-chat-latest',
): Promise<AITrack> {
  try {
    const systemMessage = `${baseSystemMessage}

You are modifying an existing track. The user will provide the current code and describe what changes they want. You should:
1. Analyze the current code carefully
2. Make the requested modifications while preserving the overall structure and style
3. Only change what is necessary to fulfill the user's request
4. Maintain musical coherence
5. Don't remove or modify any of the provided code unless explicitly requested! Only apply the changes that are requested

Return the modified code with an appropriate title that reflects the changes.

Answer in JSON format with the following structure:
\`\`\`
{
  "code": "string"
}
\`\`\`
`

    const response = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      temperature,
      top_p: topP,
      messages: [
        {
          role: 'assistant',
          content: systemMessage,
        },
        {
          role: 'user',
          content: `Current code:\n\`\`\`\n${currentCode}\n\`\`\`\n\nRequested changes: ${userMessage}`,
        },
      ],
    })

    console.log(response.choices[0]?.message?.content)
    const reply = JSON.parse(response.choices[0]?.message?.content || '{}')
    console.log(reply.code)
    return reply
  }
  catch (error) {
    console.error('Error modifying track:', error)
    throw error
  }
}

export async function generateSimilarTrack(
  currentCode: string,
  temperature: number = 0.3,
  topP: number = 1.0,
  model: string = 'gpt-5-chat-latest',
): Promise<AITrack> {
  try {
    const systemMessage = `${baseSystemMessage}

You are creating a variation of an existing track. The user will provide the current code, and you should:
1. Analyze the musical patterns, instruments, and style
2. Generate a new track that is similar in style and structure but with creative variations
3. Keep the same general feel and instruments, but change melodies, rhythms, textures or other musical elements
4. Make it feel like a remix or variation, not an exact copy
5. Add or remove instruments or effects to the sources to create a new track.
Return the new variation code with a title that suggests it's related to the original.

Answer in JSON format with the following structure:
\`\`\`
{
  "title": "string",
  "code": "string"
}
\`\`\`
`

    const response = await client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      temperature,
      top_p: topP,
      messages: [
        {
          role: 'assistant',
          content: systemMessage,
        },
        {
          role: 'user',
          content: `Create a similar variation of this track:\n\`\`\`\n${currentCode}\n\`\`\``,
        },
      ],
    })

    console.log(response.choices[0]?.message?.content)
    const reply = JSON.parse(response.choices[0]?.message?.content || '{}')
    console.log(reply.code)
    return reply
  }
  catch (error) {
    console.error('Error generating similar track:', error)
    throw error
  }
}
