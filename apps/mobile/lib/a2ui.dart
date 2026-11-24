import 'package:flutter/material.dart';

/// Rendu minimal de messages A2UI v0.9 (createSurface / updateComponents) pour le catalogue poc/design-catalog/v1.
class A2uiSurfaces {
  final Map<String, Map<String, Map<String, dynamic>>> surfaces = {};

  void process(List<dynamic> messages) {
    for (final m in messages) {
      final msg = m as Map<String, dynamic>;
      final create = msg['createSurface'] as Map<String, dynamic>?;
      if (create != null) surfaces.putIfAbsent(create['surfaceId'] as String, () => {});
      final upd = msg['updateComponents'] as Map<String, dynamic>?;
      if (upd != null) {
        final s = surfaces.putIfAbsent(upd['surfaceId'] as String, () => {});
        for (final c in (upd['components'] as List)) {
          final comp = Map<String, dynamic>.from(c as Map);
          s[comp['id'] as String] = comp;
        }
      }
    }
  }
}

typedef Decide = void Function(String actionId, String decision);

class A2uiView extends StatelessWidget {
  const A2uiView({super.key, required this.surfaces, this.onDecide, this.decided = const {}});
  final A2uiSurfaces surfaces;
  final Decide? onDecide;
  final Map<String, String> decided;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final s in surfaces.surfaces.values)
            if (s['root'] != null) _node(s, 'root'),
        ],
      );

  Widget _node(Map<String, Map<String, dynamic>> s, String id) {
    final c = s[id];
    if (c == null) return const SizedBox.shrink();
    String str(String k) => (c[k] ?? '').toString();
    switch (c['component']) {
      case 'Column':
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (final ch in (c['children'] as List? ?? const [])) _node(s, ch.toString()),
        ]);
      case 'Text':
        return Text(str('text'));
      case 'Banner':
        return _box(Key('banner'), const Color(0xFFFFF8C5), [Text(str('title'), style: const TextStyle(fontWeight: FontWeight.bold)), Text(str('body'))]);
      case 'CustomerCard':
        return _box(Key('customer-card'), Colors.white, [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(str('name'), style: const TextStyle(fontWeight: FontWeight.bold)), Text(str('tier'))]),
          Text(str('email')),
        ]);
      case 'ConfirmAction':
        final actionId = str('actionId');
        final done = decided[actionId];
        return _box(Key('confirm-action'), Colors.white, [
          Text(str('summary')),
          if (done != null)
            Text(done == 'CONFIRM' ? 'Confirmé' : 'Annulé', style: const TextStyle(fontStyle: FontStyle.italic))
          else
            Row(children: [
              TextButton(onPressed: () => onDecide?.call(actionId, 'CONFIRM'), child: Text(str('confirmLabel'))),
              TextButton(onPressed: () => onDecide?.call(actionId, 'CANCEL'), child: Text(str('cancelLabel'))),
            ]),
        ]);
      default:
        return Text('[composant inconnu: ${c['component']}]');
    }
  }

  Widget _box(Key key, Color bg, List<Widget> children) => Container(
        key: key,
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: bg, border: Border.all(color: Colors.black26), borderRadius: BorderRadius.circular(8)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
      );
}
