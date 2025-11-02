# Configuração para Google Cloud Run

Este documento explica como configurar as variáveis de ambiente no Google Cloud Run.

## Opção 1: Arquivo YAML (Mais Fácil) ⭐

### Setup Rápido:
```bash
# 1. Copie o exemplo e configure
cp env.yaml.example env.yaml

# 2. Edite env.yaml e adicione sua GEMINI_API_KEY
# Edite o arquivo e substitua "sua_chave_aqui" pela sua chave real

# 3. Deploy usando o arquivo YAML
gcloud run deploy chatbot-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --env-vars-file env.yaml \
  --allow-unauthenticated
```

### Ou use os scripts prontos:
```bash
# Linux/Mac
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh

# Windows
deploy-cloud-run.bat
```

Os scripts verificam se `env.yaml` existe e está configurado antes de fazer o deploy.

## Opção 2: Variáveis de Ambiente via CLI

### Via Console Web:
1. Acesse o [Cloud Run Console](https://console.cloud.google.com/run)
2. Selecione seu serviço
3. Clique em "EDIT & DEPLOY NEW REVISION"
4. Vá para a aba "Variables & Secrets"
5. Adicione:
   - `GEMINI_API_KEY`: sua chave da API
   - `PORT`: `8080` (opcional, Cloud Run define automaticamente)

### Via gcloud CLI:
```bash
# Configurar variáveis de ambiente
gcloud run services update seu-servico \
  --set-env-vars GEMINI_API_KEY=sua_chave_aqui,PORT=8080 \
  --region=us-central1
```

## Opção 3: Secret Manager (Recomendado para Produção)

### 1. Criar o Secret:
```bash
# Criar o secret com sua chave
echo -n "sua_chave_aqui" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic"
```

### 2. Dar permissão ao Cloud Run:
```bash
# Obter o número do projeto do Cloud Run
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Dar permissão de acesso ao secret
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Configurar no Cloud Run:
```bash
# Via gcloud CLI
gcloud run services update seu-servico \
  --update-secrets GEMINI_API_KEY=gemini-api-key:latest \
  --region=us-central1
```

Ou via Console Web:
1. Cloud Run → Seu Serviço → EDIT → Variables & Secrets
2. Adicione Secret → Escolha `gemini-api-key` → Versão `latest`
3. Nome da variável: `GEMINI_API_KEY`

## Opção 4: Via Arquivo .env (Apenas desenvolvimento local)

Para desenvolvimento local, o arquivo `.env` será usado automaticamente pelo código.

## Deploy no Cloud Run

### Método Simples (usando env.yaml):
```bash
gcloud run deploy chatbot-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --env-vars-file env.yaml \
  --allow-unauthenticated
```

### Método Manual:
```bash
# Build e deploy
gcloud run deploy seu-servico \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Verificar Configuração

```bash
# Ver variáveis configuradas
gcloud run services describe seu-servico \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

