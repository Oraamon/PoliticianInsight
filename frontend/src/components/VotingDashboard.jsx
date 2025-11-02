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
    highlight: 'Simplificação tributária com IVA dual',
    trend: 'up'
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
    highlight: 'Cria regras para plataformas digitais',
    trend: 'warning'
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
    highlight: 'Estabelece metas de resultado primário',
    trend: 'up'
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
    highlight: 'Insere criminalização na Constituição',
    trend: 'down'
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
    highlight: 'Amplia uso de bens como garantia de crédito',
    trend: 'up'
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

  const summary = useMemo(() => {
    const scopedVotes = selectedChamber === 'todos'
      ? votesDataset
      : votesDataset.filter((vote) => vote.chamber === selectedChamber);

    const totalVotes = scopedVotes.length;
    const approved = scopedVotes.filter((vote) => vote.stage === 'Aprovado' || vote.stage === 'Sancionado').length;
    const avgAlignment = scopedVotes.reduce((acc, vote) => acc + vote.governmentAlignment, 0) / (totalVotes || 1);

    return {
      totalVotes,
      approved,
      avgAlignment
    };
  }, [selectedChamber]);

  const filteredVotes = useMemo(() => {
    if (selectedChamber === 'todos') {
      return votesDataset;
    }
    return votesDataset.filter((vote) => vote.chamber === selectedChamber);
  }, [selectedChamber]);

  return (
    <section className="dashboard voting-dashboard" aria-label="Principais votações do Congresso">
      <header className="dashboard-header">
        <div>
          <h2>Principais votações monitoradas</h2>
          <p className="dashboard-subtitle">
            Explore votações estratégicas e identifique tendências de alinhamento entre governo e base parlamentar.
          </p>
        </div>
        <div className="dashboard-filters" role="tablist" aria-label="Filtro por casa legislativa">
          {chambers.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selectedChamber === option.id}
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
          <span className="summary-label">Votações em destaque</span>
          <strong className="summary-value">{summary.totalVotes}</strong>
        </div>
        <div className="summary-card" role="listitem">
          <span className="summary-label">Aprovadas</span>
          <strong className="summary-value">{summary.approved}</strong>
        </div>
        <div className="summary-card" role="listitem">
          <span className="summary-label">Alinhamento com o governo</span>
          <strong className="summary-value">{Math.round(summary.avgAlignment * 100)}%</strong>
        </div>
      </div>

      <div className="votes-grid">
        {filteredVotes.map((vote) => {
          const total = vote.support + vote.against + vote.abstention;
          const supportPercent = Math.round((vote.support / total) * 100);
          const againstPercent = Math.round((vote.against / total) * 100);
          const abstentionPercent = 100 - supportPercent - againstPercent;

          return (
            <article key={vote.id} className="vote-card">
              <header className="vote-card-header">
                <div>
                  <h3>{vote.title}</h3>
                  <p className="vote-highlight">{vote.highlight}</p>
                </div>
                <div className="vote-tags">
                  <span className="vote-tag">{vote.chamber}</span>
                  <span className="vote-tag">{vote.topic}</span>
                  <span className={`vote-tag stage ${vote.stage === 'Em pauta' ? 'warning' : 'success'}`}>
                    {vote.stage}
                  </span>
                </div>
              </header>

              <dl className="vote-meta">
                <div>
                  <dt>Alinhamento do governo</dt>
                  <dd>
                    <span className="vote-alignment">
                      <span className="alignment-bar" style={{ width: `${vote.governmentAlignment * 100}%` }} />
                      <span className="alignment-value">{Math.round(vote.governmentAlignment * 100)}%</span>
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>{formatDate(vote.date)}</dd>
                </div>
              </dl>

              <div className="vote-progress" aria-label="Distribuição de votos">
                <div className="progress-labels">
                  <span>Favor</span>
                  <span>Contra</span>
                  <span>Abstenções</span>
                </div>
                <div className="progress-bar">
                  <span className="bar-segment support" style={{ width: `${supportPercent}%` }} aria-label={`Votos a favor: ${supportPercent}%`} />
                  <span className="bar-segment against" style={{ width: `${againstPercent}%` }} aria-label={`Votos contra: ${againstPercent}%`} />
                  <span className="bar-segment abstention" style={{ width: `${abstentionPercent}%` }} aria-label={`Abstenções: ${abstentionPercent}%`} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default VotingDashboard;
