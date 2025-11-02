# 💬 Chatbot Político • Neutro & Informativo

Sistema completo de chatbot político com visualização hexagonal de análise, construído com **Go** (backend) e **React** (frontend).

## 🌟 Características

### Backend Go
- 🤖 Integração com Google Gemini AI
- ⚡ Cache em memória otimizado
- 🚀 Performance excelente e baixo consumo de recursos
- 📊 Endpoints RESTful
- 🔒 Thread-safe com goroutines

### Frontend React
- 💬 Interface de chat moderna e intuitiva
- 📊 **Gráfico Hexagonal** único para análise política
- 🎨 Design dark mode responsivo
- 📱 Totalmente mobile-first
- ⚡ Rápido com Vite

### Análise de Políticos
Visualização hexagonal mostra:
- 💪 **Pontos Fortes** (Verde): Onde o político se destaca
- ⚖️ **Pontos Médios** (Amarelo): Potencial de desenvolvimento  
- ⚠️ **Pontos Fracos** (Vermelho): Áreas que precisam atenção

## 🏗️ Arquitetura

```
CHAT_BOT/
├── main.go                 # API Go (Backend completo)
├── go.mod                  # Dependências Go
├── public/                 # Arquivos estáticos
├── frontend/               # App React
│   ├── src/
│   │   ├── App.jsx         # App principal
│   │   └── components/
│   │       ├── Chat.jsx    # Componente de chat
│   │       └── HexagonalChart.jsx  # Gráfico hexagonal
│   ├── vite.config.js
│   └── package.json
└── env.example
```

## 🚀 Instalação Rápida

### 1. Clonar o Repositório

```bash
cd CHAT_BOT
```

### 2. Configurar Backend Go

```bash
# Copiar arquivo de ambiente
cp env.example .env

# Editar .env e adicionar sua chave Gemini
# GEMINI_API_KEY=sua_chave_aqui
```

### 3. Instalar Backend Go

```bash
# Baixar dependências
go mod download

# Executar servidor
go run main.go
```

Backend rodando em: `http://localhost:3000`

### 4. Instalar Frontend React

```bash
# Entrar na pasta frontend
cd frontend

# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev
```

Frontend rodando em: `http://localhost:5173`

## 📖 Uso

### 1. Acessar a Interface

Abra `http://localhost:5173` no seu navegador

### 2. Fazer Perguntas

Digite perguntas sobre política brasileira, por exemplo:
- "O que é um deputado federal?"
- "Como funciona o sistema eleitoral?"
- "Me conte sobre o Lula"
- "Quem é o Bolsonaro?"

### 3. Ver Análise Hexagonal

Quando você mencionar um político específico (Lula, Bolsonaro, Ciro, etc.), o sistema automaticamente:
1. Responde sua pergunta via chat
2. Gera um gráfico hexagonal com análise
3. Mostra detalhes dos pontos fortes/médios/fracos

## 🔧 Desenvolvimento

### Backend Go

```bash
# Modo desenvolvimento
go run main.go

# Build de produção
go build -o chatbot-api

# Rodar binário
./chatbot-api
```

### Frontend React

```bash
cd frontend

# Desenvolvimento com hot-reload
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

## 📡 Endpoints da API

### POST `/api/chat`
Envia mensagem para o chatbot

**Request:**
```json
{
  "message": "Me conte sobre o Lula"
}
```

**Response:**
```json
{
  "reply": "Luiz Inácio Lula da Silva...",
  "timestamp": "15 de January de 2025 às 14:30",
  "realTime": false
}
```

### GET `/api/health`
Verifica status do servidor

### GET `/api/sources`
Lista fontes oficiais

### POST `/api/cache/clear`
Limpa o cache

## 🎨 Interface

### Componentes Principais

**Chat.jsx**
- Interface de chat interativa
- Detecção automática de políticos
- Histórico de conversação
- Loading states

**HexagonalChart.jsx**
- Canvas renderizado
- 6 pontos de avaliação
- Cores categorizadas
- Animação suave

**App.jsx**
- Orquestração de componentes
- Estado global
- Transições entre chat e análise

## 🎯 Funcionalidades Especiais

### Detecção Automática de Políticos

O sistema detecta automaticamente quando você menciona:
- Lula, Bolsonaro, Ciro Gomes, Marina Silva, Aécio Neves
- Cargos políticos: presidente, governador, senador, etc.
- Partidos: PT, PSDB, PSOL, etc.

### Análise Hexagonal

Para cada político, o sistema analisa:

**Pontos Avaliados (exemplos):**
- Experiência política
- Popularidade/Base eleitoral
- Transparência
- Relacionamento internacional
- Gestão de equipe
- Coalizões/alianças

**Visualização:**
- Hexágono com 6 vértices
- Cada vértice representa um aspecto
- Cores indicam: Forte (verde), Médio (amarelo), Fraca (vermelho)
- Percentuais visíveis
- Área preenchida mostra perfil geral

## 📦 Dependências

### Backend
- Go 1.21+
- github.com/gorilla/mux
- github.com/joho/godotenv

### Frontend
- Node.js 18+
- React 19+
- Vite 7+

## 🌐 Deploy

### Backend Go

```bash
# Build
go build -o chatbot-api

