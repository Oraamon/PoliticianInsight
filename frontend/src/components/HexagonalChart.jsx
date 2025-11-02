import { useEffect, useRef, useState } from 'react';
import './HexagonalChart.css';

const HexagonalChart = ({ data, politicianName }) => {
  const canvasRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark-mode')
  );

  // Monitora mudanças no modo escuro
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark-mode'));
    };

    // Observa mudanças na classe do documento
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 60;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar hexágono base
    const drawHexagon = (radius) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
    };

    // Cores baseadas no modo
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
    const lineColor = isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';
    const strokeColor = isDarkMode ? '#ffffff' : '#000000';
    const textColor = isDarkMode ? '#ffffff' : '#000000';
    const pointFillColor = isDarkMode ? '#ffffff' : '#000000';
    const pointStrokeColor = isDarkMode ? '#000000' : '#ffffff';

    // Desenhar grid hexagonais (3 níveis)
    for (let i = 1; i <= 3; i++) {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      drawHexagon((maxRadius * i) / 3);
      ctx.stroke();
    }

    // Desenhar linha central para cada ponto
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + maxRadius * Math.cos(angle),
        centerY + maxRadius * Math.sin(angle)
      );
      ctx.stroke();
    }

    // Desenhar área do polígono
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const radius = (maxRadius * item.value) / 100;
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();

    // Preencher área com gradiente (ajustado para modo escuro)
    if (isDarkMode) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
      ctx.fillStyle = gradient;
    } else {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = gradient;
    }
    ctx.fill();

    // Contorno da área
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cores para cada categoria
    const getCategoryColor = (category) => {
      switch(category) {
        case 'forte':
          return '#4ade80'; // Verde para forte ✅
        case 'medio':
          return '#fbbf24'; // Amarelo para médio ⚖️
        case 'fraco':
          return '#f87171'; // Vermelho para fraco ⚠️
        default:
          return '#6ea8ff';
      }
    };

    // Desenhar pontos e labels
    data.forEach((item, i) => {
      const radius = (maxRadius * item.value) / 100;
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      // Ponto (branco no modo escuro, preto no modo claro)
      ctx.fillStyle = pointFillColor;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pointStrokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label e valor
      const labelRadius = maxRadius + 40;
      const labelX = centerX + labelRadius * Math.cos(angle);
      const labelY = centerY + labelRadius * Math.sin(angle);

      ctx.fillStyle = textColor;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, labelX, labelY - 8);
      
      // Valor
      ctx.fillStyle = textColor;
      ctx.font = '12px sans-serif';
      ctx.fillText(`${item.value}%`, labelX, labelY + 8);
    });
  }, [data, isDarkMode]);

  return (
    <div className="hexagonal-chart-container">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="hexagonal-chart"
      />
    </div>
  );
};

export default HexagonalChart;
