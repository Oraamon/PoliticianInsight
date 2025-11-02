import { useMemo, useState } from 'react';
import './IssueDashboard.css';

const issuesDataset = {
  '30d': [
    {
      id: 'reforma-tributaria',
      title: 'Reforma Tributária',
      mentions: 12600,
      intensity: 92,
      sentiment: 'positivo',
      relatedVotes: ['PEC 45/2019', 'PLP 93/2023'],
      trend: 'up',
      description: 'Empresários e municípios monitoram a regulamentação do IVA dual.'
    },
    {
      id: 'seguranca-publica',
      title: 'Segurança Pública',
      mentions: 10340,
      intensity: 88,
      sentiment: 'neutro',
      relatedVotes: ['PEC 8/2021', 'PL 1826/2023'],
      trend: 'up',
      description: 'Enfoque em pautas sobre drogas e armas no Senado.'
    },
    {
      id: 'saude',
      title: 'Financiamento da Saúde',
      mentions: 9800,
      intensity: 74,
      sentiment: 'positivo',
      relatedVotes: ['PLN 5/2024', 'PL 2564/2020'],
      trend: 'warning',
      description: 'Debate sobre piso da enfermagem e recursos federais.'
    }
  ],
  '90d': [
    {
      id: 'energia',
      title: 'Transição Energética',
      mentions: 7800,
      intensity: 81,
      sentiment: 'positivo',
      relatedVotes: ['PL 412/2022', 'PL 327/2021'],
      trend: 'up',
      description: 'Créditos de carbono e mercado regulado ganham força.'
    },
    {
      id: 'educacao',
      title: 'Novo Ensino Médio',
      mentions: 8450,
      intensity: 69,
      sentiment: 'negativo',
      relatedVotes: ['PL 5230/2023'],
      trend: 'down',
      description: 'Revisão do cronograma e pressão de redes estaduais.'
    },
    {
      id: 'agro',
      title: 'Agronegócio Sustentável',
      mentions: 7200,
      intensity: 73,
      sentiment: 'neutro',
      relatedVotes: ['PL 2633/2020', 'PL 510/2021'],
      trend: 'up',
      description: 'Regularização fundiária e rastreabilidade ambiental.'
    }
  ],
  '365d': [
    {
      id: 'reforma-administrativa',
      title: 'Reforma Administrativa',
      mentions: 15600,
      intensity: 65,
      sentiment: 'neutro',
      relatedVotes: ['PEC 32/2020'],
      trend: 'warning',
      description: 'Tema recorre em pautas de ajuste fiscal e diálogo com servidores.'
    },
    {
      id: 'privatizacoes',
      title: 'Privatizações e concessões',
      mentions: 14200,
      intensity: 71,
      sentiment: 'positivo',
      relatedVotes: ['PL 591/2021', 'PL 3797/2020'],
      trend: 'up',
      description: 'Aeroportos, portos e Correios permanecem na agenda econômica.'
    },
    {
      id: 'politicas-sociais',
      title: 'Políticas Sociais',
      mentions: 16800,
      intensity: 83,
      sentiment: 'positivo',
      relatedVotes: ['PL 9/2023', 'PL 2380/2023'],
      trend: 'up',
      description: 'Auxílio à infância, Bolsa Família e ações para redução da pobreza.'
    }
  ]
};

const ranges = [
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
  { id: '365d', label: '12 meses' }
];

const IssueDashboard = () => {
  const [selectedRange, setSelectedRange] = useState('30d');
  const issues = useMemo(() => issuesDataset[selectedRange] ?? [], [selectedRange]);

  return (
    <section className="dashboard issue-dashboard" aria-label="Assuntos políticos em evidência">
      <header className="dashboard-header">
        <div>
          <h2>Principais assuntos do Congresso</h2>
          <p className="dashboard-subtitle">
            Monitoramos as discussões que mais impactam a agenda regulatória e sintetizamos sinais acionáveis.
          </p>
        </div>
        <div className="dashboard-filters" role="radiogroup" aria-label="Intervalo de análise">
          {ranges.map((range) => (
            <button
              key={range.id}
              type="button"
              role="radio"
              aria-checked={selectedRange === range.id}
              className={`filter-chip ${selectedRange === range.id ? 'active' : ''}`}
              onClick={() => setSelectedRange(range.id)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </header>

      <div className="issues-grid">
        {issues.map((issue) => (
          <article key={issue.id} className="issue-card">
            <header className="issue-header">
              <div>
                <h3>{issue.title}</h3>
                <p className="issue-description">{issue.description}</p>
              </div>
              <span className={`issue-trend ${issue.trend}`} aria-label={`Tendência ${issue.trend}`} />
            </header>

            <div className="issue-metrics">
              <div>
                <span className="metric-title">Menções qualificadas</span>
                <strong className="metric-number">{issue.mentions.toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                <span className="metric-title">Força do tema</span>
                <div className="metric-progress" aria-label="Intensidade do tema">
                  <span className="metric-progress-bar" style={{ width: `${issue.intensity}%` }} />
                  <span className="metric-progress-value">{issue.intensity}%</span>
                </div>
              </div>
              <div>
                <span className="metric-title">Sentimento predominante</span>
                <span className={`metric-chip sentiment ${issue.sentiment}`}>{issue.sentiment}</span>
              </div>
            </div>

            <footer className="issue-footer">
              <span className="related-title">Votações relacionadas</span>
              <div className="related-tags">
                {issue.relatedVotes.map((vote) => (
                  <span key={vote} className="related-tag">{vote}</span>
                ))}
              </div>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
};

export default IssueDashboard;
