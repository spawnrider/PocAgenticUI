# ADR 0006 — Garde-fou d'écriture côté serveur

**Statut :** Acceptée

## Contexte
Une écriture doit toujours passer par la surface `ConfirmAction`. S'appuyer sur le LLM pour respecter cette règle n'est pas fiable.

## Décision
Table Postgres `pending_actions`. `show_confirm_action` crée une ligne en attente ; l'UI envoie `CONFIRM:<id>` ou `CANCEL:<id>` ; le serveur enregistre la décision. `crm_update_email` ne s'exécute que si une ligne confirmée correspond exactement aux arguments, et une seule fois (statut `consumed`).

## Conséquences
- La protection est indépendante du modèle et du prompt.
- Le texte brut `CONFIRM:<id>` est visible dans le chat (défaut connu).
