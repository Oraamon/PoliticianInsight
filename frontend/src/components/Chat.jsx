import { useState, useRef, useEffect } from 'react';
import HexagonalChart from './HexagonalChart';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const allSuggestions = [
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
  ];

  // Seleciona 3 sugestões aleatórias
  const getRandomSuggestions = () => {
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  const [displayedSuggestions, setDisplayedSuggestions] = useState(() => getRandomSuggestions());

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


  // Atualiza sugestões quando não há mensagens
  useEffect(() => {
    if (messages.length === 0) {
      setDisplayedSuggestions(getRandomSuggestions());
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        
        if (isPoliticianQuery(userMessage)) {
          const detectedName = extractPoliticianName(userMessage);
          // Só gera gráfico se detectou um nome válido (não genérico nem palavra comum)
          const genericNames = ['Político', 'Como', 'Explique', 'Fale', 'Conte', 'Diga', 'Sistema', 'Senado', 'Câmara'];
          if (!genericNames.includes(detectedName)) {
            generateAnalysis(userMessage);
          }
        }
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Desculpe, não consegui processar sua mensagem. Tente novamente.' 
        }]);
      }
    } catch (error) {
      console.error('Erro:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Erro ao conectar com o servidor. Verifique sua conexão.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const isPoliticianQuery = (query) => {
    const lowerQuery = query.toLowerCase();
    
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
      const analysisKeywords = ['análise', 'avaliação', 'pontos', 'pontos fortes', 'pontos fracos', 
                                'perfil', 'características', 'avalie', 'analise'];
      const hasAnalysisIntent = analysisKeywords.some(keyword => lowerQuery.includes(keyword));
      
      if (!hasAnalysisIntent) {
        return false; // É notícia/ação, não análise
      }
    }
    
    // Palavras-chave que indicam interesse em ANÁLISE/AVALIAÇÃO do político
    const analysisKeywords = [
      'análise', 'avaliação', 'pontos', 'pontos fortes', 'pontos fracos', 'características',
      'perfil', 'avalie', 'analise', 'quais os', 'qual a', 'explique sobre', 'fale sobre',
      'conte sobre', 'informe sobre', 'diga sobre', 'sobre', 'opinião sobre',
      'gráfico', 'grafico', 'chart', 'mostre', 'mostra', 'dê', 'de', 'me dê', 'me de',
      'me mostre', 'me mostra', 'quero ver', 'ver o', 'veja o'
    ];
    
    // Palavras-chave relacionadas a política (mas que podem indicar análise)
    const politicalKeywords = [
      'político', 'candidato', 'presidente', 'governador', 'senador',
      'deputado', 'prefeito', 'vereador', 'política', 'eleições',
      'eleição', 'campanha', 'votar', 'voto', 'partido', 'mandato'
    ];
    
    // Nomes de políticos conhecidos (caso específico)
    const knownPoliticians = [
      'bolsonaro', 'lula', 'ciro', 'marina', 'aecio', 'temer', 'dilma',
      'doria', 'haddad', 'boulos', 'freixo', 'psol', 'pt', 'psdb', 'mdb',
      'collor', 'sarney', 'tasso', 'barbosa', 'morales', 'trump', 'biden'
    ];
    
    // Verifica se há palavras-chave de ANÁLISE explícitas (alta prioridade)
    const hasAnalysisIntent = analysisKeywords.some(keyword => lowerQuery.includes(keyword));
    
    // Verifica se há nomes conhecidos de políticos
    const hasPoliticianName = knownPoliticians.some(name => lowerQuery.includes(name));
    
    // Se tem nome de político conhecido e qualquer palavra-chave de análise/gráfico, ativa imediatamente
    if (hasPoliticianName && hasAnalysisIntent) {
      return true;
    }
    
    // Se tem nome de político e palavras como "gráfico", "chart", "mostre", "dê", também ativa
    const graphicKeywords = ['gráfico', 'grafico', 'chart', 'mostre', 'mostra', 'dê', 'de', 'me dê', 'me de'];
    if (hasPoliticianName && graphicKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return true;
    }
    
    // Palavras comuns que começam com maiúscula mas NÃO são nomes de políticos
    const commonCapitalizedWords = [
      'Como', 'O', 'A', 'Os', 'As', 'De', 'Da', 'Do', 'Das', 'Dos', 'E', 'Em', 'Para', 'Sobre', 
      'Com', 'Explique', 'Fale', 'Conte', 'Diga', 'Informe', 'Quem', 'Qual', 'Quais', 'Onde',
      'Quando', 'Porque', 'Por', 'Para', 'Que', 'Senado', 'Câmara', 'Congresso', 'Brasil',
      'Brasileiro', 'Brasileiros', 'Federal', 'Nacional', 'Republica', 'Presidente', 'Governador'
    ];
    
    // Se tem palavra de análise mas não tem nome, pode ser pergunta genérica
    if (hasAnalysisIntent && !hasPoliticianName) {
      // Verifica se há nomes próprios na query (ignorando palavras comuns)
      const words = query.split(/\s+/);
      let hasProperNoun = false;
      for (let i = 1; i < words.length; i++) {
        const word = words[i].replace(/[.,!?;:]$/, '');
        if (word.length > 2 && 
            word[0] === word[0].toUpperCase() && 
            word[0] !== word[0].toLowerCase() &&
            !commonCapitalizedWords.includes(word)) {
          hasProperNoun = true;
          break;
        }
      }
      // Só retorna true se tem nome próprio E é nome conhecido de político
      return hasProperNoun && hasPoliticianName;
    }
    
    // Detecta nomes próprios com contexto de análise
    if (hasPoliticianName) {
      // Verifica padrões que indicam pergunta sobre pessoa (análise)
      const personAnalysisPatterns = [
        /\b(quem|qual|fale|conte|diga|explique|informe)\s+(sobre\s+)?[A-Z][a-z]+/i,
        /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(é|foi|será|tem|tinha|caracteriza|possui)/i,
        /\b(perfil|características|pontos|análise|avaliação|gráfico|grafico|chart)\s+(de|do|da|sobre)/i,
        /\b(dê|de|me dê|me de|mostre|mostra|me mostre|me mostra)\s+(o|a|o )?\s*(gráfico|grafico|chart|análise|perfil)\s+(de|do|da|sobre)/i,
        /\b(quero|ver|veja)\s+(o|a)?\s*(gráfico|grafico|chart|análise|perfil)\s+(de|do|da|sobre)/i
      ];
      
      // Se tem nome de político conhecido e qualquer palavra que sugira gráfico/análise, aceita
      if (personAnalysisPatterns.some(pattern => pattern.test(query))) {
        return true;
      }
      
      // Se tem nome de político e qualquer palavra-chave de análise/gráfico, também aceita
      if (analysisKeywords.some(keyword => lowerQuery.includes(keyword))) {
        return true;
      }
    }
    
    // Detecta nomes próprios (palavras capitalizadas que não são início de frase)
    // Mas só se tiverem palavras-chave que sugerem análise E não são palavras comuns
    const words = query.split(/\s+/);
    let capitalizedCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:]$/, '');
      if (word.length > 2 && 
          word[0] === word[0].toUpperCase() && 
          word[0] !== word[0].toLowerCase() &&
          !commonCapitalizedWords.includes(word)) {
        capitalizedCount++;
        if (capitalizedCount >= 1 && i > 0) {
          // Verifica se tem contexto de análise E se é um político conhecido
          const analysisContext = ['perfil', 'pontos', 'análise', 'avaliação', 'gráfico', 'grafico'];
          const hasContext = analysisContext.some(ctx => lowerQuery.includes(ctx));
          // Só retorna true se tem contexto E é político conhecido
          return hasContext && hasPoliticianName;
        }
      }
    }
    
    return false;
  };

  const extractPoliticianName = (query) => {
    const lowerQuery = query.toLowerCase();
    
    // Mapeamento de nomes conhecidos para nomes completos
    const politicianMap = {
      'lula': 'Lula',
      'luiz inácio lula da silva': 'Lula',
      'bolsonaro': 'Bolsonaro',
      'jair bolsonaro': 'Bolsonaro',
      'ciro': 'Ciro Gomes',
      'ciro gomes': 'Ciro Gomes',
      'marina': 'Marina Silva',
      'marina silva': 'Marina Silva',
      'aecio': 'Aécio Neves',
      'aécio neves': 'Aécio Neves',
      'temer': 'Michel Temer',
      'dilma': 'Dilma Rousseff',
      'doria': 'João Doria',
      'haddad': 'Fernando Haddad',
      'boulos': 'Guilherme Boulos',
      'freixo': 'Marcelo Freixo',
      'collor': 'Fernando Collor',
      'tasso': 'Tasso Jereissati',
      'barbosa': 'Joaquim Barbosa'
    };
    
    // Verifica mapeamentos diretos primeiro (prioridade)
    for (const [key, value] of Object.entries(politicianMap)) {
      if (lowerQuery.includes(key)) {
        return value;
      }
    }
    
    // Palavras comuns que não devem ser consideradas nomes de políticos
    const commonWords = [
      'O', 'A', 'Os', 'As', 'De', 'Da', 'Do', 'Das', 'Dos', 'E', 'Em', 'Para', 'Sobre', 'Com',
      'Como', 'Explique', 'Fale', 'Conte', 'Diga', 'Informe', 'Quem', 'Qual', 'Quais', 'Onde',
      'Quando', 'Porque', 'Por', 'Que', 'Senado', 'Câmara', 'Congresso', 'Brasil', 'Brasileiro',
      'Brasileiros', 'Federal', 'Nacional', 'Republica', 'Presidente', 'Governador', 'Sistema',
      'Funciona', 'Fazer', 'Ter', 'Ser', 'Estar'
    ];
    
    // Extrai nomes próprios da query (ignorando palavras comuns)
    const words = query.split(/\s+/);
    const properNouns = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:]$/, '');
      // Verifica se é nome próprio (capitalizado, não é palavra comum, e não está no início como pergunta)
      if (word.length > 2 && 
          word[0] === word[0].toUpperCase() && 
          word[0] !== word[0].toLowerCase() &&
          !commonWords.includes(word) &&
          !['Como', 'Explique', 'Fale', 'Conte', 'Diga', 'Informe', 'Quem', 'Qual'].includes(word)) {
        properNouns.push(word);
      }
    }
    
    // Combina nomes próprios adjacentes (ex: "Luiz Inácio" vira "Luiz Inácio")
    if (properNouns.length > 0) {
      // Tenta combinar nomes adjacentes
      const combinedNames = [];
      let currentName = properNouns[0];
      
      for (let i = 1; i < properNouns.length; i++) {
        const prevWordIndex = words.findIndex(w => w.includes(properNouns[i-1]));
        const currentWordIndex = words.findIndex(w => w.includes(properNouns[i]));
        
        // Se são adjacentes, combina
        if (currentWordIndex === prevWordIndex + 1) {
          currentName += ' ' + properNouns[i];
        } else {
          combinedNames.push(currentName);
          currentName = properNouns[i];
        }
      }
      combinedNames.push(currentName);
      
      // Retorna o primeiro nome completo encontrado (geralmente o político)
      return combinedNames[0] || properNouns[0];
    }
    
    // Fallback: tenta extrair de padrões como "fale sobre X" ou "análise de X"
    const patterns = [
      /(?:fale|sobre|análise|avaliação|pontos)\s+(?:sobre\s+|de\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:é|foi|será|tem|tinha)/i
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'Político';
  };

  const generateAnalysis = (query) => {
    const detectedPolitician = extractPoliticianName(query);
    
    // Verificação de segurança: não gera gráfico se o nome for genérico ou palavra comum
    const genericNames = ['Político', 'Como', 'Explique', 'Fale', 'Conte', 'Diga', 'Sistema', 'Senado', 'Câmara', 'Congresso', 'Brasil', 'Federal'];
    if (genericNames.includes(detectedPolitician)) {
      return; // Não gera gráfico se não identificou um político válido
    }

    setTimeout(() => {
      const analysisData = {
        politician: detectedPolitician,
        data: generateHexagonalData(detectedPolitician)
      };
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'analysis',
        analysisData: analysisData
      }]);
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
          <h2 className="chat-header-text">Ask our AI anything</h2>
        </div>
      )}
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length > 0 && <div style={{ flex: '1 1 auto', minHeight: 0 }} />}
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}${msg.content === 'analysis' ? ' message-with-chart' : ''}`}>
            <div className="message-header">
              {msg.role === 'user' ? 'Você' : 'Assistente'}
            </div>
            {msg.content === 'analysis' && msg.analysisData ? (
              <div className="message-analysis">
                <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Análise: {msg.analysisData.politician}</h3>
                <div style={{ width: '100%', margin: '0 auto', overflow: 'hidden' }}>
                  <HexagonalChart 
                    data={msg.analysisData.data} 
                    politicianName={msg.analysisData.politician}
                  />
                </div>
              </div>
            ) : (
              <div 
                className="message-content" 
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
            )}
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-header">Assistente</div>
            <div className="message-content">
              <div className="loading-spinner"></div> Pensando...
            </div>
          </div>
        )}
      </div>
      {showSuggestions && (
        <div className="chat-suggestions-container">
          <p className="suggestions-title">Suggestions on what to ask Our AI</p>
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
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default Chat;
