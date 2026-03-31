// ── Data Models ──

export interface Business {
  business_id: string;
  name: string;
  phone_numbers: string[];
  voice_config: VoiceConfig;
  master_config: MasterConfig;
  created_at: string;
  updated_at: string;
}

export interface VoiceConfig {
  voice: string;
  language: string;
  personality_prompt: string;
  pipeline?: string;
  cartesia_voice_id?: string;
}

export interface MasterConfig {
  temperature: number;
  max_specialists_per_turn: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AgentDefinition {
  business_id: string;
  agent_id: string;
  description: string;
  system_prompt: string;
  tools: ToolDefinition[];
  knowledge_sources: string[];
  trigger_tags: string[];
  enabled: boolean;
  stats: AgentStats;
}

export interface AgentStats {
  total_invocations: number;
  resolved_invocations: number;
  avg_latency_ms: number;
  avg_caller_rating: number;
}

// ── Auth ──

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

// ── Usage ──

export interface UsageSummary {
  total_calls: number;
  total_minutes: number;
  total_cost: number;
  period_start: string;
  period_end: string;
}

export interface UsageDetail {
  resource_id: string;
  resource_type: string;
  resource_name: string;
  calls: number;
  minutes: number;
  cost: number;
}

// ── Billing ──

export interface Subscription {
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  monthly_cost: number;
  usage_limit: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  pdf_url?: string;
}

// ── API Keys ──

export interface ApiKey {
  prefix: string;
  name: string;
  created_at: string;
  last_used_at?: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string; // full key, only shown on creation
}

// ── Config ──

export interface DavoxiConfig {
  api_key?: string;
  api_url?: string;
  access_token?: string;
  refresh_token?: string;
}

