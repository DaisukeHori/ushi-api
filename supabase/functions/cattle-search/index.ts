import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as cheerio from "npm:cheerio";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface CattleInfo {
  individualId: string;
  birthDate: string;
  sex: string;
  motherId: string;
  breed: string;
  importDate: string | null;
  importCountry: string | null;
}

export interface HistoryItem {
  event: string;
  date: string;
  prefecture: string;
  city: string;
  name: string;
}

export interface SearchResult {
  cattleInfo: CattleInfo;
  history: HistoryItem[];
}

async function searchCattle(id: string): Promise<SearchResult> {
  let formattedId = id.trim();
  if (!/^\d{9,10}$/.test(formattedId)) {
    throw new Error("INVALID_ID: ID must be 9 or 10 digits.");
  }
  if (formattedId.length === 9) {
    formattedId = "0" + formattedId;
  }

  const baseUrl = "https://www.id.nlbc.go.jp/CattleSearch/search";
  const agreementUrl = `${baseUrl}/agreement.action`;
  const searchUrl = `${baseUrl}/search.action`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  };

  // 1. Access agreement page to get session and tokens
  const response1 = await fetch(agreementUrl, { headers });
  const setCookie = response1.headers.get("set-cookie");
  
  if (!setCookie) {
    throw new Error("EXTERNAL_ERROR: Failed to get session cookie.");
  }

  let currentCookies = [setCookie.split(';')[0]];

  const html1 = await response1.text();
  let $ = cheerio.load(html1);

  const getTokens = ($: any) => {
    const tokens: Record<string, string> = {};
    $('input[type="hidden"]').each((_: any, el: any) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value');
      if (name) tokens[name] = value;
    });
    return tokens;
  };

  const tokens1 = getTokens($);

  // 2. Submit agreement
  const formData1 = new URLSearchParams();
  for (const [name, value] of Object.entries(tokens1)) {
    formData1.append(name, value);
  }
  formData1.append("method:goSearch.x", "450");
  formData1.append("method:goSearch.y", "800");

  const response2 = await fetch(agreementUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Cookie": currentCookies.join('; '),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData1,
  });

  const setCookie2 = response2.headers.get("set-cookie");
  if (setCookie2) {
    currentCookies.push(setCookie2.split(';')[0]);
  }

  const html2 = await response2.text();
  $ = cheerio.load(html2);
  const tokens2 = getTokens($);

  // 3. Search for cattle ID
  const formData2 = new URLSearchParams();
  for (const [name, value] of Object.entries(tokens2)) {
    formData2.append(name, value);
  }
  formData2.append("txtIDNO", formattedId);
  formData2.append("method:doSearch.x", "0");
  formData2.append("method:doSearch.y", "0");

  const response3 = await fetch(searchUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Cookie": currentCookies.join('; '),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData2,
  });

  const html3 = await response3.text();
  $ = cheerio.load(html3);

  const tables = $("span table");
  if (tables.length < 1) {
    if (html3.includes("個体識別番号が存在しません")) {
      throw new Error("NOT_FOUND: Cattle ID not found.");
    }
    throw new Error("EXTERNAL_ERROR: Cattle information table not found.");
  }

  // Table 1: Cattle Info
  const infoRows = $(tables[0]).find("tr");
  const infoCols = $(infoRows[1]).find("td");
  const cattleInfo: CattleInfo = {
    individualId: $(infoCols[0]).text().trim(),
    birthDate: $(infoCols[1]).text().trim(),
    sex: $(infoCols[2]).text().trim(),
    motherId: $(infoCols[3]).text().trim(),
    breed: $(infoCols[4]).text().trim(),
    importDate: $(infoCols[5]).text().trim() || null,
    importCountry: $(infoCols[6]).text().trim() || null,
  };

  // Table 2: History
  const history: HistoryItem[] = [];
  if (tables.length >= 2) {
    const historyRows = $(tables[1]).find("tr");
    for (let i = 1; i < historyRows.length; i++) {
      const cols = $(historyRows[i]).find("td");
      if (cols.length >= 6) {
        history.push({
          event: $(cols[1]).text().trim(),
          date: $(cols[2]).text().trim(),
          prefecture: $(cols[3]).text().trim(),
          city: $(cols[4]).text().trim(),
          name: $(cols[5]).text().trim(),
        });
      }
    }
  }

  return { cattleInfo, history };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      throw new Error("ID is required");
    }

    const result = await searchCattle(id);

    return new Response(JSON.stringify({ status: "success", data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ status: "error", message: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
