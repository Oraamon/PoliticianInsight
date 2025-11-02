import { useMemo, useState } from 'react';
import './VotingDashboard.css';

const votesDataset = [
  {
    id: 'pec-45-2019',
    title: 'Reforma Tributária (PEC 45/2019)',
    chamber: 'Câmara',
    topic: 'Economia',
    governmentAlignment: 0.82,
    support: 375,
    against: 113,
    abstention: 5,
    stage: 'Aprovado',
    date: '2023-12-15',
    highlight: 'Simplificação tributária com IVA dual'
  },
  {
    id: 'pl-2630-2020',
    title: 'PL das Fake News (PL 2630/2020)',
    chamber: 'Câmara',
    topic: 'Comunicação',
    governmentAlignment: 0.54,
    support: 238,
    against: 192,
    abstention: 23,
    stage: 'Em tramitação',
    date: '2023-10-31',
    highlight: 'Cria regras para plataformas digitais'
  },
  {
    id: 'plp-93-2023',
    title: 'Novo Arcabouço Fiscal (PLP 93/2023)',
    chamber: 'Congresso',
    topic: 'Economia',
    governmentAlignment: 0.9,
    support: 70,
    against: 1,
    abstention: 0,
    stage: 'Sancionado',
    date: '2023-08-30',
    highlight: 'Estabelece metas de resultado primário'
  },
  {
    id: 'pec-8-2021',
    title: 'PEC das Drogas (PEC 8/2021)',
    chamber: 'Senado',
    topic: 'Segurança Pública',
    governmentAlignment: 0.41,
    support: 53,
    against: 9,
    abstention: 0,
    stage: 'Em pauta',
    date: '2024-02-20',
    highlight: 'Insere criminalização na Constituição'
  },
  {
    id: 'pl-1143-2023',
    title: 'Marco das Garantias (PL 1.143/2023)',
    chamber: 'Câmara',
    topic: 'Economia',
    governmentAlignment: 0.63,
    support: 327,
    against: 126,
    abstention: 0,
    stage: 'Encaminhado ao Senado',
    date: '2023-08-01',
    highlight: 'Amplia uso de bens como garantia de crédito'
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

  const scopedVotes = useMemo(() => {
    if (selectedChamber === 'todos') {
      return votesDataset;
    }
    return votesDataset.filter((vote) => vote.chamber === selectedChamber);
  }, [selectedChamber]);

  const summary = useMemo(() => {
    const totalVotes = scopedVotes.length;
    const approved = scopedVotes.filter((vote) => vote.stage === 'Aprovado' || vote.stage === 'Sancionado').length;
    const avgAlignment = scopedVotes.reduce((acc, vote) => acc + vote.governmentAlignment, 0) / (totalVotes || 1);

    return {
      totalVotes,
      approved,
      avgAlignment
    };
  }, [scopedVotes]);

  const selectedLabel = chambers.find((option) => option.id === selectedChamber)?.label ?? 'todas as casas';

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

      <div className="dashboard-summary" role="list">
        <div className="summary-card" role="listitem">
          <span className="summary-label">Pautas monitoradas</span>
          <strong className="summary-value">{summary.totalVotes}</strong>
          <span className="summary-detail">Exibindo {selectedLabel.toLowerCase()}</span>
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

      <ul className="vote-list">
        {scopedVotes.map((vote) => {
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
