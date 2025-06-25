.PHONY: help dev build deploy test clean

help:
	@echo "Comandi disponibili:"
	@echo "  make dev      - Avvia in modalità sviluppo"
	@echo "  make build    - Build per produzione"
	@echo "  make deploy   - Deploy in produzione"
	@echo "  make test     - Esegui test"
	@echo "  make clean    - Pulisci tutto"

dev:
	@docker-compose -f docker/docker-compose.dev.yml up

build:
	@docker-compose -f docker/docker-compose.yml build

deploy:
	@./scripts/deploy.sh

test:
	@cd backend && npm test
	@cd frontend && npm test

clean:
	@docker-compose -f docker/docker-compose.yml down -v
	@rm -rf backend/node_modules frontend/node_modules
	@rm -rf frontend/build
