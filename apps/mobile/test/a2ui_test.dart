import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:protoagenticui_mobile/a2ui.dart';

void main() {
  final messages = [
    {'version': 'v0.9', 'createSurface': {'surfaceId': 'home', 'catalogId': 'poc/design-catalog/v1'}},
    {'version': 'v0.9', 'updateComponents': {'surfaceId': 'home', 'components': [
      {'id': 'root', 'component': 'Column', 'children': ['s0', 's1']},
      {'id': 's0', 'component': 'Banner', 'title': 'Offre', 'body': '-20 %'},
      {'id': 's1', 'component': 'ConfirmAction', 'actionId': 'a1', 'summary': 'Changer ?', 'confirmLabel': 'Confirmer', 'cancelLabel': 'Annuler'},
    ]}},
  ];

  testWidgets('rend Banner et ConfirmAction, le bouton renvoie la décision', (tester) async {
    final s = A2uiSurfaces()..process(messages);
    String? got;
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: A2uiView(surfaces: s, onDecide: (id, d) => got = '$d:$id'))));
    expect(find.byKey(const Key('banner')), findsOneWidget);
    await tester.tap(find.text('Confirmer'));
    expect(got, 'CONFIRM:a1');
  });
}
