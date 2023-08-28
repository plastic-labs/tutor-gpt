# Change Log
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.3.0] – 2023-08-28

### Added

- Database support for long term memory storage
 
## [0.2.1] – 2023-08-11

### Changed

- Used streamables to allow for more responsive interfaces
- Using Langchain [expression language](https://python.langchain.com/docs/guides/expression_language/#:~:text=LangChain%20Expression%20Language%20is%20a,as%20well%20as%20cookbook%20examples.)
  for chainging together calls

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
