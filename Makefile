test:
	@docker build -t tutor-gpt:test -f Dockerfile.test .
	@docker run --rm tutor-gpt:test