import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

function generateCode(courseId: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${courseId.toUpperCase()}-${random}`;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  const courseId: string | undefined = body?.courseId;
  const adminKey: string | undefined = body?.adminKey;

  const expectedAdminKey = Netlify.env.get("ADMIN_KEY");
  if (!expectedAdminKey || adminKey !== expectedAdminKey) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!courseId) {
    return new Response(JSON.stringify({ error: "courseId requis" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const code = generateCode(courseId);
  const codesStore = getStore("racine-access-codes");
  await codesStore.setJSON(code, {
    courseId,
    issuedManually: true,
    createdAt: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ success: true, code }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/admin/admin.mts",
};
