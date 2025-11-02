import { useMemo, useState } from 'react';
import './IssueDashboard.css';

const issuesDataset = {
  '30d': [
    {
      id: 'reforma-tributaria-regulamentacao',
      title: 'Regulamentação da Reforma Tributária',
      mentions: 15480,
      intensity: 94,
      sentiment: 'positivo',
      relatedVotes: ['PLP 68/2024', 'PLP 108/2024'],
      trend: 'up',
      description: 'Câmara e Senado detalham o IBS e a CBS após a aprovação da PEC 45/2019.',
      lastUpdate: 'Atualizado em 16 out 2024',
      nextStep: 'Senado analisa destaques do PLP 108/2024 antes do texto retornar à Câmara.',
      keyPlayers: ['Relator: Dep. Reginaldo Lopes (PT-MG)', 'Relatora no Senado: Sen. Tereza Cristina (PP-MS)']
    },
    {
      id: 'desoneracao-folha',
      title: 'Desoneração da folha e compensações',
      mentions: 13120,
      intensity: 88,
      sentiment: 'neutro',
      relatedVotes: ['Veto 38/2023 (derrubado)', 'PL 1435/2024'],
      trend: 'warning',
      description: 'Após derrubar o veto presidencial, Congresso pressiona por fonte permanente de compensação.',
      lastUpdate: 'Atualizado em 24 set 2024',
      nextStep: 'Ministério da Fazenda negocia proposta de compensação com governadores.',
      keyPlayers: ['Dep. Arthur Lira (PP-AL)', 'Ministro Fernando Haddad']
    },
    {
      id: 'pl-1904-2024',
      title: 'PL 1904/2024 (Aborto legal)',
      mentions: 11870,
      intensity: 90,
      sentiment: 'negativo',
      relatedVotes: ['PL 1904/2024', 'REQ 96/2024 (Urgência)'],
      trend: 'warning',
      description: 'Projeto endurece penas e mobiliza frentes parlamentares e sociedade civil.',
      lastUpdate: 'Atualizado em 2 out 2024',
      nextStep: 'Presidência da Câmara avalia consulta a líderes antes de levar ao plenário.',
      keyPlayers: ['Autora: Dep. Soraya Santos (PL-RJ)', 'Frente Parlamentar Feminista']
    }
  ],
  '90d': [
    {
      id: 'marco-ia',
      title: 'Marco Regulatório da Inteligência Artificial',
      mentions: 9860,
      intensity: 79,
      sentiment: 'positivo',
      relatedVotes: ['PL 2338/2023', 'REQ 19/2024 (Urgência)'],
      trend: 'up',
      description: 'Senado aprovou texto-base e Câmara prepara substitutivo com foco em IA generativa.',
      lastUpdate: 'Atualizado em 18 set 2024',
      nextStep: 'Grupo de trabalho entrega versão final para votação no plenário da Câmara.',
      keyPlayers: ['Relator: Dep. Eduardo Bismarck (PDT-CE)', 'Presidente do GT: Dep. Fernando Torres (PSD-BA)']
    },
    {
      id: 'pne-2024',
      title: 'Plano Nacional de Educação 2024-2034',
      mentions: 9120,
      intensity: 72,
      sentiment: 'neutro',
      relatedVotes: ['PL 2612/2023', 'PLN 4/2024'],
      trend: 'up',
      description: 'Meta de financiamento e indicadores de aprendizagem geram disputas entre União e estados.',
      lastUpdate: 'Atualizado em 9 jul 2024',
      nextStep: 'Comissão especial conclui relatório e pauta votação no plenário da Câmara.',
      keyPlayers: ['Relatora: Dep. Professora Goreth (PDT-AP)', 'Undime e Consed']
    },
    {
      id: 'transicao-energetica',
      title: 'Transição energética e mercado de carbono',
      mentions: 8740,
      intensity: 76,
      sentiment: 'positivo',
      relatedVotes: ['PL 412/2022', 'PL 327/2021'],
      trend: 'up',
      description: 'Senado aprovou marco do mercado de carbono e aguarda votação final na Câmara.',
      lastUpdate: 'Atualizado em 28 ago 2024',
      nextStep: 'Líderes articulam acordo para votação do PL 412/2022 no plenário da Câmara.',
      keyPlayers: ['Relatora: Dep. Carla Zambelli (PL-SP)', 'Ministério do Meio Ambiente']
    }
  ],
  '365d': [
    {
      id: 'reforma-tributaria',
      title: 'Reforma Tributária ampla',
      mentions: 20560,
      intensity: 91,
      sentiment: 'positivo',
      relatedVotes: ['PEC 45/2019', 'PEC 110/2019'],
      trend: 'up',
      description: 'Implementação da PEC 45 permanece prioridade fiscal para União, estados e municípios.',
      lastUpdate: 'Atualizado em 1 set 2024',
      nextStep: 'Regulamentação complementar e leis ordinárias serão enviadas até março de 2025.',
      keyPlayers: ['Ministério da Fazenda', 'Comitê Gestor do IBS']
    },
    {
      id: 'politicas-sociais',
      title: 'Políticas sociais e combate à pobreza',
      mentions: 18420,
      intensity: 84,
      sentiment: 'positivo',
      relatedVotes: ['PL 9/2023 (Bolsa Família)', 'PL 2380/2023 (Cesta Básica Nacional)'],
      trend: 'up',
      description: 'Ampliação do Bolsa Família e política de renda mínima dominam a agenda econômica.',
      lastUpdate: 'Atualizado em 14 ago 2024',
      nextStep: 'Governo prepara MP para reajuste da linha de pobreza e revisão de benefícios.',
      keyPlayers: ['Ministério do Desenvolvimento Social', 'Frente Parlamentar Mista de Combate à Fome']
    },
    {
      id: 'clima-e-resiliencia',
      title: 'Adaptação climática e proteção ambiental',
      mentions: 16750,
      intensity: 78,
      sentiment: 'neutro',
      relatedVotes: ['PL 2633/2020', 'PL 510/2021', 'PL 412/2022'],
      trend: 'warning',
      description: 'Câmara retoma debates sobre regularização fundiária e prevenção a eventos extremos.',
      lastUpdate: 'Atualizado em 30 jun 2024',
      nextStep: 'Relatores ajustam texto para conciliar pauta ambiental e segurança jurídica.',
      keyPlayers: ['Ministério do Meio Ambiente', 'Frente Parlamentar da Agropecuária']
    }
  ]
};

