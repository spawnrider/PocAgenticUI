import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

class ToolCall {
  ToolCall(this.id, this.name);
  final String id;
  final String name;
  String args = '';
  String? result;
}

class ChatMessage {
  ChatMessage(this.role, this.text, [List<ToolCall>? calls]) : calls = calls ?? [];
  final String role; // user | assistant
  String text;
  final List<ToolCall> calls;
}

/// Client AG-UI (SSE) vers l'agent. Envoie l'historique complet à chaque tour (agent sans mémoire serveur).
class AgentClient {
  AgentClient(this.token);
  final String token;
  final String threadId = DateTime.now().microsecondsSinceEpoch.toString();

  List<Map<String, dynamic>> _wire(List<ChatMessage> history) {
    final out = <Map<String, dynamic>>[];
    var n = 0;
    for (final m in history) {
      if (m.role == 'user') {
        out.add({'id': 'm${n++}', 'role': 'user', 'content': m.text});
      } else {
        for (final c in m.calls) {
          out.add({'id': 'm${n++}', 'role': 'assistant', 'toolCalls': [{'id': c.id, 'type': 'function', 'function': {'name': c.name, 'arguments': c.args}}]});
          out.add({'id': 'm${n++}', 'role': 'tool', 'toolCallId': c.id, 'content': c.result ?? ''});
        }
        if (m.text.isNotEmpty) out.add({'id': 'm${n++}', 'role': 'assistant', 'content': m.text});
      }
    }
    return out;
  }

  /// Exécute un tour ; `onUpdate` est appelé à chaque évènement avec le message assistant en cours.
  Future<void> send(List<ChatMessage> history, void Function(ChatMessage) onUpdate) async {
    final reply = ChatMessage('assistant', '');
    final req = http.Request('POST', Uri.parse(agentUrl))
      ..headers.addAll({'content-type': 'application/json', 'accept': 'text/event-stream', 'authorization': 'Bearer $token'})
      ..body = jsonEncode({'threadId': threadId, 'runId': DateTime.now().microsecondsSinceEpoch.toString(), 'state': {}, 'messages': _wire(history), 'tools': [], 'context': [], 'forwardedProps': {}});
    final res = await http.Client().send(req);
    if (res.statusCode != 200) throw Exception('agent ${res.statusCode}');
    final byId = <String, ToolCall>{};
    await for (final line in res.stream.transform(utf8.decoder).transform(const LineSplitter())) {
      if (!line.startsWith('data:')) continue;
      final e = jsonDecode(line.substring(5)) as Map<String, dynamic>;
      switch (e['type']) {
        case 'TEXT_MESSAGE_CONTENT':
          reply.text += e['delta'] as String;
        case 'TOOL_CALL_START':
          final c = ToolCall(e['toolCallId'] as String, e['toolCallName'] as String);
          byId[c.id] = c;
          reply.calls.add(c);
        case 'TOOL_CALL_ARGS':
          byId[e['toolCallId']]?.args += e['delta'] as String;
        case 'TOOL_CALL_RESULT':
          byId[e['toolCallId']]?.result = e['content'] as String;
        case 'RUN_ERROR':
          reply.text += '\n[erreur: ${e['message']}]';
      }
      onUpdate(reply);
    }
  }
}
