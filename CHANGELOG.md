# Change Log
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).
 
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
