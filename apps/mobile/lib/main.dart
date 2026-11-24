import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:http/http.dart' as http;
import 'a2ui.dart';
import 'agent_client.dart';
import 'config.dart';

void main() => runApp(const App());

class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) => const MaterialApp(title: 'ProtoAgenticUI', home: Gate());
}

class Gate extends StatefulWidget {
  const Gate({super.key});
  @override
  State<Gate> createState() => _GateState();
}

class _GateState extends State<Gate> {
  String? token;
  String? error;

  Future<void> login() async {
    try {
      // Client public Keycloak "mobile-app" : PKCE (flutter_appauth l'active par défaut).
      final r = await FlutterAppAuth().authorizeAndExchangeCode(AuthorizationTokenRequest(
        clientId, redirectUri,
        issuer: issuer, scopes: ['openid', 'profile', 'email'], allowInsecureConnections: true));
      setState(() => token = r.accessToken);
    } catch (e) {
      setState(() => error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) => token == null
      ? Scaffold(body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          ElevatedButton(onPressed: login, child: const Text('Se connecter (Keycloak)')),
          if (error != null) Padding(padding: const EdgeInsets.all(16), child: Text(error!)),
        ])))
      : HomePage(token: token!);
}

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.token});
  final String token;
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final screen = A2uiSurfaces();
  final history = <ChatMessage>[];
  final decided = <String, String>{};
  final input = TextEditingController();
  late final agent = AgentClient(widget.token);

  @override
  void initState() {
    super.initState();
    http.get(Uri.parse('$bffUrl/screens/home')).then((r) => setState(() => screen.process(jsonDecode(r.body) as List)));
  }

  Future<void> say(String text) async {
    setState(() => history.add(ChatMessage('user', text)));
    final snapshot = List<ChatMessage>.from(history);
    ChatMessage? shown;
    await agent.send(snapshot, (reply) => setState(() {
          if (shown == null) { shown = reply; history.add(reply); }
        }));
  }

  void decide(String id, String d) {
    setState(() => decided[id] = d);
    say('$d:$id');
  }

  Widget bubble(ChatMessage m) {
    final cards = <Widget>[];
    for (final c in m.calls) {
      if ((c.name == 'show_customer_card' || c.name == 'show_confirm_action') && c.result != null) {
        final s = A2uiSurfaces()..process((jsonDecode(c.result!) as Map)['a2ui'] as List);
        cards.add(A2uiView(surfaces: s, onDecide: decide, decided: decided));
      }
    }
    return Align(
      alignment: m.role == 'user' ? Alignment.centerRight : Alignment.centerLeft,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [...cards, if (m.text.isNotEmpty) Text(m.text)]),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Accueil (SDUI via BFF)')),
        body: Column(children: [
          Padding(padding: const EdgeInsets.all(12), child: A2uiView(surfaces: screen)),
          const Divider(),
          Expanded(child: ListView(padding: const EdgeInsets.all(12), children: [for (final m in history) bubble(m)])),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(children: [
              Expanded(child: TextField(controller: input, decoration: const InputDecoration(hintText: 'Message…'), onSubmitted: (t) { input.clear(); say(t); })),
              IconButton(icon: const Icon(Icons.send), onPressed: () { final t = input.text; input.clear(); say(t); }),
            ]),
          ),
        ]),
      );
}
