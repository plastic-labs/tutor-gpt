import os
from typing import Optional, Tuple

import gradio as gr
import pandas as pd
from langchain import LLMChain
from langchain.chains.conversation.memory import ConversationalBufferWindowMemory
from langchain.prompts import PromptTemplate
from langchain.llms import OpenAI
from langchain.prompts import load_prompt



PROMPT_TEMPLATE = load_prompt("data/prompts/original_prompt.yaml")

def load_chain():
    """Logic for loading the chain you want to use should go here."""
    llm = OpenAI(temperature=0.9)   # defaults to text-davinci-003 i think
    chain = LLMChain(
        llm=llm, 
        memory=ConversationalBufferWindowMemory(
            k=15, 
            memory_key="history",   # when you have multiple inputs, you need to specify which inputs to record for history
            input_key="input"
        ), 
        prompt=PROMPT_TEMPLATE, 
        verbose=True
    )
    return chain

def set_openai_api_key(api_key: str):
    """Set the api key and return chain.
    If no api_key, then None is returned.
    """
    if api_key:
        os.environ["OPENAI_API_KEY"] = api_key
        chain = load_chain()
        os.environ["OPENAI_API_KEY"] = ""
        return chain


def chat(
    context: str, inp: str, history: Optional[Tuple[str, str]], chain: Optional[LLMChain] 
):
    """Execute the chat functionality."""
    history = history or []
    
    # If chain is None, that is because no API key was provided.
    if chain is None:
        history.append((inp, "Please set your OpenAI key to use"))
        return history, history

    # Run chain and append input.
    try:
        output = chain.predict(context=context, input=inp)
    except Exception as e:
        output = str(e)
    history.append((inp, output))

    return history, history


callback = gr.CSVLogger()

with gr.Blocks() as demo:
    with gr.Row():
        gr.Markdown("<h3><center>Tutor GPT v1 Demo</center></h3>")
        openai_api_key_textbox = gr.Textbox(
            placeholder="Paste your OpenAI API key (sk-...)",
            show_label=False,
            lines=1,
            type="password",
        )

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

    # This needs to be called at some point prior to the first call to callback.flag()
    callback.setup([context, message, chatbot], "data/flagged_data_points")

    
    submit.click(chat, inputs=[context, message, state, agent_state], outputs=[chatbot, state])
    message.submit(chat, inputs=[context, message, state, agent_state], outputs=[chatbot, state])  # same thing, but for hitting <enter>

    # collects data
    submit.click(lambda *args: callback.flag(args), [context, message, chatbot], None, preprocess=False)
    message.submit(lambda *args: callback.flag(args), [context, message, chatbot], None, preprocess=False)


    openai_api_key_textbox.change(
        set_openai_api_key,
        inputs=[openai_api_key_textbox],
        outputs=[agent_state],
    )



demo.launch(debug=True, server_name="0.0.0.0")
#demo.launch(debug=True, share=True)
