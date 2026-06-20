"use client";

import React, { useState, useMemo } from "react";

// --- Helpers ---
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

// --- Interfaces ---
interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number; // For dual-series charts
}

interface ChartProps {
  data: ChartDataPoint[];
  title?: string;
  height?: number;
  valueFormatter?: (val: number) => string;
}

// --- LINE / AREA CHART ---
export function LineChart({
  data,
  height = 300,
  valueFormatter = formatCurrency,
}: ChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const padding = { top: 25, right: 30, bottom: 40, left: 60 };
  const svgWidth = 600;
  const svgHeight = height;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Handle empty state
  const hasData = data && data.length > 0;
  const maxVal = useMemo(() => {
    if (!hasData) return 1;
    const values = data.flatMap(d => [d.value, d.secondaryValue ?? 0]);
    const max = Math.max(...values);
    return max === 0 ? 1 : max * 1.15; // 15% padding on top
  }, [data, hasData]);

  // Points computation
  const points = useMemo(() => {
    if (!hasData) return [];
    return data.map((d, i) => {
      const x = padding.left + (i * chartWidth) / Math.max(1, data.length - 1);
      const y = padding.top + chartHeight - (d.value / maxVal) * chartHeight;
      return { x, y, label: d.label, value: d.value };
    });
  }, [data, hasData, chartWidth, chartHeight, padding.left, padding.top, maxVal]);

  const secondaryPoints = useMemo(() => {
    if (!hasData || !data.some(d => d.secondaryValue !== undefined)) return null;
    return data.map((d, i) => {
      const x = padding.left + (i * chartWidth) / Math.max(1, data.length - 1);
      const y = padding.top + chartHeight - ((d.secondaryValue ?? 0) / maxVal) * chartHeight;
      return { x, y, label: d.label, value: d.secondaryValue ?? 0 };
    });
  }, [data, hasData, chartWidth, chartHeight, padding.left, padding.top, maxVal]);

  // Render SVG lines/paths
  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      // Smooth curve using cubic bezier
      const prev = points[i - 1];
      const cpX1 = prev.x + (p.x - prev.x) / 3;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (2 * (p.x - prev.x)) / 3;
      const cpY2 = p.y;
      return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }, "");
  }, [points]);

  const secondaryLinePath = useMemo(() => {
    if (!secondaryPoints || secondaryPoints.length === 0) return "";
    return secondaryPoints.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = secondaryPoints[i - 1];
      const cpX1 = prev.x + (p.x - prev.x) / 3;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (2 * (p.x - prev.x)) / 3;
      const cpY2 = p.y;
      return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }, "");
  }, [secondaryPoints]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${padding.top + chartHeight} L ${first.x} ${padding.top + chartHeight} Z`;
  }, [points, linePath, chartHeight, padding.top]);

  const secondaryAreaPath = useMemo(() => {
    if (!secondaryPoints || secondaryPoints.length === 0) return "";
    const first = secondaryPoints[0];
    const last = secondaryPoints[secondaryPoints.length - 1];
    return `${secondaryLinePath} L ${last.x} ${padding.top + chartHeight} L ${first.x} ${padding.top + chartHeight} Z`;
  }, [secondaryPoints, secondaryLinePath, chartHeight, padding.top]);

  // Y Axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => p * maxVal);

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-surface-low border border-outline-variant/10">
        <p className="text-body-sm text-on-surface-muted">No hay datos suficientes para graficar.</p>
      </div>
    );
  }

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const activeSecondaryPoint = hoveredIndex !== null && secondaryPoints ? secondaryPoints[hoveredIndex] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full overflow-visible"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="secAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--secondary)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--secondary)" stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((val, i) => {
          const y = padding.top + chartHeight - (val / maxVal) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={svgWidth - padding.right}
                y2={y}
                stroke="var(--color-outline-variant)"
                strokeOpacity={0.15}
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-on-surface-muted font-sans font-medium"
              >
                {valueFormatter(val)}
              </text>
            </g>
          );
        })}

        {/* X Axis ticks */}
        {data.map((d, i) => {
          // Show every Nth label to prevent overlapping
          const step = Math.ceil(data.length / 6);
          if (i % step !== 0 && i !== data.length - 1) return null;
          const x = padding.left + (i * chartWidth) / Math.max(1, data.length - 1);
          return (
            <text
              key={i}
              x={x}
              y={svgHeight - 15}
              textAnchor="middle"
              className="text-[10px] fill-on-surface-muted font-sans font-medium"
            >
              {d.label}
            </text>
          );
        })}

        {/* Filled Areas */}
        {secondaryAreaPath && (
          <path d={secondaryAreaPath} fill="url(#secAreaGradient)" className="transition-all duration-500" />
        )}
        <path d={areaPath} fill="url(#areaGradient)" className="transition-all duration-500" />

        {/* Stroke Lines */}
        {secondaryLinePath && (
          <path
            d={secondaryLinePath}
            fill="none"
            stroke="var(--secondary)"
            strokeWidth={2}
            strokeOpacity={0.65}
            className="transition-all duration-500"
          />
        )}
        <path
          d={linePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.5}
          className="transition-all duration-500"
        />

        {/* Vertical Indicator on hover */}
        {hoveredIndex !== null && (
          <line
            x1={points[hoveredIndex].x}
            y1={padding.top}
            x2={points[hoveredIndex].x}
            y2={padding.top + chartHeight}
            stroke="var(--color-on-surface-muted)"
            strokeOpacity={0.3}
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}

        {/* Interaction zones */}
        {data.map((d, i) => {
          const x = padding.left + (i * chartWidth) / Math.max(1, data.length - 1);
          return (
            <rect
              key={i}
              x={x - chartWidth / Math.max(1, data.length * 2)}
              y={padding.top}
              width={chartWidth / Math.max(1, data.length - 1)}
              height={chartHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
            />
          );
        })}

        {/* Line Dots */}
        {points.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isHovered ? 5 : 2}
              fill="var(--primary)"
              stroke="var(--surface)"
              strokeWidth={isHovered ? 2 : 0}
              className="transition-all duration-200 pointer-events-none"
            />
          );
        })}

        {secondaryPoints?.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isHovered ? 5 : 2}
              fill="var(--secondary)"
              stroke="var(--surface)"
              strokeWidth={isHovered ? 2 : 0}
              className="transition-all duration-200 pointer-events-none"
            />
          );
        })}
      </svg>

      {/* Floating HTML Tooltip */}
      {hoveredIndex !== null && activePoint && (
        <div
          className="absolute z-10 rounded-lg border border-outline-variant/15 glass px-3 py-2 shadow-ambient text-xs text-on-surface animate-fade-in pointer-events-none"
          style={{
            left: `${(activePoint.x / svgWidth) * 100}%`,
            top: `${(Math.min(activePoint.y, activeSecondaryPoint?.y ?? activePoint.y) / svgHeight) * 100 - 15}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-semibold text-secondary">{activePoint.label}</p>
          <div className="mt-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-on-surface-muted">
                {secondaryPoints ? "Ingresos / GMV:" : "Valor:"}
              </span>
              <span className="font-mono font-medium">{valueFormatter(activePoint.value)}</span>
            </div>
            {activeSecondaryPoint && (
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                <span className="text-on-surface-muted">Egresos / Comisiones:</span>
                <span className="font-mono font-medium">{valueFormatter(activeSecondaryPoint.value)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- BAR CHART ---
export function BarChart({
  data,
  height = 300,
  valueFormatter = formatCurrency,
}: ChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const padding = { top: 25, right: 20, bottom: 40, left: 60 };
  const svgWidth = 600;
  const svgHeight = height;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const hasData = data && data.length > 0;
  const maxVal = useMemo(() => {
    if (!hasData) return 1;
    const values = data.flatMap(d => [d.value, d.secondaryValue ?? 0]);
    const max = Math.max(...values);
    return max === 0 ? 1 : max * 1.15;
  }, [data, hasData]);

  const hasSecondary = data.some(d => d.secondaryValue !== undefined);

  // Grid ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => p * maxVal);

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-surface-low border border-outline-variant/10">
        <p className="text-body-sm text-on-surface-muted">No hay datos suficientes para graficar.</p>
      </div>
    );
  }

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full overflow-visible"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Grid lines */}
        {yTicks.map((val, i) => {
          const y = padding.top + chartHeight - (val / maxVal) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={svgWidth - padding.right}
                y2={y}
                stroke="var(--color-outline-variant)"
                strokeOpacity={0.15}
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-on-surface-muted font-sans font-medium"
              >
                {valueFormatter(val)}
              </text>
            </g>
          );
        })}

        {/* X Axis labels */}
        {data.map((d, i) => {
          const step = Math.ceil(data.length / 8);
          if (i % step !== 0 && i !== data.length - 1) return null;
          const x = padding.left + ((i + 0.5) * chartWidth) / data.length;
          return (
            <text
              key={i}
              x={x}
              y={svgHeight - 15}
              textAnchor="middle"
              className="text-[10px] fill-on-surface-muted font-sans font-medium"
            >
              {d.label}
            </text>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const groupWidth = chartWidth / data.length;
          const xCenter = padding.left + i * groupWidth + groupWidth / 2;
          const isHovered = hoveredIndex === i;

          if (hasSecondary) {
            const barW = groupWidth * 0.35;
            const h1 = (d.value / maxVal) * chartHeight;
            const h2 = ((d.secondaryValue ?? 0) / maxVal) * chartHeight;
            const y1 = padding.top + chartHeight - h1;
            const y2 = padding.top + chartHeight - h2;

            return (
              <g key={i} onMouseEnter={() => setHoveredIndex(i)} className="cursor-pointer">
                {/* Main Series Bar */}
                <path
                  d={`
                    M ${xCenter - barW - 1} ${padding.top + chartHeight}
                    L ${xCenter - barW - 1} ${y1 + 4}
                    A 4 4 0 0 1 ${xCenter - 1} ${y1}
                    L ${xCenter - 1} ${padding.top + chartHeight}
                    Z
                  `}
                  fill={isHovered ? "var(--primary)" : "var(--color-primary-container)"}
                  className="transition-all duration-300"
                />
                {/* Secondary Series Bar */}
                <path
                  d={`
                    M ${xCenter + 1} ${padding.top + chartHeight}
                    L ${xCenter + 1} ${y2 + 4}
                    A 4 4 0 0 1 ${xCenter + barW + 1} ${y2}
                    L ${xCenter + barW + 1} ${padding.top + chartHeight}
                    Z
                  `}
                  fill={isHovered ? "var(--secondary)" : "var(--color-secondary)"}
                  opacity={isHovered ? 1 : 0.65}
                  className="transition-all duration-300"
                />
              </g>
            );
          } else {
            const barW = groupWidth * 0.55;
            const h = (d.value / maxVal) * chartHeight;
            const y = padding.top + chartHeight - h;

            return (
              <path
                key={i}
                d={`
                  M ${xCenter - barW / 2} ${padding.top + chartHeight}
                  L ${xCenter - barW / 2} ${y + 4}
                  A 4 4 0 0 1 ${xCenter + barW / 2} ${y}
                  L ${xCenter + barW / 2} ${padding.top + chartHeight}
                  Z
                `}
                fill={isHovered ? "var(--primary)" : "var(--color-primary-container)"}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            );
          }
        })}
      </svg>

      {/* Floating HTML Tooltip */}
      {hoveredIndex !== null && activeItem && (
        <div
          className="absolute z-10 rounded-lg border border-outline-variant/15 glass px-3 py-2 shadow-ambient text-xs text-on-surface animate-fade-in pointer-events-none"
          style={{
            left: `${((padding.left + (hoveredIndex + 0.5) * (chartWidth / data.length)) / svgWidth) * 100}%`,
            top: `${(padding.top + 30) / svgHeight * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-semibold text-secondary">{activeItem.label}</p>
          <div className="mt-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-on-surface-muted">
                {hasSecondary ? "Volumen:" : "Transacciones:"}
              </span>
              <span className="font-mono font-medium">
                {hasSecondary ? valueFormatter(activeItem.value) : activeItem.value}
              </span>
            </div>
            {hasSecondary && activeItem.secondaryValue !== undefined && (
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                <span className="text-on-surface-muted">Comisiones:</span>
                <span className="font-mono font-medium">
                  {valueFormatter(activeItem.secondaryValue)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- DONUT CHART ---
interface DonutDataPoint {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDataPoint[];
  height?: number;
  valueFormatter?: (val: number) => string;
}

export function DonutChart({
  data,
  height = 220,
  valueFormatter = (val) => `${val}`,
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = useMemo(() => {
    return data.reduce((acc, d) => acc + d.value, 0);
  }, [data]);

  const segments = useMemo(() => {
    let accumulatedPercent = 0;
    const r = 50;
    const circ = 2 * Math.PI * r;

    return data.map((d, i) => {
      const percent = total > 0 ? (d.value / total) * 100 : 0;
      const strokeLength = (percent * circ) / 100;
      const strokeOffset = circ - accumulatedPercent + (circ / 4); // Start at top (12 o'clock)
      accumulatedPercent += strokeLength;

      return {
        ...d,
        percent,
        strokeLength,
        strokeOffset,
        radius: r,
        circumference: circ,
      };
    });
  }, [data, total]);

  if (total === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-surface-low border border-outline-variant/10">
        <p className="text-body-sm text-on-surface-muted">No hay transacciones registradas.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
      {/* Donut SVG */}
      <div className="relative" style={{ width: height, height }}>
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
          <circle
            cx="70"
            cy="70"
            r="50"
            fill="transparent"
            stroke="var(--color-outline-variant)"
            strokeOpacity={0.1}
            strokeWidth="14"
          />
          {segments.map((seg, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={seg.radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? "17" : "14"}
                strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                strokeDashoffset={seg.strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer origin-center"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {hoveredIndex !== null ? (
            <div className="animate-fade-in px-2">
              <p className="text-[10px] text-on-surface-muted font-label-md truncate max-w-[110px]">
                {segments[hoveredIndex].label}
              </p>
              <p className="text-headline-md font-semibold text-on-surface">
                {Math.round(segments[hoveredIndex].percent)}%
              </p>
              <p className="text-[10px] text-on-surface-muted font-mono">
                {valueFormatter(segments[hoveredIndex].value)}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-on-surface-muted font-label-md">Total</p>
              <p className="text-headline-lg font-semibold text-on-surface">{valueFormatter(total)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Legends Grid */}
      <div className="flex flex-col gap-2.5 shrink-0 justify-center">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors duration-200 cursor-pointer ${
              hoveredIndex === i ? "bg-surface-low text-on-surface" : "text-on-surface-muted hover:text-on-surface"
            }`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <div className="flex flex-col">
              <span className="text-body-sm font-medium leading-none">{seg.label}</span>
              <span className="text-[10px] font-mono text-on-surface-muted mt-0.5">
                {valueFormatter(seg.value)} ({Math.round(seg.percent)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
