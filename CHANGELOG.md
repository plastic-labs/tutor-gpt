# Change Log
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).


## [0.6.0]

### Added

- Honcho

### Changed

- Using mirascope instead of langchain for a smaller package size


## [0.5.2] - 2023-12-20

### Fixed

- screen jitter on revalidation conversations and messages on webui

### Changed

- Removed A/B testing logic

## [0.5.1] - 2023-12-12

### Added

- Dark mode
- Web Caching
- LateX Support
- Multiline support for chat textbox

### Changed

- Required Sign In
- No A/B for Honcho
- Error handling for content filter

### Security

- Update Langchain version to ^0.0.348
- Update OpenAI Package to ^1.3.8


## [0.4.1] – 2023-09-14

### Added

- Sentry monitoring for error handling

### Changed

- New chats on web will set the current conversation
- Honcho is not required to run locally
- A/B is only set for logged in users

## [0.4.0] – 2023-09-14

### Added

- User Accounts for Web
- Persistent conversations across sessions using authentication
- Multiple Conversations at once for Web
- Experimental integration with Honcho
- Introduced user prediction chain

### Changed

- The Web UI is now using a combination of `NextJS` and `FastAPI`
- Mobile Friendly UI with **Thoughts** hidden by default
- Layered Cache for Discord to reduce memory burden with smaller default
  capacity
- Switched Bloomchain to use `classmethods` instead of instance methods

### Security

- Upgrade Langchain version to `0.0.286`
- Deployment redundancy and minimum availability requirements
- Added asyncio `locks` for better concurrency safety

## [0.3.0] – 2023-08-28

### Added

- Database support for long term memory storage

### Changed

- The default LLM is now using Azure based OpenAI models
 
## [0.2.1] – 2023-08-11

### Changed

- Used streamables to allow for more responsive interfaces
- Using Langchain [expression language](https://python.langchain.com/docs/guides/expression_language/#:~:text=LangChain%20Expression%20Language%20is%20a,as%20well%20as%20cookbook%20examples.)
  for chaining together calls

## [0.2.0] – 2023-08-08
 
### Added

- Streamlit webui as an alternative method of using tutor-gpt
- Langsmith support

### Changed
 
- **thoughts** will no longer be forwarded to a public channel if generated from
  a discord DM
- Migrated to `ChatMessageHistory()`
- Refactored repository structure to support multiple interfaces and generally
  clean up logic

### Security

- Upgrade Langchain version to `0.0.257`
