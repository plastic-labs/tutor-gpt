"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { request } from "@arcjet/next";
import { siteSignupProtectionClient } from "@/utils/arcjet";

import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return "error";
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const req = await request();

  const decision = await siteSignupProtectionClient.protect(req, {
    email: data.email,
  });

  if (decision.isDenied()) {
    console.log("Decision", decision);
    if (decision.reason.isEmail()) {
      return "Invalid Email";
    }
    return "Forbidden";
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(data);

  if (error) {
    console.error(error);
    return error;
  }

  return;
}
