import { useState, useEffect } from 'react';
import './Sidebar.css';

const Sidebar = ({ onSelectChat, currentChatId }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Carrega preferência do localStorage ou usa false (claro) como padrão
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : false;
  });

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Aplica modo noturno na inicialização
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark-mode');
    }
  }, []);

  useEffect(() => {
    // Carrega o histórico de chats do localStorage
    const savedChats = localStorage.getItem('chatHistory');
    if (savedChats) {
      try {
        const chats = JSON.parse(savedChats);
        setChatHistory(chats);
      } catch (error) {
        console.error('Erro ao carregar histórico de chats:', error);
      }
    }
  }, []);

  // Função para atualizar o histórico (será chamada externamente)
  useEffect(() => {
    const handleUpdateHistory = () => {
      const savedChats = localStorage.getItem('chatHistory');
      if (savedChats) {
        try {
          const chats = JSON.parse(savedChats);
          setChatHistory(chats);
        } catch (error) {
          console.error('Erro ao atualizar histórico:', error);
        }
      } else {
        setChatHistory([]);
      }
    };

    window.addEventListener('chatUpdated', handleUpdateHistory);
    return () => window.removeEventListener('chatUpdated', handleUpdateHistory);
  }, []);

  const handleNewChat = () => {
    if (onSelectChat) {
      onSelectChat(null);
    }
  };

  const handleChatSelect = (chatId) => {
    if (onSelectChat) {
      onSelectChat(chatId);
    }
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    const updatedChats = chatHistory.filter(chat => chat.id !== chatId);
    setChatHistory(updatedChats);
    
    // Remove do localStorage
    localStorage.setItem('chatHistory', JSON.stringify(updatedChats));
    
    // Remove as mensagens do chat deletado
    localStorage.removeItem(`chat_${chatId}`);
    
    // Dispara evento para atualizar outros componentes
    window.dispatchEvent(new Event('chatUpdated'));
    
    // Se o chat deletado era o atual, volta para novo chat
    if (chatId === currentChatId) {
      handleNewChat();
    }
  };

  // Aplica o modo noturno quando muda
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const handleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Gera título baseado na primeira mensagem do chat
  const getChatTitle = (chat) => {
    if (chat.title) return chat.title;
    if (chat.firstMessage) {
      return chat.firstMessage.length > 30 
        ? chat.firstMessage.substring(0, 30) + '...' 
        : chat.firstMessage;
    }
    return 'Novo Chat';
  };

  // Formata data
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hoje';
    if (diffDays === 2) return 'Ontem';
    if (diffDays <= 7) return `${diffDays - 1} dias atrás`;
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const handleToggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const isOpen = isMobile ? isMobileOpen : isHovered;

  return (
    <>
      {/* Botão toggle para mobile (só aparece quando collapsed) */}
      {isMobile && !isMobileOpen && (
        <button 
          className="sidebar-mobile-toggle"
          onClick={handleToggleMobile}
          aria-label="Abrir menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}

      {/* Overlay para fechar no mobile */}
      {isMobile && isMobileOpen && (
        <div 
          className="sidebar-overlay"
          onClick={handleToggleMobile}
        />
      )}

      <div 
        className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${isMobile ? 'sidebar-mobile' : ''}`}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        <div className="sidebar-content">
          {/* Botão fechar no mobile quando aberto */}
          {isMobile && isMobileOpen && (
            <button 
              className="sidebar-mobile-close"
              onClick={handleToggleMobile}
              aria-label="Fechar menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        <button 
          className="sidebar-new-chat-btn"
          onClick={handleNewChat}
          title="Novo Chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          {isOpen && <span>Novo Chat</span>}
        </button>

        <div className="sidebar-divider"></div>

        <div className="sidebar-chats">
          <div className="sidebar-section-title">
            {isOpen && <span>Histórico</span>}
          </div>
          <div className="sidebar-chats-list">
            {chatHistory.length === 0 ? (
              <div className="sidebar-empty">
                {isOpen && <span>Nenhum chat anterior</span>}
              </div>
            ) : (
              chatHistory
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((chat) => (
                  <div
                    key={chat.id}
                    className={`sidebar-chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                    onClick={() => handleChatSelect(chat.id)}
                    title={getChatTitle(chat)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    {isOpen && (
                      <>
                        <span className="sidebar-chat-title">{getChatTitle(chat)}</span>
                        <span className="sidebar-chat-date">{formatDate(chat.timestamp)}</span>
                        <button
                          className="sidebar-chat-delete"
                          onClick={(e) => handleDeleteChat(e, chat.id)}
                          title="Deletar chat"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="sidebar-divider"></div>

        <div className="sidebar-settings-section">
          <button 
            className="sidebar-settings-btn"
            onClick={handleSettings}
            title="Configurações"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m16.66-5.66l-4.24 4.24M7.58 16.42l-4.24 4.24m0-11.32l4.24 4.24m8.48 0l4.24 4.24"></path>
            </svg>
            {isOpen && <span>Configurações</span>}
            <svg 
              className={`sidebar-settings-arrow ${isSettingsOpen ? 'open' : ''}`}
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {isSettingsOpen && isOpen && (
            <div className="sidebar-settings-panel">
              <div className="sidebar-setting-item">
                <label className="sidebar-setting-label">
                  <span>Modo Noturno</span>
                  <div className="sidebar-toggle-switch" onClick={toggleDarkMode}>
                    <input 
                      type="checkbox" 
                      checked={darkMode} 
                      onChange={toggleDarkMode}
                      readOnly
                    />
                    <span className={`sidebar-toggle-slider ${darkMode ? 'active' : ''}`}></span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default Sidebar;

