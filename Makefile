.PHONY: up seed e2e test down
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
