#!/usr/bin/env bash
set -euo pipefail

# Lancement du projet backend-e2e-test
# Installe les dépendances si besoin, puis démarre le serveur.

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm install
fi

npm start
