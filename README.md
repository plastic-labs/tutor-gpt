# tutor-gpt

Tutor-GPT is a LangChain LLM application. It dynamically reasons about your learning needs and *updates its own prompts* to best serve you.  

We leaned into theory of mind experiments and Bloom is now more than just a literacy tutor, it’s an expansive learning companion. Read more about how it works [here](https://www.plasticlabs.ai/blog/Open-Sourcing-Tutor-GPT/) or you can join our [Discord](https://discord.gg/bloombotai) to try out our implementation for free (while our OpenAI spend lasts 😄).  

Alternatively, you can run your own instance of the bot by following the instructions below.  

## Installation

This project requires docker to be installed and running locally. [Install docker](https://docs.docker.com/get-docker/) and ensure it's running before proceeding.

## Getting Started

This app requires you to have a few different environment variables set. Create a `.env` file from the `.env.template`.

**OPENAI_API_KEY**: Go to [OpenAI](https://beta.openai.com/account/api-keys) to generate your own API key.  
**BOT_TOKEN**: This is the discord bot token. You can find instructions on how to create a bot and generate a token in the [pycord docs](https://guide.pycord.dev/getting-started/creating-your-first-bot).  
**THOUGHT_CHANNEL_ID**: This is the discord channel for the bot to output thoughts to. Make a channel in your server and copy the ID by right clicking the channel and copying the link. The channel ID is the last string of numbers in the link.  

### Docker/Containerization

The repository containers a `Dockerfile` for running the bot in a containerized workflow. Use the following command to build and run the container locally:

```bash
docker build -t tutor-gpt:latest .
docker run --env-file .env tutor-gpt
```

The current behaviour will utilize the `.env` file in your local repository and run the bot.

### Architecture

Below is high level diagram of the architecture for the bot.
![Tutor-GPT Discord Architecture](assets/bloombot_langchain_diagram.png)

## Contributing

This project uses [poetry](https://python-poetry.org/) to manage dependencies.
To install dependencies locally run `poetry install`. Or alternatively run
`poetry shell` to activate the virtual environment

To activate the virtual environment within the same shell you can use the
following one-liner 

```bash
source $(poetry env info --path)/bin/activate
```

