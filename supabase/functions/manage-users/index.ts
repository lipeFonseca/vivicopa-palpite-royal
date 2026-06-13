import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INTERNAL_AUTH_DOMAIN = "vivicopa.internal";

type ManagedUser = {
  id: string;
  username: string;
  email: string | null;
  role: "admin" | "user";
  auth_email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("authorization");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase server secrets nao configurados" }, 500);
  }

  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Sessao invalida" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: requester, error: requesterError } = await admin.auth.getUser(token);
  if (requesterError || !requester.user) return json({ error: "Sessao invalida" }, 401);

  const { data: requesterProfile, error: requesterProfileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", requester.user.id)
    .maybeSingle();

  if (requesterProfileError) return json({ error: requesterProfileError.message }, 500);
  if (requesterProfile?.role !== "admin") {
    return json({ error: "Apenas administradores podem gerenciar usuarios" }, 403);
  }

  if (req.method === "GET") {
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id,username,email,role,created_at")
      .order("created_at", { ascending: true });

    if (profilesError) return json({ error: profilesError.message }, 500);

    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authError) return json({ error: authError.message }, 500);

    const authById = new Map(authUsers.users.map((user) => [user.id, user]));
    const users: ManagedUser[] = (profiles ?? []).map((profile) => {
      const authUser = authById.get(profile.id);
      return {
        id: profile.id,
        username: profile.username,
        email: profile.email ?? null,
        role: profile.role === "admin" ? "admin" : "user",
        auth_email: authUser?.email ?? null,
        created_at: profile.created_at ?? authUser?.created_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
      };
    });

    return json({ users });
  }

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return json({ error: "Usuario invalido" }, 400);

  const { data: targetProfile, error: targetError } = await admin
    .from("profiles")
    .select("id,username,role")
    .eq("id", id)
    .maybeSingle();

  if (targetError) return json({ error: targetError.message }, 500);
  if (!targetProfile) return json({ error: "Usuario nao encontrado" }, 404);

  if (req.method === "DELETE") {
    if (id === requester.user.id) return json({ error: "Voce nao pode apagar o proprio usuario." }, 400);

    if (targetProfile.role === "admin") {
      const { count, error: countError } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) return json({ error: countError.message }, 500);
      if ((count ?? 0) <= 1) return json({ error: "Nao e possivel apagar o ultimo administrador." }, 400);
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (req.method !== "PATCH") return json({ error: "Metodo nao permitido" }, 405);

  const username = normalizeUsername(String(body?.username ?? targetProfile.username));
  const emailRaw = String(body?.email ?? "").trim();
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  const password = String(body?.password ?? "");
  const role = body?.role === "admin" ? "admin" : "user";

  if (!USERNAME_PATTERN.test(username)) {
    return json({ error: "Usuario deve ter 3 a 32 caracteres e usar apenas letras, numeros, ponto, hifen ou underline" }, 400);
  }
  if (email && !EMAIL_PATTERN.test(email)) return json({ error: "Informe um e-mail valido" }, 400);
  if (password && (password.length < 6 || password.length > 128)) {
    return json({ error: "Senha precisa ter entre 6 e 128 caracteres" }, 400);
  }

  const { data: usernameOwner, error: usernameOwnerError } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", id)
    .maybeSingle();
  if (usernameOwnerError) return json({ error: usernameOwnerError.message }, 500);
  if (usernameOwner) return json({ error: "Este usuario ja existe. Escolha outro nome de usuario." }, 400);

  if (email) {
    const { data: emailOwner, error: emailOwnerError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .neq("id", id)
      .maybeSingle();
    if (emailOwnerError) return json({ error: emailOwnerError.message }, 500);
    if (emailOwner) return json({ error: "Este e-mail ja esta em uso por outro usuario." }, 400);
  }

  if (id === requester.user.id && role !== "admin") {
    return json({ error: "Voce nao pode remover seu proprio acesso admin." }, 400);
  }

  if (targetProfile.role === "admin" && role !== "admin") {
    const { count, error: countError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) return json({ error: countError.message }, 500);
    if ((count ?? 0) <= 1) return json({ error: "Nao e possivel remover o ultimo administrador." }, 400);
  }

  const authUpdate: Record<string, unknown> = {
    email: usernameToEmail(username),
    email_confirm: true,
    app_metadata: { role, username },
    user_metadata: { username, contact_email: email },
  };
  if (password) authUpdate.password = password;

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(id, authUpdate);
  if (authUpdateError) return json({ error: authUpdateError.message }, 400);

  const { error: profileError } = await admin
    .from("profiles")
    .update({ username, email, role, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (profileError) return json({ error: profileError.message }, 500);

  return json({ ok: true });
});

