import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://wtzklaumnzezgzgzllgn.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pecBj0lN9DEWnwMAxwiazw_5ik8Xj3-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
