# Chatbot Político - Frontend React

Interface moderna em React com visualização hexagonal de análise política.

## 🚀 Características

- 💬 **Chat Interativo**: Interface de chat moderna com mensagens em tempo real
- 📊 **Gráfico Hexagonal**: Visualização única de pontos fortes, médios e fracos de políticos
- 🎨 **Design Moderno**: Interface dark mode com gradientes e animações
- 📱 **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- ⚡ **Performance**: Otimizado com React e Vite
- 🔄 **Integração com API Go**: Conecta-se perfeitamente com o backend em Go

## 📦 Instalação

### Pré-requisitos

- Node.js 18+ instalado
- API Go rodando na porta 3000

### Passos

1. **Instale as dependências**

```bash
cd frontend
npm install
```

2. **Execute em modo desenvolvimento**

```bash
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

## 🏗️ Estrutura

```
frontend/
├── src/
│   ├── components/
│   │   ├── Chat.jsx              # Componente de chat
│   │   ├── Chat.css
│   │   ├── HexagonalChart.jsx    # Gráfico hexagonal
│   │   └── HexagonalChart.css
│   ├── App.jsx                   # Componente principal
│   ├── App.css                   # Estilos globais
│   ├── index.css                 # CSS base
│   └── main.jsx                  # Ponto de entrada
├── public/
├── index.html
├── vite.config.js               # Configuração Vite
└── package.json
```

## 🎯 Funcionalidades

### Chat Inteligente

- Envia perguntas sobre política brasileira
- Respostas geradas pela API Gemini via backend Go
- Histórico de conversação preservado
- Detecção automática de menções a políticos

### Gráfico Hexagonal

Quando você menciona um político específico, o sistema gera:

1. **Pontos Fortes** (Verde): Aspectos em que o político se destaca
2. **Pontos Médios** (Amarelo): Características com potencial de desenvolvimento
3. **Pontos Fracos** (Vermelho): Áreas que necessitam atenção

Cada ponto é visualizado em um hexágono interativo com:
- Labels descritivos
- Percentuais de performance
- Área colorida indicando o perfil geral
- Legenda interativa

### Políticos Suportados

- Lula
- Bolsonaro
- Ciro Gomes
- Marina Silva
- Aécio Neves

*Nota: Mais políticos podem ser adicionados facilmente*

## 🔧 Configuração

### Proxy da API

O Vite está configurado para fazer proxy das requisições para a API Go:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    }
  }
}
```

### Cores e Temas

As cores podem ser personalizadas em `src/index.css`:

```css
:root { 
  --bg: #0b1020;           /* Cor de fundo */
  --panel: #121a2e;        /* Painéis */
  --ink: #e7ecff;          /* Texto */
  --accent: #6ea8ff;       /* Destaques */
  --success: #4ade80;      /* Pontos fortes */
  --warning: #fbbf24;      /* Pontos médios */
  --error: #f87171;        /* Pontos fracos */
}
```

## 📝 Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Cria build de produção
npm run preview  # Preview do build de produção
npm run lint     # Executa linting
```

## 🎨 Componentes Principais

### Chat

Componente de chat com:
- Mensagens do usuário e assistente
- Loading indicators
- Scroll automático
- Input responsivo

### HexagonalChart

Visualização hexagonal com:
- Canvas renderizado
- 6 pontos de avaliação
- Cores categorizadas
- Labels e valores
- Animação suave

### App

Componente raiz que:
- Gerencia estado global
- Coordena chat e visualização
- Detecta consultas sobre políticos
- Exibe análise quando detectada

## 🚢 Deploy

### Build de Produção

```bash
npm run build
```

Isso gera uma pasta `dist/` otimizada para produção.

### Servir o Build

```bash
npm run preview
```

### Deploy Estático

O build pode ser servido por qualquer servidor web estático:

- Netlify
- Vercel
- GitHub Pages
- Firebase Hosting
- Azure Static Web Apps

## 🤝 Integração com Backend

O frontend espera que o backend Go esteja rodando e disponível em:

- URL: `http://localhost:3000`
- Endpoint Chat: `POST /api/chat`
- Endpoint Health: `GET /api/health`

Certifique-se de que a API Go esteja rodando antes de usar o frontend.

## 📱 Responsividade

O layout se adapta a diferentes tamanhos de tela:

- **Desktop**: Grid de 2 colunas para análise
- **Tablet**: Grid de 1 coluna empilhada
- **Mobile**: Layout otimizado com navegação simplificada

## 🐛 Troubleshooting

**Erro: "Failed to fetch"**
- Verifique se a API Go está rodando na porta 3000
- Confirme que o proxy está configurado em vite.config.js

**Gráfico não aparece**
- Certifique-se de mencionar um político específico na consulta
- Verifique o console do navegador para erros

**Build falha**
- Limpe o cache: `rm -rf node_modules .vite`
- Reinstale: `npm install`
- Tente novamente: `npm run build`

## 📄 Licença

MIT

## 🙏 Créditos

- React - Biblioteca UI
- Vite - Build tool
- Google Gemini AI - Geração de respostas
- Go Backend - API de chat
