import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// Thin wrapper around Chart.js that mirrors the original `new Chart(canvas, cfg)`
// usage: it builds the chart from `config` and destroys/rebuilds it whenever the
// config changes (equivalent to the prototype's destroy()+recreate on re-render).
export default function ChartCanvas({ config, className }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    chartRef.current = new Chart(canvasRef.current, config);
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config]);

  return <canvas ref={canvasRef} className={className} />;
}
