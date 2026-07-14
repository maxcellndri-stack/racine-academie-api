import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const USDT_BEP20_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const COURSE_PRICES_USDT: Record<string, number> = {
  digital: 5,
  marketing360: 6,
  trading: 5,
  oratoire: 4.5,
  bots: 7,
  chine: 6.5,
  revente: 5.5,
  ia: 6,
};

function generateCode(courseId: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${courseId.toUpperCase()}-${random}`;
}

function topicToAddress(topic: string) {
  return `0x${topic.slice(-40)}`.toLowerCase();
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
  const txHash: string | undefined = body?.txHash;

  if (!courseId || !txHash) {
    return new Response(
      JSON.stringify({ error: "courseId et txHash sont requis" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const expectedAmount = COURSE_PRICES_USDT[courseId];
  if (expectedAmount === undefined) {
    return new Response(JSON.stringify({ error: "Cours inconnu" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rpcUrl = Netlify.env.get("BSC_RPC_URL");
  const receivingWallet = Netlify.env.get("RECEIVING_WALLET");

  if (!rpcUrl || !receivingWallet) {
    return new Response(
      JSON.stringify({
        error:
          "Configuration serveur manquante (BSC_RPC_URL ou RECEIVING_WALLET)",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const purchasesStore = getStore("racine-purchases");
  const alreadyUsed = await purchasesStore.get(txHash, { type: "json" });
  if (alreadyUsed) {
    return new Response(
      JSON.stringify({ error: "Cette transaction a déjà été utilisée" }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  const txRes = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [txHash],
      id: 1,
    }),
  });
  const txData = await txRes.json();

  if (!txData?.result) {
    return new Response(JSON.stringify({ error: "Transaction introuvable" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const logs: any[] = txData.result.logs ?? [];

  const matchingLog = logs.find(
    (log) =>
      log.address?.toLowerCase() === USDT_BEP20_CONTRACT.toLowerCase() &&
      log.topics?.[0] === TRANSFER_TOPIC &&
      topicToAddress(log.topics?.[2] ?? "") ===
        receivingWallet.toLowerCase()
  );

  if (!matchingLog) {
    return new Response(
      JSON.stringify({
        error:
          "Aucun transfert USDT vers ton portefeuille trouvé dans cette transaction",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const amountRaw = BigInt(matchingLog.data);
  const amount = Number(amountRaw) / 1e18;

  if (amount < expectedAmount * 0.98) {
    return new Response(
      JSON.stringify({
        error: `Montant insuffisant : ${amount} USDT reçu, ${expectedAmount} USDT attendu`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const code = generateCode(courseId);
  const codesStore = getStore("racine-access-codes");
  await codesStore.setJSON(code, {
    courseId,
    txHash,
    createdAt: new Date().toISOString(),
  });

  await purchasesStore.setJSON(txHash, {
    courseId,
    code,
    amount,
    createdAt: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ success: true, code }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/verify-payment",
};