const ranges = [
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
  { id: '365d', label: '12 meses' }
];

const trendLabels = {
  up: 'Tendência de alta',
  down: 'Queda no interesse',
  warning: 'Sinal de atenção'
};

const IssueDashboard = () => {
  const [selectedRange, setSelectedRange] = useState('30d');
  const issues = useMemo(() => issuesDataset[selectedRange] ?? [], [selectedRange]);
  const selectedRangeLabel = ranges.find((range) => range.id === selectedRange)?.label ?? '';

  return (
    <section className="dashboard issue-dashboard" aria-label="Assuntos políticos em evidência">
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h2>Assuntos em alta</h2>
          <p className="dashboard-subtitle">
            Monitoramento simplificado dos temas mais mencionados no Congresso nos últimos {selectedRangeLabel.toLowerCase()}.
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

      <div className="issue-list">
        {issues.map((issue) => (
          <article key={issue.id} className="issue-item">
            <header className="issue-header">
              <div>
                <h3>{issue.title}</h3>
                <p className="issue-description">{issue.description}</p>
                {issue.lastUpdate && (
                  <span className="issue-update" role="note">{issue.lastUpdate}</span>
                )}
              </div>
              <div className="issue-indicators">
                <span className={`issue-trend ${issue.trend}`}>{trendLabels[issue.trend]}</span>
                <span className={`issue-sentiment ${issue.sentiment}`}>{issue.sentiment}</span>
              </div>
            </header>

            <div className="issue-metrics">
              <div>
                <span className="metric-label">Menções qualificadas</span>
                <strong className="metric-value">{issue.mentions.toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                <span className="metric-label">Força do tema</span>
                <div className="metric-progress" role="img" aria-label={`Força do tema: ${issue.intensity}%`}>
                  <span className="metric-bar">
                    <span className="metric-fill" style={{ width: `${issue.intensity}%` }} />
                  </span>
                  <span className="metric-number">{issue.intensity}%</span>
                </div>
              </div>
            </div>

            <div className="issue-related">
              <span className="metric-label">Votações associadas</span>
              <div className="issue-tags">
                {issue.relatedVotes.map((vote) => (
                  <span key={vote} className="issue-tag">{vote}</span>
                ))}
              </div>
            </div>

            {(issue.nextStep || (issue.keyPlayers && issue.keyPlayers.length > 0)) && (
              <div className="issue-actions">
                {issue.nextStep && (
                  <p className="issue-next-step">
                    <span className="metric-label">Próximo passo</span>
                    <span>{issue.nextStep}</span>
                  </p>
                )}
                {issue.keyPlayers && issue.keyPlayers.length > 0 && (
                  <div className="issue-actors">
                    <span className="metric-label">Atores-chave</span>
                    <div className="issue-tags">
                      {issue.keyPlayers.map((actor) => (
                        <span key={actor} className="issue-tag actor">{actor}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default IssueDashboard;
