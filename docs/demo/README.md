# Démonstration vidéo du statut du service

La préparation comprend un scénario et un script de capture du véritable
parcours navigateur. **La vidéo n’a pas été générée dans l’environnement de
travail**, qui refuse l’ouverture du serveur local (`listen EPERM` sur
`127.0.0.1`). Aucun résultat simulé n’est utilisé.

## Générer la vidéo

Depuis la racine du dépôt, avec Node.js 20 ou supérieur, dans un environnement
autorisant un serveur HTTP local et Chromium :

```sh
npm ci
npm install --no-save --package-lock=false playwright@1.63.0
npx playwright install chromium
node scripts/record-service-demo.cjs
```

Sur Linux, si des bibliothèques système sont manquantes, utiliser un
environnement disposant des dépendances de Chromium ou les installer avec
`npx playwright install-deps chromium` (peut nécessiter des droits administrateur).
Pour un Chromium déjà installé, définir `DEMO_CHROMIUM_PATH` avec le chemin
de son exécutable.

Le script démarre l’application sur un port local disponible, enregistre une
capture silencieuse de 15 à 20 secondes en 1280 × 720, puis ferme le navigateur
et le serveur. La sortie est `docs/demo/service-operationnel.webm`, lisible
dans un navigateur compatible WebM. Une nouvelle exécution remplace cette vidéo.
Playwright est un outil de préparation local ; le manifeste et le verrou des
dépendances de l’application restent inchangés.

Le script vérifie la visibilité de l’encart et du bouton, puis contrôle que
le clic provoque une réponse HTTP 200 contenant `{"status":"ok"}` sur
`/status`. Il revient ensuite à l’accueil. Une erreur produit un code de sortie
non nul ; ne pas présenter une capture partielle comme une démonstration réussie.

## Déroulé et narration proposée

Les temps sont approximatifs et dépendent du chargement des pages. La narration
ci-dessous peut être lue pendant une capture manuelle ou ajoutée au montage ;
le script n’enregistre pas de voix.

| Temps | Action à l’écran | Narration |
| --- | --- | --- |
| 0–4 s | Afficher l’accueil et l’encart au-dessus des commandes. | « La page d’accueil affiche désormais un encart service opérationnel. » |
| 4–6 s | Mettre en évidence le bouton par survol et focus clavier. | « Le bouton vérifier le statut permet de consulter le statut du service. » |
| 6–11 s | Cliquer et laisser la réponse JSON visible. | « Le bouton ouvre la page de statut. Le service répond avec le statut OK. » |
| 11–15 s | Revenir à l’accueil. | « Un retour à l’accueil permet de retrouver l’encart et les commandes. » |

## Capture manuelle alternative

1. Exécuter `npm ci`, puis `npm start` à la racine du dépôt.
2. Ouvrir `http://localhost:3000` dans un navigateur, avec une fenêtre de
   1280 × 720 environ et un zoom à 100 %.
3. Démarrer l’enregistreur d’écran et suivre le déroulé ci-dessus.
4. Vérifier que le clic ouvre `/status` et affiche `{"status":"ok"}`.
5. Arrêter la capture après le retour à l’accueil et exporter la vidéo.

Le libellé initial « service opérationnel » est statique. Le bouton navigue
vers la réponse JSON de `/status` ; il ne met pas à jour l’encart sur place.
Cette route confirme la réponse du service, sans vérifier la base de données.
