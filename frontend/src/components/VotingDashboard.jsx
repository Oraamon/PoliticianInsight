import { useMemo, useState } from 'react';
import './VotingDashboard.css';

const votesDataset = [
  {
    id: 'plp-68-2024-camara',
    title: 'Regulamentação do IBS e CBS (PLP 68/2024)',
    chamber: 'Câmara',
    topic: 'Reforma Tributária',
    governmentAlignment: 0.74,
    support: 336,
    against: 142,
    abstention: 2,
    stage: 'Aprovado',
    date: '2024-07-10',
    highlight: 'Texto-base do IVA dual aprovado; proposta segue para análise do Senado.',
    source: 'Câmara dos Deputados',
    sourceUrl: 'https://www.camara.leg.br/noticias/1085428-camara-aprova-regulamentacao-do-ibs-e-da-cbs/'
  },
  {
    id: 'plp-108-2024-camara',
    title: 'Fundo de Desenvolvimento Regional (PLP 108/2024)',
    chamber: 'Câmara',
    topic: 'Reforma Tributária',
    governmentAlignment: 0.78,
    support: 382,
    against: 118,
    abstention: 3,
    stage: 'Aprovado',
    date: '2024-07-11',
    highlight: 'Complementa a reforma com cashback do IBS para famílias de baixa renda.',
    source: 'Câmara dos Deputados',
    sourceUrl: 'https://www.camara.leg.br/noticias/1085667-camara-aprova-fundo-de-desenvolvimento-regional-da-reforma-tributaria/'
  },
  {
    id: 'plp-68-2024-senado',
    title: 'Regulamentação do IBS (PLP 68/2024) – Senado',
    chamber: 'Senado',
    topic: 'Reforma Tributária',
    governmentAlignment: 0.69,
    support: 65,
    against: 13,
    abstention: 0,
    stage: 'Aprovado',
    date: '2024-09-11',
    highlight: 'Senado mantém texto-base e envia projeto de volta à Câmara.',
    source: 'Senado Federal',
    sourceUrl: 'https://www12.senado.leg.br/noticias/materias/2024/09/11/senado-aprova-plp-68-2024' 
  },
  {
    id: 'veto-38-2023-camara',
    title: 'Veto 38/2023 – Desoneração da folha',
    chamber: 'Câmara',
    topic: 'Economia',
    governmentAlignment: 0.32,
    support: 378,
    against: 78,
    abstention: 1,
    stage: 'Veto derrubado',
    date: '2024-05-28',
    highlight: 'Deputados derrubam veto e restabelecem desoneração para 17 setores.',
    source: 'Câmara dos Deputados',
    sourceUrl: 'https://www.camara.leg.br/noticias/1082567-congresso-derruba-veto-a-desoneracao-da-folha/'
  },
  {
    id: 'veto-38-2023-senado',
    title: 'Veto 38/2023 – Desoneração da folha (Senado)',
    chamber: 'Senado',
    topic: 'Economia',
    governmentAlignment: 0.35,
    support: 60,
    against: 13,
    abstention: 0,
    stage: 'Veto derrubado',
    date: '2024-05-28',
    highlight: 'Senadores confirmam derrubada do veto e texto é promulgado pelo Congresso.',
    source: 'Senado Federal',
    sourceUrl: 'https://www12.senado.leg.br/noticias/materias/2024/05/28/congresso-derruba-veto-e-restabelece-desoneracao-da-folha' 
  },
  {
    id: 'pl-2338-2023-senado',
    title: 'Marco Legal da Inteligência Artificial (PL 2338/2023)',
    chamber: 'Senado',
    topic: 'Inovação',
    governmentAlignment: 0.81,
    support: 49,
    against: 8,
    abstention: 3,
    stage: 'Aprovado',
    date: '2024-04-23',
    highlight: 'Marco de IA define obrigações para sistemas de alto risco e segue para a Câmara.',
    source: 'Senado Federal',
    sourceUrl: 'https://www12.senado.leg.br/noticias/materias/2024/04/23/senado-aprova-marco-legal-da-inteligencia-artificial' 
  }
];

const chambers = [
  { id: 'todos', label: 'Todas as casas' },
  { id: 'Câmara', label: 'Câmara' },
  { id: 'Senado', label: 'Senado' },
  { id: 'Congresso', label: 'Sessões conjuntas' }
];

const formatDate = (dateStr) => {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  return formatter.format(new Date(dateStr));
};

