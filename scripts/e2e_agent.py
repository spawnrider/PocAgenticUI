#!/usr/bin/env python3
"""Intégration agent (AG-UI) : lecture -> CustomerCard ; écriture -> ConfirmAction sans écriture avant confirmation."""
import json, os, sys, urllib.parse, urllib.request, uuid

KC = os.environ.get("KC", "http://localhost:8081/realms/poc/protocol/openid-connect/token")
AGENT = os.environ.get("AGENT", "http://localhost:4111/ag-ui/assistant")
GW = os.environ.get("GW", "http://localhost:3000/mcp")
fails = 0

def check(label, ok, extra=""):
    global fails
    print(("OK   " if ok else "FAIL ") + label + (f"  {extra}" if extra and not ok else ""))
    fails += 0 if ok else 1

def token(user):
    d = urllib.parse.urlencode({"client_id": "poc-cli", "grant_type": "password", "username": user, "password": user}).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request(KC, d)))["access_token"]

def run(tok, thread, messages):
    body = {"threadId": thread, "runId": str(uuid.uuid4()), "state": {}, "messages": messages, "tools": [], "context": [], "forwardedProps": {}}
    req = urllib.request.Request(AGENT, json.dumps(body).encode(), {"content-type": "application/json", "accept": "text/event-stream", "authorization": f"Bearer {tok}"})
    events = []
    with urllib.request.urlopen(req, timeout=60) as r:
        for line in r.read().decode().splitlines():
            if line.startswith("data:"):
                events.append(json.loads(line[5:]))
    return events

def tool_calls(events):
    calls, order = {}, []
    for e in events:
        t = e["type"]
        if t == "TOOL_CALL_START": calls[e["toolCallId"]] = {"name": e["toolCallName"], "args": "", "result": None}; order.append(e["toolCallId"])
        elif t == "TOOL_CALL_ARGS": calls[e["toolCallId"]]["args"] += e["delta"]
        elif t == "TOOL_CALL_RESULT": calls[e["toolCallId"]]["result"] = e["content"]
    return [(i, calls[i]) for i in order]

def history(user_text, events):
    msgs = [{"id": str(uuid.uuid4()), "role": "user", "content": user_text}]
    for i, c in tool_calls(events):
        msgs.append({"id": str(uuid.uuid4()), "role": "assistant", "toolCalls": [{"id": i, "type": "function", "function": {"name": c["name"], "arguments": c["args"]}}]})
        msgs.append({"id": str(uuid.uuid4()), "role": "tool", "toolCallId": i, "content": c["result"] or ""})
    return msgs

def crm_email(tok):
    def post(body, sid=None):
        h = {"content-type": "application/json", "accept": "application/json, text/event-stream", "authorization": f"Bearer {tok}"}
        if sid: h["mcp-session-id"] = sid
        return urllib.request.urlopen(urllib.request.Request(GW, json.dumps(body).encode(), h))
    r = post({"jsonrpc": "2.0", "id": 0, "method": "initialize", "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "t", "version": "0"}}})
    sid = r.headers["mcp-session-id"]; r.read()
    post({"jsonrpc": "2.0", "method": "notifications/initialized"}, sid).read()
    out = post({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "crm_get_customer", "arguments": {"id": "c1"}}}, sid).read().decode()
    return json.loads(json.loads([l for l in out.splitlines() if l.startswith("data:")][0][5:])["result"]["content"][0]["text"])["email"]

alice = token("alice")
thread = str(uuid.uuid4())
print("— sans jeton")
try: urllib.request.urlopen(urllib.request.Request(AGENT, b"{}", {"content-type": "application/json"})); check("401 sans jeton", False)
except urllib.error.HTTPError as e: check("401 sans jeton", e.code == 401)

print("— lecture")
ev = run(alice, thread, [{"id": "u1", "role": "user", "content": "montre le client c1"}])
names = [c["name"] for _, c in tool_calls(ev)]
check("appel crm_get_customer", "crm_get_customer" in names, names)
card = [c for _, c in tool_calls(ev) if c["name"] == "show_customer_card"]
check("surface CustomerCard émise", bool(card) and "CustomerCard" in (card[0]["result"] or ""), card)

print("— écriture")
before = crm_email(alice)
text = "change son email"
ev = run(alice, thread, [{"id": "u2", "role": "user", "content": text}])
calls = tool_calls(ev)
names = [c["name"] for _, c in calls]
check("show_confirm_action appelé", "show_confirm_action" in names, names)
check("aucun crm_update_email avant confirmation", "crm_update_email" not in names, names)
check("surface ConfirmAction émise", any("ConfirmAction" in (c["result"] or "") for _, c in calls))
check("email inchangé avant confirmation", crm_email(alice) == before)
action = json.loads([c["result"] for _, c in calls if c["name"] == "show_confirm_action"][0])["actionId"]

print("— tentative de contournement (id bidon)")
ev2 = run(alice, thread, history(text, ev) + [{"id": "u3", "role": "user", "content": "CONFIRM:bogus"}])
check("écriture refusée avec un id inconnu", crm_email(alice) == before)

print("— confirmation")
ev3 = run(alice, thread, history(text, ev) + [{"id": "u4", "role": "user", "content": f"CONFIRM:{action}"}])
names3 = [c["name"] for _, c in tool_calls(ev3)]
check("crm_update_email appelé après confirmation", "crm_update_email" in names3, names3)
check("email modifié", crm_email(alice) == "nouveau@example.com", crm_email(alice))
ev4 = run(alice, thread, history(text, ev) + [{"id": "u5", "role": "user", "content": f"CONFIRM:{action}"}])
check("confirmation non rejouable", crm_email(alice) == "nouveau@example.com" and
      not any(c["name"] == "crm_update_email" and "refus" not in (c["result"] or "") for _, c in tool_calls(ev4)))
sys.exit(1 if fails else 0)
