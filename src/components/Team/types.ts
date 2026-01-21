export interface CRMUser {
  id: string;
  email: string;
  real_name: string;
  role: 'admin' | 'manager' | 'team_leader' | 'conversion' | 'retention' | 'compliance';
  team_leader_id: string | null;
  allowed_sources: string | null;
  is_synced?: boolean; // <--- This tracks if they are synced in Trading Platform
}