import os
from typing import Optional, Tuple

import gradio as gr
from langchain import LLMChain
from langchain.chains.conversation.memory import ConversationalBufferWindowMemory
from langchain.prompts import PromptTemplate
from langchain.llms import OpenAI

from dotenv import load_dotenv
load_dotenv()

template_str = """You are a Socratic Tutor. 
You don't have all the answers. Questioning should not be adversarial but rather tentative and playful. 
Respond in brevity to student inquiries based on the context and you must ask a follow up question.

Context: {context}

{history}
Student: {input}
Tutor:"""

PROMPT_TEMPLATE = PromptTemplate(
    input_variables=["context", "history", "input"],
    template=template_str
)

def load_chain():
    """Logic for loading the chain you want to use should go here."""
    llm = OpenAI(temperature=0)
    # history_str = "\n".join([f"{x[0]}: {x[1]}" for x in history])
    chain = LLMChain(llm=llm, memory=ConversationalBufferWindowMemory(k=15, memory_key="history", input_key="input"), prompt=PROMPT_TEMPLATE, verbose=True)
    return chain

def chat(
    context: str, inp: str, history: Optional[Tuple[str, str]], chain: Optional[LLMChain]
):
    """Execute the chat functionality."""
    history = history or []
    chain = load_chain()
    
    # If chain is None, that is because no API key was provided.
    if chain is None:
        history.append((inp, "Please set your OpenAI key to use"))
        return history, history
    # Run chain and append input.
    output = chain.predict(input=inp, context=context)
    print(output)
    history.append((inp, output))
    return history, history


block = gr.Blocks(css=".gradio-container {background-color: lightgray}")

with block:
    with gr.Row():
        gr.Markdown("<h3><center>Tutor GPT v1 Demo</center></h3>")

    with gr.Row():
        with gr.Column(scale=0.70):
            context = gr.Textbox(
                label="Context",
                placeholder="Paste your excerpt/article/document here...",
                lines=15,
            )
        with gr.Column(scale=0.30):
            chatbot = gr.Chatbot()

    with gr.Row():
        message = gr.Textbox(
            label="What's your question?",
            placeholder="What's the answer to life, the universe, and everything?",
            lines=1,
        )
        submit = gr.Button(value="Send", variant="secondary").style(full_width=False)

    gr.Examples(
        examples=[
            "I don't get it. Can you summarize this for me?",
            "What's the main idea with this passage?",
        ],
        inputs=message,
    )

    gr.HTML("Demo application of a LangChain chain.")

    gr.HTML(
        "<center>Powered by <a href='https://github.com/hwchase17/langchain'>LangChain 🦜️🔗</a></center>"
    )

    state = gr.State()
    agent_state = gr.State()

    submit.click(chat, inputs=[context, message, state, agent_state], outputs=[chatbot, state])
    message.submit(chat, inputs=[context, message, state, agent_state], outputs=[chatbot, state])


block.launch(debug=True)
