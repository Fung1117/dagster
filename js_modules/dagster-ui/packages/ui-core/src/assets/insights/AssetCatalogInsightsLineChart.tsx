import {
  BodySmall,
  Box,
  CaptionMono,
  Colors,
  FontFamily,
  Spinner,
  Subheading,
} from '@dagster-io/ui-components';
import {
  CategoryScale,
  ChartData,
  Chart as ChartJS,
  ChartOptions,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import React, {useCallback, useMemo, useRef} from 'react';
import {Line} from 'react-chartjs-2';

import styles from './AssetCatalogLineChart.module.css';
import {AssetCatalogMetricNames} from './AssetCatalogMetricUtils';
import {Context, useRenderChartTooltip} from './renderChartTooltip';
import {useRGBColorsForTheme} from '../../app/useRGBColorsForTheme';
import {TooltipCard} from '../../insights/InsightsChartShared';
import {formatMetric} from '../../insights/formatMetric';
import {ReportingUnitType} from '../../insights/types';
import {numberFormatter, percentFormatter} from '../../ui/formatters';
import {useFormatDateTime} from '../../ui/useFormatDateTime';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip);

export type LineChartMetrics = {
  title: string;
  color: string;
  timestamps: number[];
  pctChange: number | null;
  currentPeriod: {
    label: string;
    data: (number | null)[];
    aggregateValue: number | null;
    color: string;
  };
  prevPeriod: {
    label: string;
    data: (number | null)[];
    color: string;
  };
};

const getDataset = (
  metrics: LineChartMetrics,
  formatDatetime: (date: Date, options: Intl.DateTimeFormatOptions) => string,
): ChartData<'line', (number | null)[], string> => {
  const start = metrics.timestamps.length
    ? formatDatetime(new Date(metrics.timestamps[0]! * 1000), {
        month: 'short',
        day: 'numeric',
      })
    : '';
  const end = metrics.timestamps.length
    ? formatDatetime(new Date(metrics.timestamps[metrics.timestamps.length - 1]! * 1000), {
        month: 'short',
        day: 'numeric',
      })
    : '';

  const labels = metrics.timestamps.length
    ? [start, ...Array(metrics.timestamps.length - 2).fill(''), end]
    : [];

  return {
    labels,
    datasets: [
      {
        label: metrics.currentPeriod.label,
        data: metrics.currentPeriod.data,
        borderColor: metrics.currentPeriod.color,
        backgroundColor: 'transparent',
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: metrics.prevPeriod.label,
        data: metrics.prevPeriod.data,
        borderColor: metrics.prevPeriod.color,
        backgroundColor: 'transparent',
        pointRadius: 0,
        borderWidth: 1,
      },
    ],
  };
};

