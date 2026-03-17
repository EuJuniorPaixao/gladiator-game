import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
}

export async function saveScore(playerName: string, score: number): Promise<void> {
  const { error } = await supabase
    .from('leaderboard')
    .insert({ player_name: playerName, score });
  if (error) throw error;
}

export async function getTopScores(limit = 10): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