# Rodar
PORT=3000 GEMINI_API_KEY=sua_chave ./chatbot-api
```

### Frontend React

```bash
cd frontend
npm run build
# Serve a pasta dist/
```

### Deploy Integrado

O backend Go serve arquivos estáticos, então você pode fazer deploy simples:

1. Build do React: `npm run build`
2. Copiar `dist/` para `public/` do Go
3. Deploy do binário Go

### 🚀 Deploy no Google Cloud

#### Cloud Run (Recomendado)

**Método mais fácil - usando env.yaml:**

```bash
# 1. Configure o arquivo env.yaml
cp env.yaml.example env.yaml
# Edite env.yaml e adicione sua GEMINI_API_KEY

# 2. Deploy
gcloud run deploy chatbot-api \
  --source . \
  --env-vars-file env.yaml \
  --region us-central1 \
  --allow-unauthenticated

# Ou use o script automatizado:
# Linux/Mac: ./deploy-cloud-run.sh
# Windows: deploy-cloud-run.bat
```

**Método alternativo - variáveis diretas:**

```bash
# Deploy com variáveis de ambiente
gcloud run deploy chatbot-api \
  --source . \
  --set-env-vars GEMINI_API_KEY=sua_chave_aqui \
  --region us-central1 \
  --allow-unauthenticated

# Ou usando Secret Manager (mais seguro)
gcloud secrets create gemini-api-key --data-file=-
gcloud run deploy chatbot-api \
  --source . \
  --update-secrets GEMINI_API_KEY=gemini-api-key:latest \
  --region us-central1
```

📖 **Documentação completa**: Ver `cloud-run-config.md`

#### App Engine

1. Edite `app.yaml` e configure `GEMINI_API_KEY` (ou use Secret Manager)
2. Build do frontend: `cd frontend && npm run build && cp -r dist ../public`
3. Deploy: `gcloud app deploy`

📖 **Arquivo de configuração**: `app.yaml`

## 🔐 Variáveis de Ambiente

```bash
# .env
GEMINI_API_KEY=sua_chave_aqui  # Obrigatória
PORT=3000                       # Opcional (padrão: 3000)
```

## 📝 Scripts Disponíveis

### Backend
```bash
go run main.go       # Desenvolvimento
go build -o bot      # Build
go mod tidy          # Limpar dependências
```

### Frontend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run preview      # Preview build
npm run lint         # Lint
```

## 🐛 Troubleshooting

**Backend não inicia**
- Verifique se `GEMINI_API_KEY` está configurada no `.env`
- Certifique-se de que a porta 3000 está livre

**Frontend não conecta**
- Verifique se o backend está rodando
- Confirme o proxy em `vite.config.js`

**Gráfico não aparece**
- Mencione explicitamente um político na pergunta
- Verifique o console do navegador

**Build falha**
- Limpe cache: `rm -rf node_modules`
- Reinstale: `npm install`

## 📄 Licença

MIT

## 🙏 Créditos

- **Google Gemini AI** - Modelo de linguagem
- **Go** - Performance e eficiência
- **React** - Interface moderna
- **Vite** - Build tool rápida
- **Gorilla Mux** - Router HTTP

## 📊 Exemplo de Uso

```
Você: Me conte sobre o Lula

Assistente: Luiz Inácio Lula da Silva é um político brasileiro...

[Automaticamente mostra gráfico hexagonal]
┌─────────────────────────┐
│   Gráfico Hexagonal     │
│                         │
│     Experiência: 95% ✅│
│   Popularidade: 85% ✅ │
│  Transparência: 60% ⚖️│
│  Internacional: 70% ⚖️│
│      Gestão: 40% ⚠️   │
│    Coalizão: 50% ⚠️   │
└─────────────────────────┘
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir features
- Enviar pull requests
- Melhorar documentação

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

---

**Desenvolvido com ❤️ para transparência política e informação de qualidade**

#   P o l i t i c i a n I n s i g h t 
 
 
