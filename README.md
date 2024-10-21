# Tutor-GPT

![Static Badge](https://img.shields.io/badge/Version-0.6.0-blue)
[![Discord](https://img.shields.io/discord/1076192451997474938?logo=discord&logoColor=%23ffffff&label=Bloom&labelColor=%235865F2)](https://discord.gg/bloombotai)
![GitHub License](https://img.shields.io/github/license/plastic-labs/tutor-gpt)
![GitHub Repo stars](https://img.shields.io/github/stars/plastic-labs/tutor-gpt)
[![X (formerly Twitter) URL](https://img.shields.io/twitter/url?url=https%3A%2F%2Ftwitter.com%2FBloomBotAI&label=Twitter)](https://twitter.com/BloomBotAI)
[![arXiv](https://img.shields.io/badge/arXiv-2310.06983-b31b1b.svg)](https://arxiv.org/abs/2310.06983)

Tutor-GPT is an LLM powered learning companion developed by [Plastic
Labs](https://plasticlabs.ai). It dynamically reasons about your learning needs
and _updates its own prompts_ to best serve you.

We leaned into theory of mind experiments and it is now more than just a
literacy tutor, it’s an expansive learning companion. Read more about how it
works [here](https://blog.plasticlabs.ai/blog/Theory-of-Mind-Is-All-You-Need).

Tutor-GPT is powered by [Honcho](https://honcho.dev) to build robust user
representations and create a personalized experience for each user.

The hosted version of `tutor-gpt` is called [Bloom](https://bloombot.ai) as a
nod to Benjamin Bloom's Two Sigma Problem.

Alternatively, you can run your own instance of the bot by following the
instructions below.

## Project Structure

The tutor-gpt project is split between multiple different modules that split up
the backend logic for different clients.

- `agent/` - this contains the core logic and prompting architecture
- `bot/` - this contains the discord bot implementation
- `api/` - this contains a FastAPI API interface that exposes the `agent/` logic
- `www/` - this contains a `NextJS` web front end that can connect to the API interface
- `common/` - this contains common used in different interfaces
- `supabase/` - contains SQL scripts necessary for setting up local supabase

Most of the project is developed using python with the exception of the NextJS
application. For python [`uv`](https://docs.astral.sh/uv/) is used for dependency management and for the
web interface we use `pnpm`.

The `bot/` and `api/` modules both use `agent/` as a dependency and load it as a
local package using `uv`

> NOTE
> More information about the web interface is available in
> [www/README](./www/README.md) this README primarily contains information about
> the backend of tutor-gpt and the core logic of the tutor

The `agent`, `bot`, and `api` modules are all managed using a `uv` [workspace](https://docs.astral.sh/uv/concepts/workspaces/#getting-started)

## Installation

This section goes over how to setup a python environment for running Tutor-GPT.
This will let you run the discord bot, run the FastAPI application, or develop the `agent`
code.

The below commands will install all the dependencies necessary for running the
tutor-gpt project. We recommend using uv to setup a virtual environment for
the project.

```bash
git clone https://github.com/plastic-labs/tutor-gpt.git && cd tutor-gpt
uv sync # set up the workspace
source .venv/bin/activate # activate the virtual environment
```

From here you will then need to run `uv sync` in the appropriate directory
depending on what you part of the project you want to run. For example to run
the FastAPI application you need to navigate to the directory an re-run sync

```bash
cd api/
uv sync
```

You should see a message indicated that the depenedencies were resolved and/or
installed if not already installed before.

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

## Usage

Each of the interfaces of tutor-gpt require different environment variables to
operate properly. Both the `bot/` and `api/` modules contain a `.env.template`
file that you can use as a starting point. Copy and rename the `.env.template`
to `.env`

Below are more detailed explanations of environment variables

### Common

**Azure Mirascope Keys**

- `AZURE_OPENAI_ENDPOINT` — The endpoint for the Azure OpenAI service
- `AZURE_OPENAI_API_KEY` — The API key for the Azure OpenAI service
- `AZURE_OPENAI_API_VERSION` — The API version for the Azure OpenAI service
- `AZURE_OPENAI_DEPLOYMENT` — The deployment name for the Azure OpenAI service

### FastAPI

**NextJS & fastAPI**

- `URL` — The URL endpoint for the frontend Next.js application
- `HONCHO_URL` — The base URL for the instance of Honcho you are using
- `HONCHO_APP_NAME` — The name of the honcho application to use for Tutor-GPT

**Optional Extras**

- `SENTRY_DSN_API` — The Sentry DSN for optional error reporting

### Discord

- `BOT_TOKEN` — This is the discord bot token. You can find instructions on how
  to create a bot and generate a token in the [pycord
  docs](https://guide.pycord.dev/getting-started/creating-your-first-bot).
- `THOUGHT_CHANNEL_ID` — This is the discord channel for the bot to output
  thoughts to. Make a channel in your server and copy the ID by right clicking the
  channel and copying the link. The channel ID is the last string of numbers in
  the link.

### Docker/Containerization

You can also optionally use the docker containers to run the application locally. Below is the command to run the discord bot locally using a `.env` file that is not within the docker container. Be careful not to add your `.env` in the docker container as this is insecure and can leak your secrets.

```bash
docker run --env-file .env tutor-gpt-core python bot/app.py
```

To run the webui you need to run the backend `FastAPI` and the frontend `NextJS` containers separately. In two separate terminal instances run the following commands to have both applications run.
The current behaviour will utilize the `.env` file in your local repository and
run the bot.

```bash
docker run -p 8000:8000 --env-file .env tutor-gpt-core python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 # FastAPI Backend
docker run tutor-gpt-web
```

> NOTE: the default run command in the docker file for the core runs the FastAPI backend so you could just run docker run --env-file .env tutor-gpt-core

## Contributing

This project is completely open source and welcomes any and all open source contributions. The workflow for contributing is to make a fork of the repository. You can claim an issue in the issues tab or start a new thread to indicate a feature or bug fix you are working on.

Once you have finished your contribution make a PR pointed at the `staging` branch and it will be reviewed by a project manager. Feel free to join us in our [discord](http://discord.gg/bloombotai) to discuss your changes or get help.

Once your changes are accepted and merged into staging they will under go a period of live testing before entering the upstream into `main`

## License

Tutor-GPT is licensed under the GPL-3.0 License. Learn more at the [License file](./LICENSE)

## Malin's Notes:

- always sync with the main project and pull the latest

### FastAPI/Backend:

- follow the instructions above to get the backend Fast API running and then use this command to creat the server:
  python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
- make sure your .env file is setup correctly: the URL should be the nextJS URL # NextJS & fastAPI
  URL=http://localhost:3000
  HONCHO_URL=https://demo.honcho.dev
  HONCHO_APP_NAME=HONCHO
- make sure you have a valid OpenAI API key

  ### wwww/NextJS frontend setup:
- Follow all of the instructions in the wwww/readme
- get your supabase account credentials including the anon key and update your .env file
- you can run supbase commands using npx supabase <command>;
- make sure you're in the correct directory. the README says "you can simply run the below command in the `tutor-gpt` folder and a local instance of Supabase will start up". but it's wrong. you should cd into wwww to run the supabase command. that is where the nextJS dockerfile is
- supabase local instance should build and spit out lots of information about the development setup. e.g.
  API URL: http://127.0.0.1:54321
  GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
  DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
  Studio URL: http://127.0.0.1:54323
- Update your www/.env file, specifically the supabase NEXT_PUBLIC_SUPABASE_URL with the API URL
- start the frontend server (e.g. bun dev)

### www/NextJS authentication:
- if you get the nextJS web app running but authentication is failing, go to your supabase Studio URL and create a user
- use this to login
- the interface should work now. if you are getting promise/await error, it could be an issue with the main code base, check the team. make sure you've synced your fork with the latest upstream main.
