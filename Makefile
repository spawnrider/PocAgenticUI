.PHONY: up seed e2e test down docs docs-build
ZENSICAL_VERSION := 0.1.3
DOCS_VENV := .venv-docs
up:
	cp -n .env.example .env || true
	docker compose up -d --build
	@echo "attente Keycloak/Unleash/Strapi…"; \
	until curl -sf localhost:8081/realms/poc/.well-known/openid-configuration >/dev/null; do sleep 3; done; \
	until curl -sf localhost:4242/health >/dev/null; do sleep 3; done; \
	until curl -sf localhost:1337/_health >/dev/null; do sleep 3; done
	$(MAKE) seed
seed:
	scripts/seed-unleash.sh
e2e:
	docker compose restart mcp-crm && sleep 3
	scripts/e2e-mcp.sh
	python3 scripts/e2e_agent.py
test:
	npm test
down:
	docker compose down

# Documentation (Zensical) : `make docs` = prévisualisation locale sur http://localhost:8000
$(DOCS_VENV)/bin/zensical:
	uv venv -q $(DOCS_VENV) || python3 -m venv $(DOCS_VENV)
	uv pip install -q --python $(DOCS_VENV)/bin/python zensical==$(ZENSICAL_VERSION) || $(DOCS_VENV)/bin/pip install zensical==$(ZENSICAL_VERSION)
docs: $(DOCS_VENV)/bin/zensical
	$(DOCS_VENV)/bin/zensical serve
docs-build: $(DOCS_VENV)/bin/zensical
	$(DOCS_VENV)/bin/zensical build --clean --strict
