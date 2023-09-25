import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { v4 as uuidv4 } from "uuid";

export default async function getId() {
  const supabase = createClientComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session ? session.user.id : `anon_${uuidv4()}`;
  return { userId, session };
}
