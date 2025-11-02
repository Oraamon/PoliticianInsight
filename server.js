// server.js
// Node 18+ (fetch nativo). Se usar Node 16, instale `node-fetch`.
import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// Servir arquivos estáticos da pasta public
app.use(express.static("public"));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("Defina GEMINI_API_KEY no .env");
  process.exit(1);
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Cache simples para otimizar performance
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para gerar chave de cache
function generateCacheKey(query, context) {
  return `${query}_${JSON.stringify(context)}`;
}

// Função para verificar cache
function getFromCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[CACHE HIT] ${key.substring(0, 50)}...`);
    return cached.data;
  }
  if (cached) {
    cache.delete(key); // Remove cache expirado
  }
  return null;
}

// Função para salvar no cache
function saveToCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  console.log(`[CACHE SAVE] ${key.substring(0, 50)}...`);
}

/**
 * Prompt de sistema para manter neutralidade, transparência e foco em informação pública.
 * Atualizado para incluir dados em tempo real e informações atuais.
 */
const SYSTEM_INSTRUCTIONS = `
Você é um chatbot político neutro e informativo para o público brasileiro.
Princípios:
- Seja factual e forneça informações detalhadas sobre o tema perguntado.
- Explique o contexto, histórico e detalhes relevantes da pergunta.
- Não faça persuasão política personalizada. Não promova ou desincentive votos.
- Se houver desinformação potencial, aponte com respeito e ofereça verificação.
- Sempre termine sugerindo consultar sites oficiais para informações mais detalhadas.
Formato:
- Responda em português claro e detalhado.
- Forneça contexto histórico e informações completas sobre o tema.
- Sempre termine com: "Para informações mais detalhadas e atualizadas, recomendo consultar os sites oficiais: [lista de sites relevantes]"
- Inclua links de fontes oficiais quando apropriado (TSE, Planalto, Câmara, Senado, CNJ).
`;

// Função para buscar informações em tempo real
async function searchRealTimeInfo(query) {
  try {
    const currentDate = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Detecta se a pergunta requer dados em tempo real
    const realTimeKeywords = [
      'eleições', 'resultados', 'votação', 'candidatos', 'tse',
      'tramitação', 'projetos', 'leis', 'câmara', 'senado',
      'atual', 'recente', 'hoje', 'agora', 'último'
    ];
    
    const needsRealTime = realTimeKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
    
    if (needsRealTime) {
      // Aqui você pode integrar APIs reais:
      // - TSE API para dados eleitorais
      // - APIs da Câmara/Senado para tramitação
      // - APIs de notícias para informações recentes
      
      console.log(`[TEMPO REAL] Buscando dados atualizados para: ${query.substring(0, 50)}...`);
      
      // Simulação de busca em APIs (substitua por APIs reais)
      const realTimeData = await fetchRealTimeData(query);
      
      return {
        timestamp: currentDate,
        realTime: true,
        data: realTimeData,
        sources: [
          "TSE: https://www.tse.jus.br/",
          "Planalto: https://www.planalto.gov.br/",
          "Câmara: https://www.camara.leg.br/",
          "Senado: https://www25.senado.leg.br/",
          "CNJ: https://www.cnj.jus.br/"
        ]
      };
    }
    
    return {
      timestamp: currentDate,
      realTime: false,
      sources: [
        "TSE: https://www.tse.jus.br/",
        "Planalto: https://www.planalto.gov.br/",
        "Câmara: https://www.camara.leg.br/",
        "Senado: https://www25.senado.leg.br/"
      ]
    };
  } catch (error) {
    console.error("Erro ao buscar informações em tempo real:", error);
    return null;
  }
}

// Função para buscar dados em tempo real (implementar com APIs reais)
async function fetchRealTimeData(query) {
  try {
    // Exemplo de integração com APIs reais:
    
    // 1. TSE API (dados eleitorais)
    if (query.toLowerCase().includes('eleições') || query.toLowerCase().includes('tse')) {
      // const tseResponse = await fetch('https://api.tse.jus.br/...');
      // return await tseResponse.json();
    }
    
    // 2. Câmara API (tramitação de projetos)
    if (query.toLowerCase().includes('câmara') || query.toLowerCase().includes('tramitação')) {
      // const camaraResponse = await fetch('https://dadosabertos.camara.leg.br/api/v2/...');
      // return await camaraResponse.json();
    }
    
    // 3. Senado API
    if (query.toLowerCase().includes('senado')) {
      // const senadoResponse = await fetch('https://legis.senado.leg.br/dadosabertos/...');
      // return await senadoResponse.json();
    }
    
    // Por enquanto, retorna dados simulados
    return {
      lastUpdate: new Date().toISOString(),
      note: "Dados simulados - implemente APIs reais conforme necessário"
    };
    
  } catch (error) {
    console.error("Erro ao buscar dados em tempo real:", error);
    return null;
  }
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, context = [] } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Campo 'message' é obrigatório." });
    }

    // Verifica cache primeiro
    const cacheKey = generateCacheKey(message, context);
    const cachedResponse = getFromCache(cacheKey);
    
    if (cachedResponse) {
      return res.json({
        ...cachedResponse,
        cached: true
      });
    }

    // Busca informações em tempo real se necessário
    const realTimeInfo = await searchRealTimeInfo(message);
    const currentTimestamp = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Constrói o "history" para gemini: system + turns anteriores + nova pergunta
    const contents = [];

    // Instruções de sistema (vai como primeira mensagem)
    contents.push({
      role: "user",
      parts: [{ text: `INSTRUÇÕES DO SISTEMA:\n${SYSTEM_INSTRUCTIONS}` }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "Entendido. Vou seguir essas instruções e usar informações atualizadas." }],
    });

    // Contexto de turns anteriores (opcional)
    for (const turn of context) {
      if (turn.role === "user") {
        contents.push({ role: "user", parts: [{ text: turn.text }] });
      } else if (turn.role === "assistant") {
        contents.push({ role: "model", parts: [{ text: turn.text }] });
      }
    }

    // Pergunta atual
    contents.push({ role: "user", parts: [{ text: message }] });

    // Chamada à API do Gemini
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erro na API Gemini:", errText);
      return res
        .status(response.status)
        .json({ error: "Erro na API Gemini", detail: errText });
    }

    const data = await response.json();
    // A resposta geralmente vem em data.candidates[0].content.parts[0].text
    const candidate = data?.candidates?.[0];
    let text =
      candidate?.content?.parts?.map((p) => p?.text).filter(Boolean).join("\n") ||
      "Não consegui gerar uma resposta.";


    // Log da interação (opcional, para monitoramento)
    console.log(`[${currentTimestamp}] Pergunta: ${message.substring(0, 100)}...`);
    console.log(`[${currentTimestamp}] Resposta: ${text.substring(0, 100)}...`);

    const chatResponse = { 
      reply: text,
      timestamp: currentTimestamp,
      realTime: !!realTimeInfo
    };

    // Salva no cache (exceto para dados em tempo real)
    if (!realTimeInfo?.realTime) {
      saveToCache(cacheKey, chatResponse);
    }

    return res.json(chatResponse);
  } catch (e) {
    console.error("Erro interno:", e);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// Rota de health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    cache: {
      size: cache.size,
      maxAge: CACHE_DURATION
    }
  });
});

// Rota para verificar fontes em tempo real
app.get("/api/sources", (req, res) => {
  const sources = {
    oficiais: [
      {
        nome: "Tribunal Superior Eleitoral (TSE)",
        url: "https://www.tse.jus.br/",
        descricao: "Dados eleitorais, candidatos e resultados"
      },
      {
        nome: "Câmara dos Deputados",
        url: "https://www.camara.leg.br/",
        descricao: "Projetos de lei, tramitação e deputados"
      },
      {
        nome: "Senado Federal",
        url: "https://www25.senado.leg.br/",
        descricao: "Proposições, senadores e tramitação"
      },
      {
        nome: "Presidência da República",
        url: "https://www.planalto.gov.br/",
        descricao: "Leis, decretos e atos normativos"
      },
      {
        nome: "Conselho Nacional de Justiça (CNJ)",
        url: "https://www.cnj.jus.br/",
        descricao: "Normas judiciais e jurisprudência"
      }
    ],
    apis: [
      {
        nome: "Dados Abertos - Câmara",
        url: "https://dadosabertos.camara.leg.br/",
        descricao: "API para dados da Câmara dos Deputados"
      },
      {
        nome: "Dados Abertos - Senado",
        url: "https://legis.senado.leg.br/dadosabertos/",
        descricao: "API para dados do Senado Federal"
      }
    ],
    verificacao: [
      {
        nome: "Agência Lupa",
        url: "https://piaui.folha.uol.com.br/lupa/",
        descricao: "Verificação de fatos e checagem"
      },
      {
        nome: "Aos Fatos",
        url: "https://www.aosfatos.org/",
        descricao: "Verificação de informações"
      }
    ]
  };
  
  res.json({
    timestamp: new Date().toISOString(),
    sources
  });
});

// Rota para limpar cache
app.post("/api/cache/clear", (req, res) => {
  const beforeSize = cache.size;
  cache.clear();
  res.json({
    message: "Cache limpo com sucesso",
    beforeSize,
    afterSize: cache.size,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
);
