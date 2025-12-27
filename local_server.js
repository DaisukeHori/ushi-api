const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

app.use(bodyParser.json());

async function searchCattle(id) {
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

    // 1. Access agreement page
    const response1 = await axios.get(agreementUrl, { headers });
    const cookie = response1.headers['set-cookie'];
    if (!cookie) throw new Error("EXTERNAL_ERROR: Failed to get session cookie.");

    let currentCookies = cookie.map(c => c.split(';')[0]);
    let $ = cheerio.load(response1.data);

    const getTokens = ($) => {
        const tokens = {};
        $('input[type="hidden"]').each((i, el) => {
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

    const response2 = await axios.post(agreementUrl, formData1.toString(), {
        headers: {
            ...headers,
            "Cookie": currentCookies.join('; '),
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    if (response2.headers['set-cookie']) {
        currentCookies = [...currentCookies, ...response2.headers['set-cookie'].map(c => c.split(';')[0])];
    }

    // 3. Search for cattle ID
    $ = cheerio.load(response2.data);
    const tokens2 = getTokens($);

    const formData2 = new URLSearchParams();
    for (const [name, value] of Object.entries(tokens2)) {
        formData2.append(name, value);
    }
    formData2.append("txtIDNO", formattedId);
    formData2.append("method:doSearch.x", "0");
    formData2.append("method:doSearch.y", "0");

    const response3 = await axios.post(searchUrl, formData2.toString(), {
        headers: {
            ...headers,
            "Cookie": currentCookies.join('; '),
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    const html = response3.data;
    $ = cheerio.load(html);

    const tables = $("span table");
    if (tables.length < 1) {
        if (html.includes("個体識別番号が存在しません")) {
            throw new Error("NOT_FOUND: Cattle ID not found.");
        }
        throw new Error("EXTERNAL_ERROR: Cattle information table not found.");
    }

    // Table 1: Cattle Info
    const infoRows = $(tables[0]).find("tr");
    const infoCols = $(infoRows[1]).find("td");
    const cattleInfo = {
        individualId: $(infoCols[0]).text().trim(),
        birthDate: $(infoCols[1]).text().trim(),
        sex: $(infoCols[2]).text().trim(),
        motherId: $(infoCols[3]).text().trim(),
        breed: $(infoCols[4]).text().trim(),
        importDate: $(infoCols[5]).text().trim() || null,
        importCountry: $(infoCols[6]).text().trim() || null,
    };

    // Table 2: History
    const history = [];
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

app.post('/search', async (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ status: "error", message: "ID is required" });
    }

    try {
        const result = await searchCattle(id);
        res.json({ status: "success", data: result });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(port, () => {
    console.log(`Local API server listening at http://localhost:${port}`);
});
