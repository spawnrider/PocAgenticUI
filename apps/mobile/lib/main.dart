import 'package:flutter/material.dart';
// import 'package:genui/genui.dart';
// import 'package:genui_a2a/genui_a2a.dart';

// SQUELETTE : les API exactes de genui 0.10 (SurfaceController, A2uiTransportAdapter, Conversation)
// sont à brancher à la main — voir README. Le transport A2A cible http://<hôte>:4111/a2a/assistant.
void main() => runApp(const App());

class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) => const MaterialApp(home: Scaffold(body: Center(child: Text('POC ProtoAgenticUI'))));
}
