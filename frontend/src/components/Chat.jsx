import { useEffect, useRef, useState, Suspense, lazy } from 'react';
import './Chat.css';

const HexagonalChart = lazy(() => import('./HexagonalChart'));
const InsightsOverview = lazy(() => import('./InsightsOverview'));
const NPSSurvey = lazy(() => import('./NPSSurvey'));

const SUGGESTIONS_COUNT = 3;

const ALL_SUGGESTIONS = Object.freeze([
  'Quem é o presidente atual do Brasil?',
  'Explique sobre o sistema eleitoral brasileiro',
  'Fale sobre os poderes executivo, legislativo e judiciário',
  'Análise do perfil político do Lula',
  'Mostre o gráfico do Bolsonaro',
  'O que é uma PEC?',
  'Como funciona o voto no Brasil?',
  'Quais são os partidos políticos brasileiros?',
  'Explique sobre impeachment',
  'O que é o STF?',
  'Análise do perfil político do Ciro Gomes',
  'Como funciona o Senado?',
  'O que é a Câmara dos Deputados?',
  'Explique sobre o mandato presidencial',
  'Quem pode ser presidente?',
  'Análise do perfil político da Marina Silva'
]);

const GENERIC_NAMES = new Set([
  'político',
  'como',
  'explique',
  'fale',
  'conte',
  'diga',
  'sistema',
  'senado',
  'câmara',
  'camara',
  'congresso',
  'brasil',
  'federal'
]);

const COMMON_WORDS = new Set([
  'como',
  'o',
  'a',
  'os',
  'as',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'para',
  'sobre',
  'com',
  'explique',
  'fale',
  'conte',
  'diga',
  'informe',
  'quem',
  'qual',
  'quais',
  'onde',
  'quando',
  'porque',
  'por',
  'que',
  'senado',
  'câmara',
  'camara',
  'congresso',
  'brasil',
  'brasileiro',
  'brasileiros',
  'federal',
  'nacional',
  'republica',
  'presidente',
  'governador',
  'sistema'
]);

const CHART_PROMISES = Object.freeze([
  'gráfico será gerado',
  'grafico será gerado',
  'gráfico será apresentado',
  'grafico será apresentado',
  'gerar gráfico',
  'gerar grafico',
  'apresentar gráfico',
  'apresentar grafico',
  'gráfico hexagonal',
  'grafico hexagonal',
  'gráfico com',
  'grafico com',
  'a seguir, apresentarei um gráfico',
  'seguir, apresentarei um grafico',
  'apresentarei um gráfico',
  'apresentarei um grafico',
  'gráfico visando fornecer',
  'grafico visando fornecer',
  'aguarde enquanto o gráfico',
  'aguarde enquanto o grafico'
]);

const ANALYSIS_KEYWORDS = new Set([
  'gráfico',
  'grafico',
  'chart',
  'análise',
  'analise',
  'perfil',
  'dê',
  'de',
  'mostre',
  'mostra'
]);

const KNOWN_POLITICIAN_ALIASES = new Map([
  ['lula', 'Lula'],
  ['luiz inácio lula', 'Lula'],
  ['luiz inacio lula', 'Lula'],
  ['luiz inácio lula da silva', 'Lula'],
  ['luiz inacio lula da silva', 'Lula'],
  ['lula da silva', 'Lula'],
  ['bolsonaro', 'Bolsonaro'],
  ['jair bolsonaro', 'Bolsonaro'],
  ['ciro', 'Ciro Gomes'],
  ['ciro gomes', 'Ciro Gomes'],
  ['marina', 'Marina Silva'],
  ['marina silva', 'Marina Silva'],
  ['aecio', 'Aécio Neves'],
  ['aécio neves', 'Aécio Neves'],
  ['temer', 'Michel Temer'],
  ['michel temer', 'Michel Temer'],
  ['dilma', 'Dilma Rousseff'],
  ['dilma rousseff', 'Dilma Rousseff'],
  ['doria', 'João Doria'],
  ['joão doria', 'João Doria'],
  ['joao doria', 'João Doria'],
  ['haddad', 'Fernando Haddad'],
  ['fernando haddad', 'Fernando Haddad'],
  ['boulos', 'Guilherme Boulos'],
  ['guilherme boulos', 'Guilherme Boulos'],
  ['freixo', 'Marcelo Freixo'],
  ['marcelo freixo', 'Marcelo Freixo'],
  ['collor', 'Fernando Collor'],
  ['fernando collor', 'Fernando Collor'],
  ['tasso', 'Tasso Jereissati'],
  ['tasso jereissati', 'Tasso Jereissati'],
  ['barbosa', 'Joaquim Barbosa'],
  ['joaquim barbosa', 'Joaquim Barbosa']
]);

const ASSISTANT_NAME = 'ÁgoraAI';

const pickRandomSuggestions = () => {
  const shuffled = [...ALL_SUGGESTIONS];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, SUGGESTIONS_COUNT);
};

