import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export type ReportAsset = {
  symbol: string;
  name: string;
  weightPct: number;
  currentValue: number;
};

export type ReportAlert = {
  severity: string;
  message: string;
  triggeredAt: string;
  acknowledged: boolean;
};

export type PortfolioReportData = {
  generatedAt: string;
  portfolio: {
    id: string;
    name: string;
    totalValue: number;
  };
  metrics: {
    var95: number;
    var99: number;
    sharpe: number;
    beta: number;
    alpha: number;
    maxDrawdown: number;
    volatility: number;
    dailyPnl: number;
  };
  assets: ReportAsset[];
  alerts: ReportAlert[];
  monteCarlo: {
    mean: number;
    upper95: number;
    lower95: number;
    range: number;
  };
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  subtitle: { fontSize: 10, color: '#475569', marginBottom: 14 },
  section: { marginBottom: 12, border: '1px solid #e2e8f0', padding: 10, borderRadius: 4 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#0f172a' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#334155' },
  value: { color: '#0f172a', fontWeight: 600 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    padding: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderLeft: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
    padding: 6,
  },
  colSymbol: { width: '22%' },
  colName: { width: '34%' },
  colWeight: { width: '18%', textAlign: 'right' },
  colValue: { width: '26%', textAlign: 'right' },
  small: { fontSize: 9, color: '#64748b' },
});

function inr(value: number) {
  return `INR ${Math.round(value).toLocaleString('en-IN')}`;
}

export function PortfolioReportDocument({ data }: { data: PortfolioReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>RiskOS Portfolio Risk Report</Text>
        <Text style={styles.subtitle}>Generated: {new Date(data.generatedAt).toLocaleString('en-IN')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Portfolio Name</Text>
            <Text style={styles.value}>{data.portfolio.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Portfolio ID</Text>
            <Text style={styles.value}>{data.portfolio.id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Value</Text>
            <Text style={styles.value}>{inr(data.portfolio.totalValue)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KPI Table</Text>
          <View style={styles.row}><Text style={styles.label}>VaR (95%)</Text><Text style={styles.value}>{inr(data.metrics.var95)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>VaR (99%)</Text><Text style={styles.value}>{inr(data.metrics.var99)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Sharpe</Text><Text style={styles.value}>{data.metrics.sharpe.toFixed(3)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Beta</Text><Text style={styles.value}>{data.metrics.beta.toFixed(3)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Alpha</Text><Text style={styles.value}>{data.metrics.alpha.toFixed(4)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Max Drawdown</Text><Text style={styles.value}>{data.metrics.maxDrawdown.toFixed(2)}%</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asset Allocation Breakdown</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colSymbol}>Symbol</Text>
            <Text style={styles.colName}>Name</Text>
            <Text style={styles.colWeight}>Weight</Text>
            <Text style={styles.colValue}>Current Value</Text>
          </View>
          {data.assets.slice(0, 12).map((a) => (
            <View key={`${a.symbol}-${a.name}`} style={styles.tableRow}>
              <Text style={styles.colSymbol}>{a.symbol}</Text>
              <Text style={styles.colName}>{a.name}</Text>
              <Text style={styles.colWeight}>{a.weightPct.toFixed(2)}%</Text>
              <Text style={styles.colValue}>{inr(a.currentValue)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk Alerts Summary</Text>
          {data.alerts.length === 0 ? (
            <Text style={styles.small}>No alerts recorded.</Text>
          ) : (
            data.alerts.slice(0, 8).map((a, i) => (
              <View key={`${a.message}-${i}`} style={styles.row}>
                <Text style={styles.label}>[{a.severity.toUpperCase()}] {a.message}</Text>
                <Text style={styles.small}>{new Date(a.triggeredAt).toLocaleDateString('en-IN')}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monte Carlo Snapshot (30d)</Text>
          <View style={styles.row}><Text style={styles.label}>Mean</Text><Text style={styles.value}>{inr(data.monteCarlo.mean)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>95% Upper</Text><Text style={styles.value}>{inr(data.monteCarlo.upper95)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>95% Lower</Text><Text style={styles.value}>{inr(data.monteCarlo.lower95)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Range</Text><Text style={styles.value}>{inr(data.monteCarlo.range)}</Text></View>
        </View>
      </Page>
    </Document>
  );
}

