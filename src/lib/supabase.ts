// Importa a função oficial que cria a ponte entre o Next.js e o Supabase
import { createClient } from "@supabase/supabase-js";

// Lê as duas variáveis que você guardou no arquivo .env.local.
// O ponto de exclamação (!) no final avisa ao TypeScript:
// "garanto que esses valores existem, não são nulos".
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cria e exporta o cliente 'supabase' para usarmos nas consultas ao banco e no login
export const supabase = createClient(supabaseUrl, supabaseAnonKey);