// tests/__mocks__/recharts.ts
// Vitest-compatible mock for Recharts components
// Recharts uses browser APIs (ResizeObserver, getBoundingClientRect) not available in Vitest's node environment

import React from 'react'

export const BarChart = () => null
export const Bar = () => null
export const PieChart = () => null
export const Pie = () => null
export const Cell = () => null
export const LineChart = () => null
export const Line = () => null
export const XAxis = () => null
export const YAxis = () => null
export const Tooltip = () => null
export const Legend = () => null
export const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => children as any
export const ComposedChart = () => null

export default {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
}