export const AssetCatalogInsightsLineChart = React.memo(
  ({
    metrics,
    loading,
    unitType,
    openMetricDialog,
    metricName,
  }: {
    metrics: LineChartMetrics;
    loading: boolean;
    unitType: ReportingUnitType;
    openMetricDialog: (data: {
      after: number;
      before: number;
      metric: AssetCatalogMetricNames;
      unit: string;
    }) => void;
    metricName: AssetCatalogMetricNames;
  }) => {
    const formatDatetime = useFormatDateTime();
    const rgbColors = useRGBColorsForTheme();

    const renderTooltipFn = useRenderChartTooltip(
      useCallback(
        ({context}: {context: Context}) => {
          const {tooltip} = context;
          const currentPeriodDataPoint = tooltip.dataPoints[0]!;
          const prevPeriodDataPoint = tooltip.dataPoints[1]!;
          const date = formatDatetime(
            new Date(metrics.timestamps[currentPeriodDataPoint.dataIndex]! * 1000),
            {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
            },
          );
          const currentPeriodMetric = metrics.currentPeriod.data[currentPeriodDataPoint.dataIndex];
          return (
            <TooltipCard>
              <Box flex={{direction: 'column', gap: 8}} padding={{vertical: 8, horizontal: 12}}>
                <Box border="bottom" padding={{bottom: 8}}>
                  <Subheading>{date}</Subheading>
                </Box>
                <div>
                  <Box
                    flex={{direction: 'row', justifyContent: 'space-between'}}
                    margin={{bottom: 4}}
                  >
                    <Box flex={{direction: 'row', alignItems: 'center', gap: 8}}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          backgroundColor: metrics.currentPeriod.color,
                          borderRadius: '50%',
                        }}
                      />
                      <BodySmall>Current period</BodySmall>
                    </Box>
                    <Box flex={{direction: 'row', alignItems: 'center', gap: 4}}>
                      <CaptionMono>{currentPeriodDataPoint?.formattedValue ?? 0}</CaptionMono>
                      <BodySmall color={Colors.textLight()}>{unitTypeToLabel[unitType]}</BodySmall>
                    </Box>
                  </Box>
                  <Box flex={{direction: 'row', justifyContent: 'space-between'}}>
                    <Box flex={{direction: 'row', alignItems: 'center', gap: 8}}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          backgroundColor: metrics.prevPeriod.color,
                          borderRadius: '50%',
                        }}
                      />
                      <BodySmall>Previous period</BodySmall>
                    </Box>
                    <Box flex={{direction: 'row', alignItems: 'center', gap: 4}}>
                      <CaptionMono>{prevPeriodDataPoint?.formattedValue ?? 0}</CaptionMono>
                      <BodySmall color={Colors.textLight()}>{unitTypeToLabel[unitType]}</BodySmall>
                    </Box>
                  </Box>
                </div>
                {currentPeriodMetric ? (
                  <BodySmall color={Colors.textLight()}>Click for asset breakdown</BodySmall>
                ) : null}
              </Box>
            </TooltipCard>
          );
        },
        [formatDatetime, metrics, unitType],
      ),
      useMemo(() => ({side: 'top', sideOffset: 50, align: 'start', alignOffset: 50}), []),
    );

    const options: ChartOptions<'line'> = useMemo(
      () => ({
        plugins: {
          legend: {display: false},
          tooltip: {
            enabled: false,
            position: 'nearest',
            external: renderTooltipFn,
          },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
        scales: {
          x: {
            ticks: {
              color: rgbColors[Colors.textLight()],
              maxRotation: 0,
              minRotation: 0,
              autoSkip: false,
              includeBounds: true,
            },
          },
          y: {
            grid: {color: rgbColors[Colors.keylineDefault()]},
            beginAtZero: true,
            ticks: {
              color: rgbColors[Colors.textLight()],
              font: {
                size: 12,
                family: FontFamily.monospace,
              },
              callback(value: string | number) {
                return formatMetric(value, unitType, {
                  integerFormat: 'compact',
                  floatPrecision: 'maximum-precision',
                  floatFormat: 'compact-above-threshold',
                });
              },
            },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      }),
      [renderTooltipFn, rgbColors, unitType],
    );

    const chartRef = useRef(null);
    const onClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!chartRef.current) {
        return;
      }

      const chart = ChartJS.getChart(chartRef.current);
      if (!chart) {
        return;
      }

      const clickedElements = chart.getElementsAtEventForMode(
        event.nativeEvent,
        'y',
        {axis: 'x', intersect: false},
        false, // get elements in the clicked position even if animations are not completed
      );

      if (clickedElements.length > 0) {
        const element = clickedElements[0];
        if (element) {
          const index = element.index;
          let timeSliceSeconds = 60 * 60; // Default to 1 hour
          if (metrics.timestamps.length >= 2) {
            const timeSliceStart = metrics.timestamps[0];
            const timeSliceEnd = metrics.timestamps[1];
            if (timeSliceStart && timeSliceEnd) {
              timeSliceSeconds = timeSliceEnd - timeSliceStart;
            }
          }

          const before = metrics.timestamps[index]!;
          const after = before - timeSliceSeconds;

          // Only open the dialog if data exists for the clicked index
          // in the current period
          if (metrics.currentPeriod.data[index]) {
            openMetricDialog({
              after,
              before,
              metric: metricName,
              unit: unitType,
            });
          }
        }
      }
    };

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <Box flex={{direction: 'row', gap: 4, justifyContent: 'space-between'}}>
            <Subheading>{metrics.title}</Subheading>
            {loading ? <Spinner purpose="body-text" /> : null}
          </Box>
        </div>
        <Box flex={{direction: 'row', justifyContent: 'space-between'}}>
          <div className={styles.chartCount}>
            {metrics.currentPeriod.aggregateValue
              ? numberFormatter.format(Math.round(metrics.currentPeriod.aggregateValue))
              : 0}
            <BodySmall color={Colors.textLight()}>{unitTypeToLabel[unitType]}</BodySmall>
          </div>
          <div className={styles.chartChange}>
            {percentFormatter.format(metrics.pctChange ?? 0)}
          </div>
        </Box>
        <div className={styles.chartWrapper}>
          <div className={styles.chartGraph}>
            <Line
              ref={chartRef}
              data={getDataset(metrics, formatDatetime)}
              options={options}
              onClick={onClick}
              updateMode="none"
            />
          </div>
        </div>
      </div>
    );
  },
);

const unitTypeToLabel: Record<ReportingUnitType, string> = {
  [ReportingUnitType.TIME_MS]: 'ms',
  [ReportingUnitType.INTEGER]: '',
  [ReportingUnitType.FLOAT]: '',
};
