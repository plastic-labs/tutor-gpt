# tutor-gpt
![Static Badge](https://img.shields.io/badge/Version-0.5.1-blue)
[![Discord](https://img.shields.io/discord/1076192451997474938?logo=discord&logoColor=%23ffffff&label=Bloom&labelColor=%235865F2)](https://discord.gg/bloombotai)
![GitHub License](https://img.shields.io/github/license/plastic-labs/tutor-gpt)
![GitHub Repo stars](https://img.shields.io/github/stars/plastic-labs/tutor-gpt)
[![X (formerly Twitter) URL](https://img.shields.io/twitter/url?url=https%3A%2F%2Ftwitter.com%2FBloomBotAI&label=Twitter)](https://twitter.com/BloomBotAI)
[![arXiv](https://img.shields.io/badge/arXiv-2310.06983-b31b1b.svg)](https://arxiv.org/abs/2310.06983)


Tutor-GPT is a LangChain LLM application developed by [Plastic
Labs](https://plasticlabs.ai). It dynamically reasons about your learning needs
and *updates its own prompts* to best serve you.  

We leaned into theory of mind experiments and it is now more than just a
literacy tutor, it’s an expansive learning companion. Read more about how it
works [here](https://plasticlabs.ai/blog/Theory-of-Mind-is-All-You-Need). 

The hosted version of `tutor-gpt` is called [Bloom](https://bloombot.ai) as a
nod to Benjamin Bloom's Two Sigma Problem. You can try the web version at
[chat.bloombot.ai](https://chat.bloombot.ai) or you can join our
[Discord](https://discord.gg/bloombotai) to try out our implementation for free
(while our OpenAI spend lasts 😄).  

Alternatively, you can run your own instance of the bot by following the
instructions below.  

## Project Structure

The tutor-gpt project is split between multiple different modules that split up
the backend logic for different clients. 

- `agent/` - this contains the core logic and prompting architecture 
- `bot/` - this contains the discord bot implementation
- `api/` - this contains an API interface to the tutor-gpt backend
- `www/` - this contains a `NextJS` web front end that can connect to the API interface 
- `common/` - this contains common used in different interfaces
- `supabase/` - contains SQL scripts necessary for setting up local supabase

Most of the project is developed using python with the exception of the NextJS
application. For python `poetry` is used for dependency management and for the
web interface `yarn` is used.

### Supabase

Additionally, this project uses supabase for managing different users,
authentication, and as the database for holding message and conversation
information. We recommend for testing and local development to use a local instance of supabase. The supabase-cli is the best way to do this. 

Follow the [Supabase Documentation](https://supabase.com/docs/guides/cli/local-development) for more information. The project contains a `supabase/` folder that contains the scaffolding SQL migrations necessary for setting up the necessary tables. Once you have the supabase cli installed you can simply run the below command in the `tutor-gpt` folder and a local instance of Supabase will start up. 

> NOTE: Local Supabase relies on docker so ensure docker is also running before running the below command

```bash
supabase start
```

Another, useful note about doing testing locally with supabase is that there is
no need to verify an account when it is created so you can create a new account
on the webui and then immediately sign in with it.

## Installation

> NOTE: The project uses
> [poetry](https://python-poetry.org/docs/#installing-with-the-official-installer)
> and [yarn](https://yarnpkg.com/getting-started/install) for package
> management. 

The below commands will install all the dependencies necessary for running the
tutor-gpt project. We recommend using poetry to setup a virtual environment for
the project. 

```bash
git clone https://github.com/plastic-labs/tutor-gpt.git
cd tutor-gpt
poetry install # install Python dependencies
cd www/
yarn install # install all NodeJS dependencies 
```

### Docker

Alternatively (The recommended way) this project can be built and run with
docker. [Install docker](https://docs.docker.com/get-docker/) and ensure it's
running before proceeding. 

The web front end is built and run separately from the remainder of the
codebase. Below are the commands for building the core of the tutor-gpt project
which includes the necessary dependencies for running either the discord bot or
the FastAPI endpoint.

```bash
git clone https://github.com/plastic-labs/tutor-gpt.git
cd tutor-gpt
docker build -t tutor-gpt-core .
```

Similarly, to build the web interface run the below commands
```bash
cd tutor-gpt/www
docker build -t tutor-gpt-web .
```

> NOTE: for poetry usage

This project uses [poetry](https://python-poetry.org/) to manage dependencies.
To install dependencies locally run `poetry install`. Or alternatively run
`poetry shell` to activate the virtual environment

To activate the virtual environment within the same shell you can use the
following one-liner:

```bash
source $(poetry env info --path)/bin/activate
```

On some systems this may not detect the proper virtual environment. You can
diagnose this by running `poetry env info` directly to see if the virtualenv
is defined.

If using `pyenv` remember to set **prefer-active-python** to true. As per
this section of the [documentation](https://python-poetry.org/docs/managing-environments/).

Another workaround that may work if the above setting does not work is to
continue directly with `poetry shell` or wrap the source command like below

```bash
poetry run source $(poetry env info --path)/bin/activate
```

## Usage

This app requires you to have a few different environment variables set. Create
a `.env` file from the `.env.template`. Depending on which interface you are
running (web or discord) different variables are necessary. This is explained
below

### Required
- **OPENAI_API_KEY**: Go to [OpenAI](https://beta.openai.com/account/api-keys) to generate your own API key.  
- **SUPABASE_URL**: The base URL for your supabase instance  
- **SUPABASE_KEY**: The API key for interacting with your supabase project. This corresponds to the service key, get it from your project settings   
- **CONVERSATION_TABLE**: the name of the table to hold conversation metadata  
- **MEMORY_TABLE**: the name of the table holding messages for different conversations

### Discord Only
- **BOT_TOKEN**: This is the discord bot token. You can find instructions on how
to create a bot and generate a token in the [pycord
docs](https://guide.pycord.dev/getting-started/creating-your-first-bot).  
- **THOUGHT_CHANNEL_ID**: This is the discord channel for the bot to output
thoughts to. Make a channel in your server and copy the ID by right clicking the
channel and copying the link. The channel ID is the last string of numbers in
the link.  

### Web Only
- **URL**: the URL that the web ui is running from by default this should be http://localhost:3000

### Web UI Environment

The `NextJS` application in `www/` also has it's own environment variables which are usually held in the .env.local file. There is another `.env.template` file that you can use for getting started. These are explaing below.

- **NEXT_PUBLIC_URL**: The url the web application will be accessible the default with `NextJS` is http://localhost:3000
- **NEXT_PUBLIC_API_URL**: The url the api backend will be run from the default for `FastAPI is` http://localhost:8000
- **NEXT_PUBLIC_SUPABASE_URL**: The url for your supabase project should be identical to the one used in the python backend 
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: The API key for supabase this time it is the anon key NOT the service key
- **NEXT_PUBLIC_SENTRY_DSN**: Optional for sentry bug tracking
- **NEXT_PUBLIC_SENTRY_ENVIRONMENT**: Optional for sentry bug tracking
- **NEXT_PUBLIC_POSTHOG_KEY**: Optional Posthog event tracking
- **NEXT_PUBLIC_POSTHOG_HOST**: Option for Posthog event tracking

---

### Docker/Containerization

You can also optionally use the docker containers to run the application locally. Below is the command to run the discord bot locally using a `.env` file that is not within the docker container. Be careful not to add your `.env` in the docker container as this is insecure and can leak your secrets. 

```bash
docker run --env-file .env tutor-gpt-core python -u -m bot.app
```

To run the webui you need to run the backend `FastAPI` and the frontend `NexTJS` containers separately. In two separate terminal instances run the following commands to have both applications run.
The current behaviour will utilize the `.env` file in your local repository and
run the bot.

```bash
docker run -p 8000:8000 --env-file .env tutor-gpt-core python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 # FastAPI Backend
docker run tutor-gpt-web
```

> NOTE: the default run command in the docker file for the core runs the FastAPI backend so you could just run docker run  --env-file .env tutor-gpt-core

### Architecture

Below is high level diagram of the architecture for the bot.
![Tutor-GPT Discord Architecture](assets/ToM&#32;Chain&#32;Flow.png)

## Contributing

This project is completely open source and welcomes any and all open source contributions. The workflow for contributing is to make a fork of the repository. You can claim an issue in the issues tab or start a new thread to indicate a feature or bug fix you are working on. 

Once you have finished your contribution make a PR pointed at the `staging` branch and it will be reviewed by a project manager. Feel free to join us in our [discord](http://discord.gg/bloombotai) to discuss your changes or get help. 

Once your changes are accepted and merged into staging they will under go a period of live testing before entering the upstream into `main`

## License

Tutor-GPT is licensed under the GPL-3.0 License. Learn more at the [License file](./LICENSE)
