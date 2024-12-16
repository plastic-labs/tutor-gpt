import d from 'dedent-js';

export interface Message {
  role: string;
  content: string;
}

export const user = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): Message => ({
  role: 'user',
  content: d(strings, ...values),
});

export const assistant = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): Message => ({
  role: 'assistant',
  content: d(strings, ...values),
});

export const system = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): Message => ({
  role: 'system',
  content: d(strings, ...values),
});

export type History = { role: 'history' };
export const history: History = { role: 'history' };

export type UnrenderedPrompt = Array<Message | History>;

export function render(
  prompt: UnrenderedPrompt,
  history: Message[]
): Message[] {
  return prompt.reduce<Message[]>((acc, curr) => {
    if ((curr as History).role === 'history') {
      return [...acc, ...history];
    }
    return [...acc, curr as Message];
  }, []);
}
