/**
 * Shared TypeScript types for the SCANNR Dashboard.
 * These mirror the API response schemas defined in server.js.
 */

export interface DashboardStats {
  throughput: number;
  containers_today: number;
  avg_clearance_time: string;
  ai_accuracy: number;
  active_alerts: number;
  green_lane_pct: number;
  red_lane_count: number;
  yellow_lane_count: number;
  green_lane_count: number;
  system_health: { healthy: number; total: number };
}

export interface Container {
  id: string;
  type: string;
  origin: string;
  flag: string;
  status: string;
  risk_score: number;
  lane: 'GREEN' | 'YELLOW' | 'RED';
  operator: string;
  cargo_category: string;
  hs_code: string;
  created_at: string;
}

export interface ServiceInfo {
  name: string;
  description: string;
  status: string;
  latency: string;
  uptime: number;
  port: number;
}

export interface Operator {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: string;
  assigned: number;
  accuracy: number;
  shift: string;
  color: string;
}

export interface Importer {
  name: string;
  gstin: string;
  trust_score: number;
  registered_since: string;
  years_active: number;
  aeo_tier: string;
  total_inspections: number;
  violations: number;
  sanctions_match: boolean;
  block_hash: string;
  block_number: number;
}

export interface MLModelInfo {
  current_version: string;
  current_accuracy: number;
  ab_test_version: string;
  ab_test_traffic: number;
  samples_queued: number;
  retrain_trigger: number;
  last_retrain: string;
  next_retrain_estimate: string;
  weekly_accuracy: number[];
}

export type ViewPage = 'dashboard' | 'queue' | 'health' | 'operators';
