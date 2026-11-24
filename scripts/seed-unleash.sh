#!/usr/bin/env bash
# Crée (idempotent) les flags du POC dans Unleash et les active à 100 % en "development".
set -eu
U=${UNLEASH_BASE:-http://localhost:4242}; T=${UNLEASH_ADMIN_TOKEN:-*:*.unleash-insecure-admin-api-token}
api() { curl -s -o /dev/null -w '%{http_code}' -H "Authorization: $T" -H 'content-type: application/json' "$@"; }
for f in screen.home.offer-banner agent.enabled agent.tool.crm_update_email agent.tool.crm_get_customer; do
  c=$(api -X POST "$U/api/admin/projects/default/features" -d "{\"name\":\"$f\",\"type\":\"release\"}")
  if [ "$c" = 201 ]; then
    api -X POST "$U/api/admin/projects/default/features/$f/environments/development/strategies" \
      -d "{\"name\":\"flexibleRollout\",\"parameters\":{\"rollout\":\"100\",\"stickiness\":\"default\",\"groupId\":\"$f\"}}" >/dev/null
    api -X POST "$U/api/admin/projects/default/features/$f/environments/development/on" >/dev/null
    echo "créé+activé: $f"
  else echo "existe déjà ($c): $f"; fi
done
