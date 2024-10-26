// mimic the flow of the root page.tsx except it adds the prepended site's context
// as the first item of context in the conversation, with bloom ready to dive into the context/topic
// Write a function that takes the url, serves it to r.jina.ai and receives back a JSON object with the parsed site contents.
import fetch from 'node-fetch';
import 'dotenv/config';

const token = process.env.JINA_API || '';

type siteContents = {
  content: string
}

const getPromptFromURL = async (url: string): Promise<siteContents> => {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const rawText = await response.text();
  return { content: rawText };
};

getPromptFromURL("https://example.com/")
