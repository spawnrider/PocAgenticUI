// Hôtes : l'émulateur Android joint la machine hôte via 10.0.2.2 ; le simulateur iOS via localhost.
const host = String.fromEnvironment('HOST', defaultValue: 'localhost');
const bffUrl = 'http://$host:4000';
const agentUrl = 'http://$host:4111/ag-ui/assistant';
const issuer = 'http://$host:8081/realms/poc';
const clientId = 'mobile-app';
const redirectUri = 'com.example.protoagenticui:/oauthredirect';
