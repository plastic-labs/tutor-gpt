import { user, assistant, Message } from '@/utils/ai';

const MAXIMUM_SUMMARY_SIZE: string = '6 sentences';

export const MAX_CONTEXT_SIZE = 11;
export const SUMMARY_SIZE = 5;

const summaryPrompt: Message[] = [
  user`You are an AI assistant tasked with creating or updating conversation history summaries. Your goal is to produce concise, information-dense summaries that capture key points while adhering to a specified size limit.

  The size limit for the summary is:
  <size_limit>
  ${MAXIMUM_SUMMARY_SIZE}
  </size_limit>

  For each summarization task, you will receive the following inputs:

  1. New messages to be summarized:
  <new_messages>
  {NEW_MESSAGES}
  </new_messages>

  2. An existing summary (if available):
  <existing_summary>
  {EXISTING_SUMMARY}
  </existing_summary>

  Instructions:

  1. Review the existing summary (if provided) and the new messages.

  2. Analyze the conversation inside <analysis> tags:
    a. Summarize the existing summary (if any)
    b. List key points from new messages
    c. Identify overlaps between existing summary and new messages, and highlight new information
    d. Prioritize information based on importance and relevance
    e. Plan how to express key points concisely
    It's OK for this section to be quite long.

  3. Create or update the summary based on your analysis:
    - Ensure a coherent and chronological flow of information.
    - Use concise language and avoid redundancy.
    - Combine related points where possible to save space.
    - Only mention participant names if crucial for context or decisions.
    - Use clear abbreviations for common terms if needed to save space.

  4. Check the summary length against the maximum output size. If it exceeds the limit, prioritize critical information and remove less essential details.

  5. Present your final summary within <summary> tags. Do not include any explanations or meta-commentary outside these tags.

  Example output structure:

  <analysis>
  [Your detailed analysis of the conversation, including steps a through e as outlined above]
  </analysis>

  <summary>
  [Your concise, information-dense summary of the conversation, adhering to the size limit]
  </summary>

  Remember, your goal is to create a dense, informative summary that captures the key points of the conversation within the specified size constraint.`,
  assistant`Got it. I'm ready for any summarization tasks you have for me!`,
];

export default summaryPrompt;