const matchKnownPolitician = (text) => {
  const lowerText = text.toLowerCase();
  for (const [alias, name] of KNOWN_POLITICIAN_ALIASES.entries()) {
    if (lowerText.includes(alias)) {
      return name;
    }
  }
  return null;
};

const isGenericName = (name) => {
  if (!name) return true;
  return GENERIC_NAMES.has(name.toLowerCase());
};

const containsKnownPolitician = (text) => Boolean(matchKnownPolitician(text));

const Chat = ({ currentChatId, setCurrentChatId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const prevChatIdRef = useRef(null);
  const [showNpsSurvey, setShowNpsSurvey] = useState(false);
  const npsTimeoutRef = useRef(null);
  const lastAssistantResponseRef = useRef(null);

  const [displayedSuggestions, setDisplayedSuggestions] = useState(() => pickRandomSuggestions());

  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      // Scroll para o final (parte inferior)
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Salva mensagens do chat anterior ANTES de mudar de chat
  useEffect(() => {
    // Este useEffect só deve executar quando currentChatId muda
    // Antes de mudar, salva as mensagens do chat anterior se existirem
    const prevChatId = prevChatIdRef.current;
    
    // Se mudou de chat e havia um chat anterior, salva suas mensagens
    if (prevChatId && prevChatId !== currentChatId) {
      // Busca as mensagens salvas do chat anterior para garantir que não perdemos nada
      try {
        const savedMessages = localStorage.getItem(`chat_${prevChatId}`);
        // Se há mensagens no estado atual e não havia mensagens salvas, ou se as mensagens atuais são diferentes
        // Salva as mensagens do estado atual no chat anterior
        if (messages.length > 0) {
          const currentMessagesStr = JSON.stringify(messages);
          // Só salva se as mensagens são diferentes das já salvas
          if (savedMessages !== currentMessagesStr) {
            localStorage.setItem(`chat_${prevChatId}`, currentMessagesStr);
          }
        }
      } catch (error) {
        // Erro ao salvar mensagens do chat anterior
      }
    }
    
    // Atualiza a referência do chatId anterior DEPOIS de salvar
    prevChatIdRef.current = currentChatId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChatId]);

  // Carrega mensagens quando recebe evento de loadChat
  useEffect(() => {
    const handleLoadChat = (event) => {
      const { chatId, messages: loadedMessages } = event.detail;
      // Verifica se o chatId do evento corresponde ao currentChatId atual
      if (chatId === currentChatId || (!chatId && !currentChatId)) {
        if (loadedMessages && Array.isArray(loadedMessages) && loadedMessages.length > 0) {
          setMessages(loadedMessages);
        } else {
          setMessages([]);
        }
      }
    };

    window.addEventListener('loadChat', handleLoadChat);
    
    // Carrega mensagens diretamente quando currentChatId muda
    if (currentChatId) {
      try {
        const savedMessages = localStorage.getItem(`chat_${currentChatId}`);
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            setMessages(parsedMessages);
          } else {
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
      } catch (error) {
        setMessages([]);
      }
    } else {
      // Limpa mensagens quando currentChatId é null (novo chat)
      setMessages([]);
    }
    
    return () => window.removeEventListener('loadChat', handleLoadChat);
  }, [currentChatId]);

  // Salva mensagens no localStorage quando mudarem (mas só se o chatId atual corresponder)
  useEffect(() => {
    // Só salva se as mensagens não estão vazias e há um currentChatId válido
    if (messages.length > 0 && currentChatId) {
      // Aguarda um pequeno delay para garantir que não estamos em transição de chat
      const timeoutId = setTimeout(() => {
        // Sempre usa currentChatId diretamente para garantir salvamento
        if (messages.length > 0 && currentChatId) {
          try {
            localStorage.setItem(`chat_${currentChatId}`, JSON.stringify(messages));
          } catch (error) {
            // Erro ao salvar mensagens
          }
        }
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, currentChatId]);

  // Atualiza sugestões quando não há mensagens
  useEffect(() => {
    if (messages.length === 0) {
      setDisplayedSuggestions(pickRandomSuggestions());
    }
  }, [messages.length]);

  // Controla exibição do NPS: mostra 10 segundos após resposta do assistente e esconde se já foi respondido
  // IMPORTANTE: O feedback aparece apenas UMA VEZ por pessoa - se já foi respondido, nunca aparece novamente
  useEffect(() => {
    // Verifica se já foi respondido (uma vez respondido, nunca aparece novamente)
    const checkNpsSubmitted = () => {
      try {
        const npsData = localStorage.getItem('agoraai-nps-v1');
        if (npsData) {
          const parsed = JSON.parse(npsData);
          return Boolean(parsed.submitted);
        }
      } catch (error) {
        // Erro ao verificar, assume que não foi submetido
      }
      return false;
    };

    // Se já foi respondido, nunca mostra o feedback novamente
    if (checkNpsSubmitted()) {
      setShowNpsSurvey(false);
      if (npsTimeoutRef.current) {
        clearTimeout(npsTimeoutRef.current);
        npsTimeoutRef.current = null;
      }
      return;
    }

    // Verifica última mensagem do assistente
    const assistantMessages = messages.filter(msg => msg.role === 'assistant' && msg.content !== 'analysis');
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
    
    if (lastAssistantMessage) {
      // Cria um identificador único baseado no conteúdo e índice
      const messageId = `${lastAssistantMessage.role}_${assistantMessages.length}_${lastAssistantMessage.content?.substring(0, 50) || ''}`;
      
      // Se é uma nova resposta do assistente (diferente da última que rastreamos)
      if (lastAssistantResponseRef.current !== messageId) {
        lastAssistantResponseRef.current = messageId;
        
        // Limpa timeout anterior se existir
        if (npsTimeoutRef.current) {
          clearTimeout(npsTimeoutRef.current);
          npsTimeoutRef.current = null;
        }
        
        // Esconde o NPS imediatamente quando nova resposta chega
        setShowNpsSurvey(false);
        
        // Verifica novamente se não foi respondido (para garantir)
        if (!checkNpsSubmitted()) {
          // Mostra após 10 segundos
          npsTimeoutRef.current = setTimeout(() => {
            // Verifica novamente se não foi respondido enquanto esperava
            // (pode ter sido respondido durante os 10 segundos)
            if (!checkNpsSubmitted()) {
              setShowNpsSurvey(true);
            }
          }, 10000); // 10 segundos
        }
      }
    } else {
      // Se não há mensagem do assistente, esconde o NPS
      setShowNpsSurvey(false);
      if (npsTimeoutRef.current) {
        clearTimeout(npsTimeoutRef.current);
        npsTimeoutRef.current = null;
      }
    }

    // Cleanup
    return () => {
      if (npsTimeoutRef.current) {
        clearTimeout(npsTimeoutRef.current);
        npsTimeoutRef.current = null;
      }
    };
  }, [messages]);

  // Monitora quando o NPS é submetido e esconde o survey permanentemente
  // Uma vez respondido, o feedback nunca aparece novamente
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'agoraai-nps-v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.submitted) {
            // Uma vez submetido, esconde permanentemente
            setShowNpsSurvey(false);
            // Limpa timeout se ainda estiver aguardando
            if (npsTimeoutRef.current) {
              clearTimeout(npsTimeoutRef.current);
              npsTimeoutRef.current = null;
            }
            // Limpa a referência para que não tente mostrar novamente
            lastAssistantResponseRef.current = null;
          }
        } catch (error) {
          // Erro ao parsear
        }
      }
    };

    // Verifica se já foi submetido ao montar
    // Se já foi respondido uma vez, nunca mostra novamente
    try {
      const npsData = localStorage.getItem('agoraai-nps-v1');
      if (npsData) {
        const parsed = JSON.parse(npsData);
        if (parsed.submitted) {
          setShowNpsSurvey(false);
          // Limpa qualquer timeout pendente
          if (npsTimeoutRef.current) {
            clearTimeout(npsTimeoutRef.current);
            npsTimeoutRef.current = null;
          }
          // Limpa a referência para que não tente mostrar novamente
          lastAssistantResponseRef.current = null;
        }
      }
    } catch (error) {
      // Erro ao verificar
    }

    // Escuta mudanças no localStorage (para outras abas)
    window.addEventListener('storage', handleStorageChange);
    
    // Também verifica periodicamente (para mudanças na mesma aba)
    const interval = setInterval(() => {
      try {
        const npsData = localStorage.getItem('agoraai-nps-v1');
        if (npsData) {
          const parsed = JSON.parse(npsData);
          // Se foi submetido, esconde permanentemente e cancela qualquer timer
          if (parsed.submitted) {
            setShowNpsSurvey(false);
            if (npsTimeoutRef.current) {
              clearTimeout(npsTimeoutRef.current);
              npsTimeoutRef.current = null;
            }
            // Limpa a referência para que não tente mostrar novamente
            lastAssistantResponseRef.current = null;
          }
        }
      } catch (error) {
        // Erro ao verificar
      }
    }, 1000); // Verifica a cada segundo

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Prepara o contexto das mensagens anteriores para enviar à API
  const prepareContext = (currentMessages) => {
    // Filtra mensagens válidas para contexto (exclui análises e limita quantidade)
    const validMessages = currentMessages
      .filter(msg => {
        // Exclui mensagens de análise e mensagens vazias
        return msg.content !== 'analysis' && msg.content && typeof msg.content === 'string' && msg.content.trim();
      })
      .slice(-20); // Limita a 20 mensagens mais recentes para não sobrecarregar a API
    
    // Converte para o formato esperado pela API (Go backend usa 'content', mas aceita 'text' também)
    return validMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
      text: msg.content // Mantém para compatibilidade
    }));
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    
    // Cria um novo chat se não existir
    let chatId = currentChatId;
    if (!chatId) {
      chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (setCurrentChatId) {
        setCurrentChatId(chatId);
      }
      
      // Atualiza prevChatIdRef imediatamente para garantir salvamento
      prevChatIdRef.current = chatId;
      
      // Adiciona ao histórico
      const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      chatHistory.push({
        id: chatId,
        title: userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage,
        firstMessage: userMessage,
        timestamp: Date.now()
      });
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
      
      // Dispara evento para atualizar sidebar
      window.dispatchEvent(new Event('chatUpdated'));
    }
    
    setInput('');
    setLoading(true);

    // Prepara o contexto das mensagens anteriores (ANTES de adicionar a mensagem atual)
    const context = prepareContext(messages);
    
    // Adiciona a mensagem do usuário imediatamente e salva no localStorage
    const userMessageObj = { role: 'user', content: userMessage };
    const newMessagesWithUser = [...messages, userMessageObj];
    
    // Salva IMEDIATAMENTE no localStorage antes de atualizar o estado
    if (chatId) {
      try {
        localStorage.setItem(`chat_${chatId}`, JSON.stringify(newMessagesWithUser));
      } catch (error) {
        // Erro ao salvar mensagem do usuário
      }
    }
    
    // Atualiza o estado
    setMessages(newMessagesWithUser);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          context: context
        })
      });

      const data = await response.json();

      if (data.reply) {
        const assistantMessageObj = { role: 'assistant', content: data.reply };
        const newMessagesWithAssistant = [...newMessagesWithUser, assistantMessageObj];
        
        // Salva IMEDIATAMENTE no localStorage antes de atualizar o estado
        if (chatId) {
          try {
            localStorage.setItem(`chat_${chatId}`, JSON.stringify(newMessagesWithAssistant));
          } catch (error) {
            // Erro ao salvar mensagem do assistente
          }
        }
        
        // Atualiza o estado
        setMessages(newMessagesWithAssistant);
        
        // Verifica se deve gerar gráfico, considerando o contexto das mensagens anteriores
        // Usa as mensagens anteriores + a nova mensagem do usuário + a resposta do assistente
        const messagesWithUser = [...messages, userMessageObj];
        const messagesWithBoth = [...messagesWithUser, assistantMessageObj];
        
        // Verifica se o assistente prometeu gerar um gráfico na resposta
        const assistantPromisedChart = checkIfAssistantPromisedChart(data.reply);
        
        // Verifica se é uma pergunta sobre político (com ou sem palavras-chave de gráfico)
        const shouldGenerateChart = isPoliticianQuery(userMessage, messagesWithBoth) || assistantPromisedChart;
        
        if (shouldGenerateChart) {
          // Tenta extrair nome do político da mensagem atual
          // Primeiro tenta com lista conhecida
          let detectedName = extractPoliticianName(userMessage);
          
          // Se não encontrou na lista conhecida, tenta extrair nome próprio quando há palavras-chave de gráfico/análise
          if (!detectedName) {
            detectedName = extractPoliticianNameFromQuery(userMessage);
          }
          
          // Se ainda não encontrou, procura no contexto (incluindo mensagem do assistente)
          if (!detectedName) {
            detectedName = extractPoliticianNameFromContext(messagesWithBoth, userMessage);
          }
          
          // Se o assistente prometeu gráfico, tenta extrair nome da resposta do assistente também
          if (!detectedName && assistantPromisedChart) {
            detectedName = extractPoliticianNameFromAssistantResponse(data.reply);
          }
          
          // Só gera gráfico se detectou um nome válido (não genérico nem palavra comum)
          if (detectedName && !isGenericName(detectedName)) {
            // Passa o histórico completo incluindo a resposta do assistente para melhor detecção
            generateAnalysis(userMessage, detectedName, messagesWithBoth);
          }
        }
      } else {
        const errorMessageObj = { role: 'assistant', content: 'Desculpe, não consegui processar sua mensagem. Tente novamente.' };
        const newMessagesWithError = [...newMessagesWithUser, errorMessageObj];
        
        // Salva no localStorage
        if (chatId) {
          try {
            localStorage.setItem(`chat_${chatId}`, JSON.stringify(newMessagesWithError));
          } catch (error) {
            // Erro ao salvar mensagem de erro
          }
        }
        
        setMessages(newMessagesWithError);
      }
    } catch (error) {
      const errorMessageObj = { role: 'assistant', content: 'Erro ao conectar com o servidor. Verifique sua conexão.' };
      const newMessagesWithNetworkError = [...newMessagesWithUser, errorMessageObj];
      
      // Salva no localStorage
      if (chatId) {
        try {
          localStorage.setItem(`chat_${chatId}`, JSON.stringify(newMessagesWithNetworkError));
        } catch (err) {
          // Erro ao salvar mensagem de erro de rede
        }
      }
      
      setMessages(newMessagesWithNetworkError);
    } finally {
      setLoading(false);
    }
  };

  // Extrai nome de político do contexto das mensagens anteriores
  const extractPoliticianNameFromContext = (messageHistory, currentQuery) => {
    const recentMessages = messageHistory.slice(-10).reverse();
    for (const msg of recentMessages) {
      if (!msg.content || typeof msg.content !== 'string') {
        continue;
      }

      const known = matchKnownPolitician(msg.content);
      if (known) {
        return known;
      }

      if (msg.role === 'user') {
        const extracted = extractPoliticianName(msg.content);
        if (extracted) {
          return extracted;
        }
      }
    }

    if (typeof currentQuery === 'string') {
      return matchKnownPolitician(currentQuery);
    }

    return null;
  };

  // Verifica se o assistente prometeu gerar um gráfico na resposta
  const checkIfAssistantPromisedChart = (assistantReply) => {
    if (!assistantReply) return false;

    const lowerReply = assistantReply.toLowerCase();
    return CHART_PROMISES.some((promise) => lowerReply.includes(promise));
  };

  // Extrai nome de político da resposta do assistente
  const extractPoliticianNameFromAssistantResponse = (reply) => {
    if (!reply) return null;
    
    // Procura por padrões como "nome completo" seguido de palavras como deputado, senador, etc.
    const patterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:é|foi|será|tem|tinha|atua como|faz|fez)(?:\s+um)?(?:\s+)(?:deputado|senador|presidente|governador|prefeito|vereador)/i,
      /(?:deputado|senador|presidente|governador|prefeito|vereador)(?:\s+(?:federal|estadual|municipal))?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s+(?:é|foi))(?:\s+um)?(?:\s+)(?:deputado|senador)/i
    ];
    
    for (const pattern of patterns) {
      const match = reply.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Verifica se não é palavra comum
        const normalized = name.toLowerCase();
        if (!COMMON_WORDS.has(normalized) && name.length > 3) {
          return name;
        }
      }
    }
    
    return null;
  };

  // Extrai nome próprio da query quando há palavras-chave de gráfico/análise ou menção a cargo político
  const extractPoliticianNameFromQuery = (query) => {
    const lowerQuery = query.toLowerCase();
    
    // Padrões que indicam pedido de gráfico/análise seguido de nome
    const patterns = [
      // "me dê um gráfico de Evandro Leitão"
      /\b(?:me\s+)?(?:dê|de|mostre|mostra|me\s+mostre|me\s+mostra|quero\s+ver|veja)\s+(?:um|o|a)?\s*(?:gráfico|grafico|chart|análise|perfil)\s+(?:de|do|da|sobre)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // "gráfico de Evandro Leitão"
      /\b(?:gráfico|grafico|chart|análise|perfil)\s+(?:de|do|da|sobre)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // "Evandro Leitão" (quando há palavra de gráfico antes)
      /\b(?:me\s+)?(?:dê|de|mostre|mostra|me\s+mostre|me\s+mostra|quero\s+ver|veja)\s+(?:um|o|a)?\s*(?:gráfico|grafico|chart|análise|perfil)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // "o que André Fernandes fez como deputado"
      /\b(?:o\s+que|quem|qual|quais)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:fez|faz|fez e está fazendo|fez e está|fez como|faz como|é|foi)\s+(?:como|um|um?)\s*(?:deputado|senador|presidente|governador|prefeito|vereador)/i,
      // "André Fernandes é deputado"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:é|foi|será|tem|tinha|atua como|faz|fez)(?:\s+um)?(?:\s+)(?:deputado|senador|presidente|governador|prefeito|vereador)/i,
      // "deputado André Fernandes"
      /(?:deputado|senador|presidente|governador|prefeito|vereador)(?:\s+(?:federal|estadual|municipal))?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // "quem é André Fernandes"
      /\b(?:quem|qual)\s+(?:é|foi|será)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        const nameLower = name.toLowerCase();
        if (!COMMON_WORDS.has(nameLower)) {
          // Verifica se tem pelo menos duas palavras (nome próprio) ou uma palavra com mais de 3 caracteres
          const nameWords = name.split(/\s+/);
          if (nameWords.length >= 2 || (nameWords.length === 1 && nameWords[0].length > 3)) {
            return name;
          }
        }
      }
    }
    
    // Fallback: procura por nomes próprios capitalizados após palavras-chave de gráfico/análise
    const words = query.split(/\s+/);
    const analysisKeywordIndices = [];
    
    // Encontra índices das palavras-chave de análise/gráfico
    words.forEach((word, index) => {
      const lowerWord = word.toLowerCase().replace(/[.,!?;:]$/, '');
      if (ANALYSIS_KEYWORDS.has(lowerWord)) {
        analysisKeywordIndices.push(index);
      }
    });
    
    // Para cada palavra-chave encontrada, procura nomes próprios próximos
    for (const idx of analysisKeywordIndices) {
      // Procura nas próximas 3 palavras após a palavra-chave
      for (let i = idx + 1; i < Math.min(idx + 4, words.length); i++) {
        const word = words[i].replace(/[.,!?;:]$/, '');
        // Verifica se é nome próprio (capitalizado e não é palavra comum)
        if (word.length > 2 && 
            word[0] === word[0].toUpperCase() && 
            word[0] !== word[0].toLowerCase()) {
          const lowerWord = word.toLowerCase();

          if (!COMMON_WORDS.has(lowerWord)) {
            // Tenta combinar com próxima palavra se também for capitalizada
            let fullName = word;
            if (i + 1 < words.length) {
              const nextWord = words[i + 1].replace(/[.,!?;:]$/, '');
              if (nextWord.length > 2 &&
                  nextWord[0] === nextWord[0].toUpperCase() &&
                  nextWord[0] !== nextWord[0].toLowerCase() &&
                  !COMMON_WORDS.has(nextWord.toLowerCase())) {
                fullName += ' ' + nextWord;
              }
            }
            return fullName;
          }
        }
      }
    }
    
    return null;
  };

  const isPoliticianQuery = (query, messageHistory = []) => {
    const lowerQuery = query.toLowerCase();
    
    // Palavras que indicam referência a contexto anterior (dele, dela, desse, etc)
    const contextReferences = ['dele', 'dela', 'desse', 'dessa', 'deles', 'delas', 'disso', 'dessa', 'o gráfico', 'o grafico'];
    const hasContextReference = contextReferences.some(ref => lowerQuery.includes(ref));
    
    // Palavras-chave que indicam interesse em ANÁLISE/AVALIAÇÃO do político
    const analysisKeywords = [
      'análise', 'avaliação', 'pontos', 'pontos fortes', 'pontos fracos', 'características',
      'perfil', 'avalie', 'analise', 'gráfico', 'grafico', 'chart', 'mostre', 'mostra',
      'dê', 'de', 'me dê', 'me de', 'me mostre', 'me mostra', 'quero ver', 'ver o', 'veja o'
    ];

    // Verifica se há palavras-chave de ANÁLISE explícitas
    const hasAnalysisIntent = analysisKeywords.some(keyword => lowerQuery.includes(keyword));

    // Verifica se há nomes conhecidos de políticos na query
    const hasPoliticianName = containsKnownPolitician(lowerQuery);
    
    // Se tem palavras-chave explícitas de gráfico/análise, tenta detectar nome próprio
    if (hasAnalysisIntent && !hasPoliticianName) {
      // Tenta extrair nome próprio da query quando há palavras-chave de gráfico/análise
      const detectedName = extractPoliticianNameFromQuery(query);
      if (detectedName) {
        // Se detectou um nome próprio válido com palavras-chave de análise, aceita
        return true;
      }
      
      // Se não detectou nome na query, verifica contexto
      if (hasContextReference) {
        const politicianFromContext = extractPoliticianNameFromContext(messageHistory, query);
        if (politicianFromContext) {
          return true;
        }
      }
      
      // Se não encontrou nome nem no contexto, não mostra gráfico
      return false;
    }
    
    // REGRA PRINCIPAL: Sempre exige que haja um político conhecido mencionado OU detectado no contexto
    // Se não tem nome de político na query, verifica contexto apenas se houver referências explícitas
    if (!hasPoliticianName) {
      // Verifica se a pergunta menciona cargos políticos (deputado, senador, etc.) - pode indicar pergunta sobre político específico
      const politicalRoles = ['deputado', 'senador', 'presidente', 'governador', 'prefeito', 'vereador', 'ministro'];
      const hasPoliticalRole = politicalRoles.some(role => lowerQuery.includes(role));
      
      // Se menciona cargo político, tenta extrair nome próprio
      if (hasPoliticalRole) {
        const detectedName = extractPoliticianNameFromQuery(query);
        if (detectedName) {
          return true;
        }
      }
      
      // Só verifica contexto se houver referência explícita (dele, dela, o gráfico, etc.)
      if (hasContextReference && hasAnalysisIntent) {
        const politicianFromContext = extractPoliticianNameFromContext(messageHistory, query);
        // Só retorna true se encontrou um político válido no contexto
        if (politicianFromContext) {
          return true;
        }
      }
      // Se não tem nome de político nem referência de contexto, não mostra gráfico
      return false;
    }
    
    // Se chegou aqui, TEM nome de político conhecido na query
    
    // Palavras que indicam pergunta sobre NOTÍCIA/AÇÃO (NÃO devem ativar gráfico)
    const newsActionKeywords = [
      'sanciona', 'sancionou', 'sanção', 'aprovou', 'aprova', 'autoriza', 'autorizou',
      'anuncia', 'anunciou', 'assina', 'assinou', 'publica', 'publicou', 'revoga',
      'revogou', 'cria', 'criou', 'extingue', 'extinguiu', 'regulamenta', 'regulamentou',
      'promulga', 'promulgou', 'veta', 'vetou', 'edita', 'editou', 'decreta', 'decretou',
      'lei', 'projeto', 'medida', 'provisória', 'mp', 'pl', 'plo', 'decreto', 'portaria',
      'em 2025', 'em 2024', 'em 2023', 'hoje', 'ontem', 'semana', 'mês', 'ano',
      'orçamento', 'fiscal', 'meta', 'piso', 'teto', 'gasto', 'receita', 'despesa'
    ];
    
    // Se a pergunta contém palavras de notícia/ação, provavelmente é sobre ação política, não análise
    if (newsActionKeywords.some(keyword => lowerQuery.includes(keyword))) {
      // Mas verifica se também tem palavras de análise explícitas
      if (!hasAnalysisIntent) {
        return false; // É notícia/ação, não análise
      }
    }
    
    // REGRA: Se tem nome de político conhecido E palavra-chave de análise/gráfico, ativa
    if (hasPoliticianName && hasAnalysisIntent) {
      return true;
    }
    
    // Se tem nome de político mas não tem palavra explícita de análise, verifica contexto recente
    if (hasPoliticianName && !hasAnalysisIntent) {
      // Verifica se há menção de gráfico/análise nas mensagens anteriores recentes (últimas 5 mensagens)
      const recentMessages = messageHistory.slice(-5);
      const hasRecentAnalysisContext = recentMessages.some(msg => {
        if (!msg.content) return false;
        const content = msg.content.toLowerCase();
        return content.includes('gráfico') || content.includes('grafico') || 
               content.includes('análise') || content.includes('perfil') ||
               content.includes('mostre') || content.includes('mostra') ||
               content.includes('dê') || content.includes('me dê');
      });
      // Só retorna true se há contexto recente de análise
      return hasRecentAnalysisContext;
    }
    
    // Se não passou por nenhuma das condições acima, não mostra gráfico
    return false;
  };

  const extractPoliticianName = (query) => matchKnownPolitician(query);

  const generateAnalysis = (query, politicianName = null, messageHistory = null) => {
    let detectedPolitician = politicianName;
    const historyToUse = messageHistory || messages;
    
    // Se não recebeu nome, tenta extrair da query atual
    if (!detectedPolitician) {
      detectedPolitician = extractPoliticianName(query);
    }
    
    // Se ainda não encontrou, tenta no contexto das mensagens
    if (!detectedPolitician) {
      // Usa o histórico fornecido ou o estado atual de mensagens
      detectedPolitician = extractPoliticianNameFromContext(historyToUse, query);
    }
    
    // Verificação de segurança: não gera gráfico se o nome for genérico, palavra comum ou null
    if (!detectedPolitician || isGenericName(detectedPolitician)) {
      return; // Não gera gráfico se não identificou um político válido
    }

    // Gera o gráfico após um pequeno delay para melhor UX
    setTimeout(() => {
      const analysisData = {
        politician: detectedPolitician,
        data: generateHexagonalData(detectedPolitician)
      };
      const analysisMessage = {
        role: 'assistant',
        content: 'analysis',
        analysisData: analysisData
      };
      
      setMessages(prev => {
        const newMessages = [...prev, analysisMessage];
        // Salva também no localStorage
        if (currentChatId) {
          try {
            localStorage.setItem(`chat_${currentChatId}`, JSON.stringify(newMessages));
          } catch (error) {
            // Erro ao salvar mensagem de análise
          }
        }
        return newMessages;
      });
    }, 1500);
  };

  const generateHexagonalData = (politician) => {
    // Mesmos 6 pontos para todos os políticos (baseado no README)
    const basePoints = [
      { label: 'Experiência', value: 95 },
      { label: 'Popularidade', value: 85 },
      { label: 'Transparência', value: 60 },
      { label: 'Internacional', value: 70 },
      { label: 'Gestão', value: 40 },
      { label: 'Coalizão', value: 50 }
    ];

    // Ajustar valores baseado no político conhecido
    const politicianAdjustments = {
      'Lula': [0, 0, 0, 0, 0, 0], // Valores base já são do Lula
      'Bolsonaro': [-10, 5, -5, -10, 5, -5],
      'Ciro Gomes': [-5, -10, 10, 5, 10, -5],
      'Marina Silva': [-15, -15, 15, 10, 5, 5],
      'Aécio Neves': [-20, -20, -10, -5, -5, 0],
      'Michel Temer': [-5, -25, -5, 0, -5, 10],
      'Dilma Rousseff': [5, -15, 5, 5, 5, -10],
      'João Doria': [-25, -20, 5, -15, 0, -10],
      'Fernando Haddad': [-15, -20, 5, -10, -5, -5],
      'Guilherme Boulos': [-20, -15, 10, -20, -10, -15],
      'Marcelo Freixo': [-15, -10, 15, -15, -5, -10]
    };

    // Para políticos desconhecidos, gera valores baseados em hash do nome
    // Isso garante que o mesmo político sempre receba os mesmos valores
    let adjustments = politicianAdjustments[politician];
    
    if (!adjustments) {
      // Gera ajustes pseudoaleatórios baseados no nome (sempre os mesmos para o mesmo nome)
      const nameHash = politician.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      adjustments = [
        (nameHash % 30) - 15,      // -15 a 15
        ((nameHash * 2) % 30) - 15,
        ((nameHash * 3) % 30) - 15,
        ((nameHash * 4) % 30) - 15,
        ((nameHash * 5) % 30) - 15,
        ((nameHash * 6) % 30) - 15
      ];
    }

    // Função para determinar categoria baseada no valor
    const getCategory = (value) => {
      if (value >= 70) return 'forte';
      if (value >= 50) return 'medio';
      return 'fraco';
    };

    return basePoints.map((point, index) => {
      const adjustedValue = Math.max(0, Math.min(100, point.value + adjustments[index]));
      return {
        label: point.label,
        value: adjustedValue,
        category: getCategory(adjustedValue)
      };
    });
  };

  const formatMessage = (text) => {
    if (!text) return '';
    
    let formatted = text;
    
    const lines = formatted.split('\n');
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('*   ')) {
        const content = trimmed.substring(4);
        return `&nbsp;&nbsp;• ${content}`;
      }
      return line;
    });
    formatted = formattedLines.join('\n');
    
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    formatted = formatted.replace(/\n/g, '<br />');
    
    return formatted;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Conta mensagens do usuário
  const userMessageCount = messages.filter(msg => msg.role === 'user').length;
  const showHeader = userMessageCount === 0;
  const showSuggestions = userMessageCount === 0;


  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  return (
    <div className="chat-container">
      {showHeader && (
        <div className="chat-header">
          <div className="chat-header-svg">
            <svg width="36" height="38" viewBox="0 0 36 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.5 16.8281C10.5 16.8281 11.0793 22.2355 13.336 24.4921C15.5926 26.7487 21 27.3281 21 27.3281C21 27.3281 15.5926 27.9074 13.336 30.164C11.0793 32.4206 10.5 37.8281 10.5 37.8281C10.5 37.8281 9.92066 32.4206 7.66405 30.164C5.40743 27.9074 0 27.3281 0 27.3281C0 27.3281 5.40743 26.7487 7.66405 24.4921C9.92066 22.2355 10.5 16.8281 10.5 16.8281Z" fill="currentColor"/>
              <path d="M25.5 7.91403C25.5 7.91403 26.0793 13.3215 28.336 15.5781C30.5926 17.8347 36 18.414 36 18.414C36 18.414 30.5926 18.9934 28.336 21.25C26.0793 23.5066 25.5 28.914 25.5 28.914C25.5 28.914 24.9207 23.5066 22.664 21.25C20.4074 18.9934 15 18.414 15 18.414C15 18.414 20.4074 17.8347 22.664 15.5781C24.9207 13.3215 25.5 7.91403 25.5 7.91403Z" fill="currentColor"/>
              <path d="M10.5 0C10.5 0 11.0793 5.40743 13.336 7.66405C15.5926 9.92066 21 10.5 21 10.5C21 10.5 15.5926 11.0793 13.336 13.336C11.0793 15.5926 10.5 21 10.5 21C10.5 21 9.92066 15.5926 7.66405 13.336C5.40743 11.0793 0 10.5 0 10.5C0 10.5 5.40743 9.92066 7.66405 7.66405C9.92066 5.40743 10.5 0 10.5 0Z" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="chat-header-text">Converse com a {ASSISTANT_NAME}</h2>
        </div>
      )}
      <div className="chat-messages" ref={messagesContainerRef}>
        <div className="chat-stream">
          <Suspense fallback={<div className="lazy-fallback" aria-hidden="true">Carregando insights...</div>}>
            <InsightsOverview showHeader={showHeader} />
          </Suspense>
          {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}${msg.content === 'analysis' ? ' message-with-chart' : ''}`}>
                <div className="message-header">
                  {msg.role === 'user' ? 'Você' : ASSISTANT_NAME}
                </div>
                {msg.content === 'analysis' && msg.analysisData ? (
                  <div className="message-analysis">
                    <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Análise: {msg.analysisData.politician}</h3>
                    <div style={{ width: '100%', margin: '0 auto', overflow: 'hidden' }}>
                      <Suspense fallback={<div className="chart-fallback" aria-hidden="true">Carregando gráfico...</div>}>
                        <HexagonalChart data={msg.analysisData.data} politicianName={msg.analysisData.politician} />
                      </Suspense>
                    </div>
                  </div>
                ) : msg.content ? (
                  <div
                    className="message-content"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                ) : null}
              </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-header">{ASSISTANT_NAME}</div>
              <div className="message-content">
                <div className="loading-spinner"></div> Pensando...
              </div>
            </div>
          )}
          {showNpsSurvey && (
            <div className="nps-wrapper">
              <Suspense fallback={<div className="lazy-fallback" aria-hidden="true">Carregando pesquisa...</div>}>
                <NPSSurvey />
              </Suspense>
            </div>
          )}
        </div>
      </div>
      {showSuggestions && (
        <div className="chat-suggestions-container">
          <p className="suggestions-title">Sugestões para explorar com a {ASSISTANT_NAME}</p>
          <div className="chat-suggestions">
            {displayedSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion-button"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua pergunta..."
          disabled={loading}
          className="chat-input"
        />
        <button 
          onClick={sendMessage} 
          disabled={loading || !input.trim()}
          className="chat-button"
          aria-label="Enviar mensagem"
        >
          <span className="chat-button-text">Enviar</span>
          <svg className="chat-button-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Chat;
