# 🐳 Docker Guide - Chatbot Político

Guia completo para rodar o projeto com Docker.

## 📋 Pré-requisitos

- Docker instalado (20.10+)
- Docker Compose instalado (1.29+)

Verificar instalação:
```bash
docker --version
docker-compose --version
```

## ⚠️ Troubleshooting Inicial

### Erro: "The system cannot find the file specified"

**Windows**: Inicie o Docker Desktop
1. Procure por "Docker Desktop" no menu Iniciar
2. Clique para abrir a aplicação
3. Aguarde até o ícone na bandeja ficar verde
4. Tente novamente o comando

**Verificar se está rodando**:
```bash
docker ps
```

Se funcionar, você verá uma lista (vazia ou com containers). Se der erro, o Docker não está rodando.

## 🚀 Uso Rápido

### Opção 1: Docker Compose (Recomendado)

```bash
# 1. Configurar variáveis de ambiente
cp env.example .env
# Edite .env e adicione GEMINI_API_KEY

# 2. Build e iniciar
docker-compose up -d

# 3. Ver logs
docker-compose logs -f

# 4. Parar
docker-compose down
```

Acesse: **http://localhost:3000**

### Opção 2: Docker direto

```bash
# 1. Build da imagem
docker build -t chatbot:latest .

# 2. Rodar container
docker run -d \
  --name chatbot \
  -p 3000:3000 \
  -e GEMINI_API_KEY=sua_chave_aqui \
  chatbot:latest

# 3. Ver logs
docker logs -f chatbot

# 4. Parar
docker stop chatbot
docker rm chatbot
```

## 🏗️ Arquitetura Docker

```
┌─────────────────────────────────────────┐
│         Docker Image                    │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Stage 1: Frontend Builder        │ │
│  │  - Node 18 Alpine                 │ │
│  │  - npm ci                         │ │
│  │  - npm run build                  │ │
│  └───────────────────────────────────┘ │
│                ↓                        │
│  ┌───────────────────────────────────┐ │
│  │  Stage 2: Backend Builder         │ │
│  │  - Go 1.21 Alpine                 │ │
│  │  - go build                       │ │
│  └───────────────────────────────────┘ │
│                ↓                        │
│  ┌───────────────────────────────────┐ │
│  │  Stage 3: Final Image             │ │
│  │  - Alpine Linux (mínimo)          │ │
│  │  - Binary Go (15MB)               │ │
│  │  - Static files React             │ │
│  │  - Total: ~25MB                   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env`:

```bash
# .env
GEMINI_API_KEY=sua_chave_aqui
PORT=3000
```

### Docker Compose

O arquivo `docker-compose.yml` já está configurado com:
- ✅ Port mapping (3000:3000)
- ✅ Health check automático
- ✅ Restart policy
- ✅ Environment variables

## 📊 Comandos Úteis

### Build

```bash
# Build normal
docker-compose build

# Build sem cache
docker-compose build --no-cache

# Build específico
docker build --target frontend-builder -t chatbot-frontend .
docker build --target backend-builder -t chatbot-backend .
```

### Logs

```bash
# Todos os logs
docker-compose logs

# Logs em tempo real
docker-compose logs -f

# Últimas 100 linhas
docker-compose logs --tail=100

# Logs de um serviço específico
docker-compose logs chatbot
```

### Execução

```bash
# Iniciar em background
docker-compose up -d

# Iniciar no foreground
docker-compose up

# Reiniciar
docker-compose restart

# Parar
docker-compose stop

# Parar e remover
docker-compose down

# Parar, remover e limpar volumes
docker-compose down -v
```

### Inspeção

```bash
# Status dos containers
docker-compose ps

# Uso de recursos
docker stats chatbot

# Shell no container
docker-compose exec chatbot sh

# Ver variáveis de ambiente
docker-compose exec chatbot env
```

## 🐛 Troubleshooting

### Problema: Build falha

```bash
# Limpar cache do Docker
docker builder prune

# Rebuild sem cache
docker-compose build --no-cache
```

### Problema: Container não inicia

```bash
# Ver logs de erro
docker-compose logs

# Verificar variáveis de ambiente
docker-compose config

# Testar manualmente
docker run --rm -it chatbot:latest sh
```

