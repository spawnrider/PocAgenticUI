#!/usr/bin/env bash
# Vérifie gateway : 401 sans jeton, lecture OK, écriture refusée pour bob, OK pour alice.
set -u
KC=${KC:-http://localhost:8081/realms/poc/protocol/openid-connect/token}
GW=${GW:-http://localhost:3000/mcp}
fail=0
tok() { curl -s -d "client_id=poc-cli&grant_type=password&username=$1&password=$1" "$KC" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])"; }
HDR=(-H 'content-type: application/json' -H 'accept: application/json, text/event-stream')
call() { # token, body, [session]
  local extra=(); [ -n "${1:-}" ] && extra+=(-H "Authorization: Bearer $1"); [ -n "${3:-}" ] && extra+=(-H "Mcp-Session-Id: $3")
  curl -s -m 15 -D /tmp/e2e.hdr -o /tmp/e2e.out -w '%{http_code}' ${extra[@]+"${extra[@]}"} "${HDR[@]}" "$GW" -d "$2"
}
session() { # token -> session id
  call "$1" '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"e2e","version":"0"}}}' >/dev/null
  local sid; sid=$(grep -i '^mcp-session-id' /tmp/e2e.hdr | awk '{print $2}' | tr -d '\r')
  call "$1" '{"jsonrpc":"2.0","method":"notifications/initialized"}' "$sid" >/dev/null; echo "$sid"
}
check() { if [ "$2" = "$3" ]; then echo "OK   $1"; else echo "FAIL $1 (attendu $3, obtenu $2)"; fail=1; fi; }
LIST='{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
check "sans jeton -> 401" "$(call '' "$LIST")" 401
A=$(tok alice); B=$(tok bob); SA=$(session "$A"); SB=$(session "$B")
check "alice tools/list -> 200" "$(call "$A" "$LIST" "$SA")" 200
grep -q crm_get_customer /tmp/e2e.out && echo "OK   tools/list contient crm_get_customer" || { echo "FAIL tools/list: $(head -c 200 /tmp/e2e.out)"; fail=1; }
GET='{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"crm_get_customer","arguments":{"id":"c1"}}}'
check "bob lecture -> 200" "$(call "$B" "$GET" "$SB")" 200
grep -q "Alice Martin" /tmp/e2e.out && echo "OK   lecture renvoie c1" || { echo "FAIL lecture: $(head -c 200 /tmp/e2e.out)"; fail=1; }
UPD='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"crm_update_email","arguments":{"id":"c1","email":"alice+e2e@example.com"}}}'
call "$B" "$UPD" "$SB" >/dev/null; if grep -q "alice+e2e" /tmp/e2e.out; then echo "FAIL bob a pu écrire"; fail=1; else echo "OK   écriture refusée pour bob: $(head -c 150 /tmp/e2e.out | tr '\n' ' ')"; fi
call "$A" "$UPD" "$SA" >/dev/null; if grep -q "alice+e2e" /tmp/e2e.out; then echo "OK   écriture OK pour alice"; else echo "FAIL alice écriture: $(head -c 200 /tmp/e2e.out)"; fail=1; fi
exit $fail
