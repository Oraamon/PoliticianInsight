import VotingDashboard from './VotingDashboard';
import IssueDashboard from './IssueDashboard';
import './InsightsOverview.css';

const highlightMetrics = [
  {
    label: 'Projetos monitorados',
    value: '128',
    detail: '+12 nesta semana',
    tone: 'positive'
  },
  {
    label: 'Índice de transparência',
    value: '92%',
    detail: 'baseado em fontes oficiais',
    tone: 'neutral'
  },
  {
    label: 'Alertas ativos',
    value: '9',
    detail: 'novas pautas em votação',
    tone: 'warning'
  }
];

const InsightsOverview = ({ showHeader }) => {
  return (
    <section className={`insights-overview ${showHeader ? 'with-header' : ''}`} aria-label="Painel de insights políticos">
      <div className="insights-hero">
        <div className="insights-intro">
          <h1>Panorama político em tempo real</h1>
          <p>
            Acompanhe votações decisivas, temas mais quentes e métricas consolidadas em um painel objetivo para decisões rápidas.
          </p>
          <div className="insights-badges">
            <span className="insight-badge">Atualizado diariamente</span>
            <span className="insight-badge">Fontes oficiais + curadoria</span>
          </div>
        </div>
        <div className="insights-metrics" role="list">
          {highlightMetrics.map((metric) => (
            <div key={metric.label} className={`insights-metric ${metric.tone}`} role="listitem">
              <span className="metric-label">{metric.label}</span>
              <strong className="metric-value">{metric.value}</strong>
              <span className="metric-detail">{metric.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="insights-panels">
        <VotingDashboard />
        <IssueDashboard />
      </div>
    </section>
  );
};

export default InsightsOverview;
