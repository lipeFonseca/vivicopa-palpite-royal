import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INTERNAL_AUTH_DOMAIN = "vivicopa.internal";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${INTERNAL_AUTH_DOMAIN}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Metodo nao permitido" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("authorization");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase server secrets nao configurados" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const body = await req.json().catch(() => null);
  const username = normalizeUsername(String(body?.username ?? ""));
  const password = String(body?.password ?? "");
  const contactEmail = normalizeEmail(String(body?.email ?? ""));
  const publicSignup = body?.publicSignup === true;

  if (!USERNAME_PATTERN.test(username)) {
    return json(
      { error: "Usuario deve ter 3 a 32 caracteres e usar apenas letras, numeros, ponto, hifen ou underline" },
      400,
    );
  }

  if (password.length < 6 || password.length > 128) {
    return json({ error: "Senha precisa ter entre 6 e 128 caracteres" }, 400);
  }

  if (publicSignup && !EMAIL_PATTERN.test(contactEmail)) {
    return json({ error: "Informe um e-mail valido" }, 400);
  }

  if (!publicSignup) {
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Sessao invalida" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: requester, error: requesterError } = await admin.auth.getUser(token);

    if (requesterError || !requester.user) {
      return json({ error: "Sessao invalida" }, 401);
    }

    const { data: requesterProfile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", requester.user.id)
      .maybeSingle();

    if (profileError) {
      return json({ error: profileError.message }, 500);
    }

    if (requesterProfile?.role !== "admin") {
      return json({ error: "Apenas administradores podem criar usuarios" }, 403);
    }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    app_metadata: {
      role: "user",
      username,
    },
    user_metadata: {
      username,
      contact_email: publicSignup ? contactEmail : null,
    },
  });

  if (createError) {
    const message = createError.message.toLowerCase().includes("already")
      ? "Este usuario ja existe. Escolha outro nome de usuario."
      : createError.message;
    return json({ error: message }, 400);
  }

  if (!created.user) {
    return json({ error: "Nao foi possivel criar o usuario" }, 500);
  }

  const { error: profileUpsertError } = await admin.from("profiles").upsert({
    id: created.user.id,
    username,
    email: publicSignup ? contactEmail : null,
    role: "user",
    updated_at: new Date().toISOString(),
  });

  if (profileUpsertError) {
    return json({ error: profileUpsertError.message }, 500);
  }

  return json({ id: created.user.id, username });
});