const VotingDashboard = () => {
  const [selectedChamber, setSelectedChamber] = useState('todos');

  const topicOptions = useMemo(() => {
    const uniqueTopics = Array.from(new Set(votesDataset.map((vote) => vote.topic))).sort();
    return [{ id: 'todos', label: 'Todos os temas' }, ...uniqueTopics.map((topic) => ({ id: topic, label: topic }))];
  }, []);

  const [selectedTopic, setSelectedTopic] = useState('todos');

  const filteredVotes = useMemo(() => {
    return votesDataset.filter((vote) => {
      const matchesChamber = selectedChamber === 'todos' || vote.chamber === selectedChamber;
      const matchesTopic = selectedTopic === 'todos' || vote.topic === selectedTopic;
      return matchesChamber && matchesTopic;
    });
  }, [selectedChamber, selectedTopic]);

  const summary = useMemo(() => {
    const totalVotes = filteredVotes.length;
    const approved = filteredVotes.filter((vote) => vote.stage === 'Aprovado' || vote.stage === 'Sancionado').length;
    const avgAlignment = filteredVotes.reduce((acc, vote) => acc + vote.governmentAlignment, 0) / (totalVotes || 1);

    return {
      totalVotes,
      approved,
      avgAlignment
    };
  }, [filteredVotes]);

  const stageBreakdown = useMemo(() => {
    return filteredVotes.reduce((acc, vote) => {
      const key = vote.stage;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [filteredVotes]);

  const orderedStages = useMemo(() => Object.entries(stageBreakdown).sort((a, b) => b[1] - a[1]), [stageBreakdown]);

  const selectedLabel = chambers.find((option) => option.id === selectedChamber)?.label ?? 'todas as casas';
  const selectedTopicLabel = topicOptions.find((option) => option.id === selectedTopic)?.label ?? 'todos os temas';

  const lastUpdate = useMemo(() => {
    if (filteredVotes.length === 0) return null;
    const latest = [...filteredVotes].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(new Date(latest.date));
    } catch (error) {
      return null;
    }
  }, [filteredVotes]);

  return (
    <section className="dashboard voting-dashboard" aria-label="Principais votações do Congresso">
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h2>Radar de votações</h2>
          <p className="dashboard-subtitle">
            Visualize rapidamente o andamento das pautas estratégicas e o apoio que cada uma recebeu nas últimas votações.
          </p>
        </div>
        <div className="dashboard-filters" role="radiogroup" aria-label="Filtro por casa legislativa">
          {chambers.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selectedChamber === option.id}
              className={`filter-chip ${selectedChamber === option.id ? 'active' : ''}`}
              onClick={() => setSelectedChamber(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="dashboard-subfilters" role="radiogroup" aria-label="Filtro por tema da pauta">
        {topicOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selectedTopic === option.id}
            className={`filter-chip ${selectedTopic === option.id ? 'active' : ''}`}
            onClick={() => setSelectedTopic(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="dashboard-summary" role="list">
        <div className="summary-card" role="listitem">
          <span className="summary-label">Pautas monitoradas</span>
          <strong className="summary-value">{summary.totalVotes}</strong>
          <span className="summary-detail">
            Exibindo {selectedLabel.toLowerCase()} · {selectedTopicLabel.toLowerCase()}
          </span>
        </div>
        <div className="summary-card" role="listitem">
          <span className="summary-label">Aprovadas</span>
          <strong className="summary-value">{summary.approved}</strong>
          <span className="summary-detail">{Math.round((summary.approved / (summary.totalVotes || 1)) * 100)}% de sucesso</span>
        </div>
        <div className="summary-card" role="listitem">
          <span className="summary-label">Alinhamento médio</span>
          <strong className="summary-value">{Math.round(summary.avgAlignment * 100)}%</strong>
          <span className="summary-detail">Base governista x oposição</span>
        </div>
      </div>

      <div className="dashboard-context">
        {lastUpdate && <span className="dashboard-update">Atualizado com votações até {lastUpdate}</span>}
        {orderedStages.length > 0 && (
          <div className="stage-breakdown" role="list">
            {orderedStages.map(([stage, count]) => (
              <span key={stage} className="stage-chip" role="listitem">
                <strong>{count}</strong> {stage}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="vote-legend" aria-hidden="true">
        <span><span className="legend-dot support" />Favor</span>
        <span><span className="legend-dot against" />Contra</span>
        <span><span className="legend-dot abstention" />Abstenções</span>
      </div>

      <ul className="vote-list">
        {filteredVotes.length === 0 && (
          <li className="vote-empty">Nenhuma votação encontrada para os filtros selecionados.</li>
        )}
        {filteredVotes.map((vote) => {
          const total = vote.support + vote.against + vote.abstention;
          const supportPercent = Math.round((vote.support / total) * 100);
          const againstPercent = Math.round((vote.against / total) * 100);
          const abstentionPercent = 100 - supportPercent - againstPercent;
          const alignmentPercent = Math.round(vote.governmentAlignment * 100);

          return (
            <li key={vote.id} className="vote-item">
              <div className="vote-item-header">
                <div className="vote-heading">
                  <h3>{vote.title}</h3>
                  <span className="vote-meta">{formatDate(vote.date)} · {vote.chamber}</span>
                </div>
                <div className="vote-badges">
                  <span className={`stage-badge ${vote.stage === 'Em pauta' || vote.stage === 'Em tramitação' ? 'stage-warning' : 'stage-success'}`}>
                    {vote.stage}
                  </span>
                  <span className="topic-badge">{vote.topic}</span>
                </div>
              </div>

              <p className="vote-highlight">{vote.highlight}</p>

              {vote.sourceUrl && (
                <a className="vote-source" href={vote.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Fonte: {vote.source}
                </a>
              )}

              <div className="vote-split" role="img" aria-label={`Distribuição de votos em ${vote.title}`}>
                <span className="split-bar support" style={{ width: `${supportPercent}%` }} />
                <span className="split-bar against" style={{ width: `${againstPercent}%` }} />
                <span className="split-bar abstention" style={{ width: `${abstentionPercent}%` }} />
              </div>

              <div className="vote-stats" aria-hidden="true">
                <span>Favor {supportPercent}%</span>
                <span>Contra {againstPercent}%</span>
                <span>Abstenções {abstentionPercent}%</span>
              </div>

              <div className="vote-alignment">
                <span className="metric-label">Alinhamento do governo</span>
                <div className="alignment-track" role="img" aria-label={`Alinhamento do governo: ${alignmentPercent}%`}>
                  <span className="alignment-fill" style={{ width: `${alignmentPercent}%` }} />
                </div>
                <strong>{alignmentPercent}%</strong>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default VotingDashboard;
