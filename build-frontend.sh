#!/bin/bash

echo "🔨 Building Frontend React..."

cd frontend
npm run build

echo "📦 Copiando build para public/ do backend..."

cd ..
rm -rf public/*
cp -r frontend/dist/* public/

echo "✅ Build completo!"
echo "🎯 Execute 'go run main.go' para iniciar o servidor"

