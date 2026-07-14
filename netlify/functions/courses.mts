import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const DEFAULT_COURSES = [
  { id: "digital", title: "Marketing Digital & Réseaux Sociaux", priceGNF: 50000, priceUSDT: 5, status: "live" },
  { id: "marketing360", title: "Marketing 360°", priceGNF: 60000, priceUSDT: 6, status: "live" },
  { id: "trading", title: "Trading des indices synthétiques", priceGNF: 50000, priceUSDT: 5, status: "live" },
  { id: "oratoire", title: "Art Oratoire", priceGNF: 45000, priceUSDT: 4.5, status: "live" },
  { id: "bots", title: "Création des bots WhatsApp", priceGNF: 70000, priceUSDT: 7, status: "live" },
  { id: "chine", title: "Achat en Chine", priceGNF: 65000, priceUSDT: 6.5, status: "live" },
  { id: "cash", title: "Machine à Cash", priceGNF: null, priceUSDT: null, status: "soon" },
  { id: "revente", title: "Revente Produits Digitaux", priceGNF: 55000, priceUSDT: 5.5, status: "live" },
  { id: "ia", title: "Création de Contenu avec IA", priceGNF: 60000, priceUSDT: 6, status: "live" },
];

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const store = getStore("racine-courses");
  let courses = await store.get("catalog", { type: "json" });

  if (!courses) {
    courses = DEFAULT_COURSES;
    await store.setJSON("catalog", courses);
  }

  return new Response(JSON.stringify({ courses }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/courses",
};
