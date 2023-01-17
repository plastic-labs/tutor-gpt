import os
from typing import Optional, Tuple

import gradio as gr
import pandas as pd
from langchain import LLMChain
from langchain.chains.conversation.memory import ConversationalBufferWindowMemory
from langchain.prompts import PromptTemplate
from langchain.llms import OpenAI

template_str = """I want you to act as a tutor. Respond in brevity to their inquiries based on the context and you must ask a follow up question. That question should not be adversarial but rather tentative and playful. If the student doesn't answer correctly, don't ask the same question. Come up with a different one that's more basic.

Context: Honey bees are hosts to the pathogenic large ectoparasitic mite Varroa destructor (Varroa mites). These mites feed on bee hemolymph (blood) and can kill bees directly or by increasing their susceptibility to secondary infection with fungi, bacteria or viruses. (5) Little is known about the natural defenses that keep the mite infections under control. 
Pyrethrums are a group of flowering plants which include Chrysanthemum coccineum, Chrysanthemum cinerariifolium, Chrysanthemum marschalli, and (10) related species. These plants produce potent insecticides with anti-mite activity. The naturally occurring insecticides are known as pyrethrums. A synonym for the naturally occurring pyrethrums is pyrethrin and synthetic analogues of pyrethrums are (15) known as pyrethroids. In fact, the human mite infestation known as scabies (Sarcoptes scabiei) is treated with a topical pyrethrum cream. 
We suspect that the bees of commercial bee colonies which are fed mono-crops are nutritionally (20) deficient. In particular, we postulate that the problem is a diet deficient in anti-mite toxins: pyrethrums, and possibly other nutrients which are inherent in such plants. Without, at least, intermittent feeding on the pyrethrum producing plants, bee colonies are (25) susceptible to mite infestations which can become fatal either directly or due to a secondary infection of immunocompromised or nutritionally deficient bees. This secondary infection can be viral, bacterial or fungal and may be due to one or more pathogens. (30) In addition, immunocompromised or nutritionally deficient bees may be further weakened when commercially produced insecticides are introduced into their hives by bee keepers in an effort to fight mite infestation. We further postulate that the proper (35) dosage necessary to prevent mite infestation may be better left to the bees, who may seek out or avoid pyrethrum containing plants depending on the amount necessary to defend against mites and the amount already consumed by the bees, which in (40) higher doses could be potentially toxic to them. 
This hypothesis can best be tested by a trial wherein a small number of commercial honey bee colonies are offered a number of pyrethrum producing plants, as well as a typical bee food source (45) such as clover, while controls are offered only the clover. Mites could then be introduced to each hive with note made as to the choice of the bees, and the effects of the mite parasites on the experimental colonies versus control colonies. (50) It might be beneficial to test wild-type honey bee colonies in this manner as well, in case there could be some genetic difference between them that affects the bees’ preferences for pyrethrum producing flowers.

Human: How do the words “can,” “may,” and “could” in the third paragraph (lines 19-41) help establish the tone of the paragraph?
AI: They create a tentative tone that makes clear the authors suspect but do not know that their hypothesis is correct. What is their hypothesis?
Human: Hmm.. something about a honeybee diet?
AI: You're close! why don't you look around line 42?
Human: Ah, yes. They say "A honeybee diet that includes pyrethrums results in honeybee colonies that are more resistant to mite infestations."
AI: Yes! What excerpt from the passage provides the best evidence for the answer to the previous question?

Context: Recent debates about the economy have rediscovered the question, “is that right?”, where“right” means more than just profits or efficiency.
Some argue that because the free markets allow for personal choice, they are already ethical. Others (5) have accepted the ethical critique and embraced corporate social responsibility. But before we can label any market outcome as “immoral,” or sneer at economists who try to put a price on being ethical, we need to be clear on what we are talking about. (10)
There are different views on where ethics should apply when someone makes an economic decision. Consider Adam Smith, widely regarded as the founder of modern economics. He was a moral philosopher who believed sympathy for others was (15) the basis for ethics (we would call it empathy nowadays). But one of his key insights in The Wealth of Nations was that acting on this empathy could be counter-productive—he observed people becoming better off when they put their own empathy aside, (20) and interacted in a self-interested way. Smith justifies selfish behavior by the outcome. Whenever planners use cost-benefit analysis to justify a new railway line, or someone retrains to boost his or her earning power, or a shopper buys one to get one free, they are (25) using the same approach: empathizing withsomeone, and seeking an outcome that makes that person as well off as possible—although the person they are empathizing with may be themselves in the future. (30)
Instead of judging consequences, Aristotle said ethics was about having the right character—displaying virtues like courage and honesty. It is a view put into practice whenever business leaders are chosen for their good character. (35) But it is a hard philosophy to teach—just how much loyalty should you show to a manufacturer that keeps losing money? Show too little and you’re a “greed is good” corporate raider; too much and you’re wasting money on unproductive capital. Aristotle thought (40) there was a golden mean between the two extremes, and finding it was a matter of fine judgment. But if ethics is about character, it’s not clear what those characteristics should be.
There is yet another approach: instead of rooting (45) ethics in character or the consequences of actions, we can focus on our actions themselves. From this perspective some things are right, some wrong—we should buy fair trade goods, we shouldn’t tell lies in advertisements. Ethics becomes a list of (50) commandments, a catalog of “dos” and “don’ts.” When a finance official refuses to devalue a currency because they have promised not to, they are defining ethics this way. According to this approach devaluation can still be bad, even if it would make (55) everybody better off.
Many moral dilemmas arise when these three versions pull in different directions but clashes arenot inevitable. Take fair trade coffee (coffee that is sold with a certification that indicates the farmers (60) and workers who produced it were paid a fair wage), for example: buying it might have good consequences, be virtuous, and also be the right way to act in a flawed market. Common ground like thissuggests that, even without agreement on where (65) ethics applies, ethical economics is still possible.
Whenever we feel queasy about “perfect” competitive markets, the problem is often rooted in a phony conception of people. The model of man on which classical economics is based—an entirely (70) rational and selfish being—is a parody, as John Stuart Mill, the philosopher who pioneered the model, accepted. Most people—even economists— now accept that this “economic man” is a fiction. We behave like a herd; we fear losses more than we (75) hope for gains; rarely can our brains process all the relevant facts.
These human quirks mean we can never make purely “rational” decisions. A new wave of behavioral economists, aided by neuroscientists, is trying to (80) understand our psychology, both alone and in groups, so they can anticipate our decisions in the marketplace more accurately. But psychology can also help us understand why we react in disgust at economic injustice, or accept a moral law as (85) universal. Which means that the relatively new science of human behavior might also define ethics for us. Ethical economics would then emerge from one of the least likely places: economists themselves.

Human: I don't get it... can you summarize this for me?
AI: The article discusses different views on where ethics should apply when someone makes an economic decision. Can you tell me one of the arguments being made?
Human: Some believe the free market is already ethical because it allows for personal choice.
AI: That's correct! And what's the contrasting belief?
Human: I think it's that it's not ethical by nature and that corporations bear some social responsibility...
AI: Wonderful. The passage talks about Adam Smith's perspective here. Can you tell me what his thoughts were?

Context: {context}

{history}
Human: {input}
AI:"""

PROMPT_TEMPLATE = PromptTemplate(
    input_variables=["context", "history", "input"],
    template=template_str
)

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
        output = chain.predict(input=inp, context=context)
    except Exception as e:
        output = str(e)
    history.append((inp, output))

    return history, history


demo = gr.Blocks(css=".gradio-container {background-color: lightgray}")

#callback = gr.CSVLogger()

with demo:
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

    submit.click(chat, inputs=[context, message, state, agent_state], outputs=[chatbot, state])
    message.submit(chat, inputs=[context, message, state, agent_state], outputs=[chatbot, state])

    openai_api_key_textbox.change(
        set_openai_api_key,
        inputs=[openai_api_key_textbox],
        outputs=[agent_state],
    )


if __name__ == '__main__':
    demo.launch(debug=True, share=True)
