import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { v4 as uuidv4 } from "uuid";

export async function getId() {
  const supabase = createClientComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session ? session.user.id : `anon_${uuidv4()}`;
  return { userId, session };
}

export async function signOut() {
  const supabase = createClientComponentClient();
  await supabase.auth.signOut();
}
