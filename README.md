# tutor-gpt
LangChain LLM application. Dynamic few-shot prompting for the task of tutoring. 

## Installation

Create a new virtualenv and `pip install -r requirements.txt`.

## Getting Started

Go to https://beta.openai.com/account/api-keys to generate your own OpenAI API key. Create a `.env` file from the `.env.template` and paste in your key.

To run the demo locally, uncomment line 133 in `app.py` and comment out 132. Then run `python app.py`. 