### Problema: Porta já em uso

```bash
# Usar outra porta no docker-compose.yml
ports:
  - "3001:3000"  # Muda porta externa para 3001

# Ou pare o serviço que está usando a porta
# Linux:
sudo lsof -i :3000
sudo kill -9 PID

# Windows:
netstat -ano | findstr :3000
taskkill /PID PID /F
```

### Problema: GEMINI_API_KEY não definida

```bash
# Verificar se .env existe
cat .env

# Executar com variável inline
docker run -e GEMINI_API_KEY=sua_chave chatbot:latest
```

## 🚀 Deploy em Produção

### Docker Swarm

```bash
# Inicializar swarm
docker swarm init

# Deploy
docker stack deploy -c docker-compose.yml chatbot

# Ver status
docker stack services chatbot
```

### Kubernetes

```bash
# Gerar manifests (usando kompose)
kompose convert

# Ou criar manualmente Deployment e Service
kubectl apply -f k8s/
```

### Cloud Deploy

#### Railway
```bash
railway login
railway init
railway up
```

#### Render
```bash
# Conectar repositório via dashboard
# Render detectará o Dockerfile automaticamente
```

#### Google Cloud Run
```bash
# Build
gcloud builds submit --tag gcr.io/PROJECT-ID/chatbot

# Deploy
gcloud run deploy chatbot \
  --image gcr.io/PROJECT-ID/chatbot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### AWS ECS/Fargate
```bash
# Build e push
docker build -t chatbot .
docker tag chatbot:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/chatbot:latest
aws ecr get-login-password | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/chatbot:latest

# Deploy via ECS
aws ecs create-service --cluster chatbot --service-name chatbot --task-definition chatbot --desired-count 1
```

## 📦 Otimizações

### Multi-stage Build

O Dockerfile usa multi-stage builds para:
- ✅ Reduzir tamanho final (~25MB vs ~500MB)
- ✅ Eliminar dependências de build
- ✅ Segurança (menos ataque surface)
- ✅ Build mais rápido em estágios

### Layer Caching

```dockerfile
# Dependências em layer separada
COPY go.mod go.sum ./
RUN go mod download  # Cachea se go.mod não muda

COPY . .
RUN go build         # Só rebuilda se código muda
```

### .dockerignore

O arquivo `.dockerignore` exclui:
- node_modules/
- .git/
- Documentation (*.md)
- Build artifacts
- Temporary files

## 🔒 Segurança

### Boas Práticas Aplicadas

- ✅ Imagem Alpine (minimalista)
- ✅ Non-root user (opcional)
- ✅ Multi-stage build
- ✅ .dockerignore
- ✅ Health checks
- ✅ Environment variables seguras

### Recomendações Adicionais

```dockerfile
# Criar usuário não-root
RUN addgroup -S chatbot && adduser -S chatbot -G chatbot
USER chatbot

# Read-only root filesystem
--read-only

# Secrets gerenciados
--secret id=gemini_key,src=./secrets/gemini_key.txt
```

## 📊 Tamanhos

| Imagem | Tamanho |
|--------|---------|
| frontend-builder | ~300MB |
| backend-builder | ~800MB |
| Final (alpine) | ~25MB |

### Comparação

| Método | Tamanho | Tempo Build |
|--------|---------|-------------|
| Docker Multi-stage | 25MB | ~2-3min |
| Docker Single-stage | 500MB+ | ~5-8min |
| Sem Docker | N/A | ~30s |

## 🧪 Testes

```bash
# Testar health check
curl http://localhost:3000/api/health

# Testar API
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Benchmarks
docker exec chatbot sh -c "ab -n 1000 -c 10 http://localhost:3000/api/health"
```

## 📝 Exemplo de .env para Produção

```bash
# .env.production
GEMINI_API_KEY=sk-proj-sua-chave-aqui
PORT=3000
ENV=production
LOG_LEVEL=info
MAX_REQUESTS=1000
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Docker Build

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build image
        run: docker build -t chatbot:${{ github.sha }} .
      
      - name: Push to registry
        run: docker push chatbot:${{ github.sha }}
```

### GitLab CI

```yaml
build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## 📚 Recursos

- [Docker Docs](https://docs.docker.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

**🚢 Happy Dockerizing!**

