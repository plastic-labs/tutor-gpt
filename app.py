import os, sys
import gradio as gr
from langchain import PromptTemplate, FewShotPromptTemplate
from langchain.llms import OpenAI
from dotenv import load_dotenv


load_dotenv()   # this should work, env var is set in .env file and langchain looks for it
#openai.api_key = os.environ["OPENAI_API_KEY"]

llm = OpenAI(model_name="text-davinci-003", n=2, best_of=2)

context_box = gr.Textbox(lines=3, label="Context")
question_box = gr.Textbox(lines=1, label="Question")
output_box = gr.Textbox(label="Response")

context = """
Some argue that because the free markets allow for personal choice, they are already ethical. Others (5) have accepted the ethical critique and embraced corporate social responsibility. But before we can label any market outcome as “immoral,” or sneer at economists who try to put a price on being ethical, we need to be clear on what we are talking about. (10)
There are different views on where ethics should apply when someone makes an economic decision. Consider Adam Smith, widely regarded as the founder of modern economics. He was a moral philosopher who believed sympathy for others was (15) the basis for ethics (we would call it empathy nowadays). But one of his key insights in The Wealth of Nations was that acting on this empathy could be counter-productive—he observed people becoming better off when they put their own empathy aside, (20) and interacted in a self-interested way. Smith justifies selfish behavior by the outcome. Whenever planners use cost-benefit analysis to justify a new railway line, or someone retrains to boost his or her earning power, or a shopper buys one to get one free, they are (25) using the same approach: empathizing with someone, and seeking an outcome that makes that person as well off as possible—although the person they are empathizing with may be themselves in the future. (30)
Instead of judging consequences, Aristotle said ethics was about having the right character—displaying virtues like courage and honesty. It is a view put into practice whenever business leaders are chosen for their good character. (35) But it is a hard philosophy to teach—just how much loyalty should you show to a manufacturer that keeps losing money? Show too little and you’re a “greed is good” corporate raider; too much and you’re wasting money on unproductive capital. Aristotle thought (40) there was a golden mean between the two extremes, and finding it was a matter of fine judgment. But if ethics is about character, it’s not clear what those characteristics should be.
There is yet another approach: instead of rooting (45) ethics in character or the consequences of actions, we can focus on our actions themselves. From this perspective some things are right, some wrong—we should buy fair trade goods, we shouldn’t tell lies in advertisements. Ethics becomes a list of (50) commandments, a catalog of “dos” and “don’ts.” When a finance official refuses to devalue a currency because they have promised not to, they are defining ethics this way. According to this approach devaluation can still be bad, even if it would make (55) everybody better off.
Many moral dilemmas arise when these three versions pull in different directions but clashes are not inevitable. Take fair trade coffee (coffee that is sold with a certification that indicates the farmers (60) and workers who produced it were paid a fair wage), for example: buying it might have good consequences, be virtuous, and also be the right way to act in a flawed market. Common ground like this suggests that, even without agreement on where (65) ethics applies, ethical economics is still possible.
Whenever we feel queasy about “perfect” competitive markets, the problem is often rooted in a phony conception of people. The model of man on which classical economics is based—an entirely (70) rational and selfish being—is a parody, as John Stuart Mill, the philosopher who pioneered the model, accepted. Most people—even economists—now accept that this “economic man” is a fiction. We behave like a herd; we fear losses more than we (75) hope for gains; rarely can our brains process all the relevant facts.
These human quirks mean we can never make purely “rational” decisions. A new wave of behavioral economists, aided by neuroscientists, is trying to (80) understand our psychology, both alone and in groups, so they can anticipate our decisions in the marketplace more accurately. But psychology can also help us understand why we react in disgust at economic injustice, or accept a moral law as (85) universal. Which means that the relatively new science of human behavior might also define ethics for us. Ethical economics would then emerge from one of the least likely places: economists themselves."
"""

# llm.get_num_tokens(context)

examples = [
    {
        "context": context,
        "student": "In the passage, the author anticipates which of the following objections to criticizing the ethics of free markets?",
        "tutor": "Free markets are ethical because they enable individuals to make choices. Why might it be important to anticipate that?",
    },
    {
        "context": context,
        "student": "As used in line 6, “embraced” most nearly means...",
        "tutor": "Readily adopted. Why might the author choose such a word?",
    },
    {
        "context": context,
        "student": "Which points best supports the author’s claim that there is common ground shared by the different approaches to ethics described in the passage?",
        "tutor": "Why don't you look in the paragraph that begins with \"Many moral dilemmas...\"",
    }
]

# Next, we specify the template to format the examples we have provided.
# We use the `PromptTemplate` class for this.
example_formatter_template = """
Context: {context}
Student: {student}
Tutor: {tutor}\n
"""
example_prompt = PromptTemplate(
    input_variables=["context", "student", "tutor"],
    template=example_formatter_template,
)


# Finally, we create the `FewShotPromptTemplate` object.
few_shot_prompt = FewShotPromptTemplate(
    # These are the examples we want to insert into the prompt.
    examples=examples,
    # This is how we want to format the examples when we insert them into the prompt.
    example_prompt=example_prompt,
    # The prefix is some text that goes before the examples in the prompt.
    # Usually, this consists of intructions.
    prefix="""
    I want you to act as a tutor. Respond in brevity to their inquiries based on the context and you must ask a follow up question.
    """,
    # The suffix is some text that goes after the examples in the prompt.
    # Usually, this is where the user input will go
    suffix="Context: {context}\n Student: {student}\n Tutor: ",
    # The input variables are the variables that the overall prompt expects.
    input_variables=["context", "student"],
    # The example_separator is the string we will use to join the prefix, examples, and suffix together with.
    example_separator="\n\n",
)

def predict(context, question, history=[]):
  context = context.replace(r"\n"," " )
  try:
    response = llm(few_shot_prompt.format(context=context, student=question))
  except Exception as e:
    response = e

  return(response)


#print(few_shot_prompt.format(context=context, student="what's the main idea of the final paragraph?"))

interface = gr.Interface(predict, [context_box, question_box, "state"], output_box)
interface.launch(debug=True)
