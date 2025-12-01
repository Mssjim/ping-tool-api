const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const ping = require('ping');

const app = express();
app.use(express.json());
app.use(cors());

const settingsPath = path.resolve(__dirname, 'settings.json');
if (!fs.existsSync(settingsPath)) {
    console.error('settings.json not found at', settingsPath);
    process.exit(1);
}

const { port, historyLimit, hosts } = require(settingsPath);

const state = {};

function updateHistory(host, pingMs, ts) {
    const entry = { ts, ping: pingMs };
    if (!state[host]) {
        state[host] = { host, last_ping: null, last_checked: null, history: [], avg: null, loss: 0 };
    }
    const hist = state[host].history || [];
    hist.push(entry);

    while (hist.length > historyLimit) hist.shift();
    state[host].history = hist;
    state[host].last_ping = pingMs;
    state[host].last_checked = ts;

    const successes = hist.filter(h => h.ping !== null && h.ping !== undefined);
    if (successes.length > 0) {
        const sum = successes.reduce((s, h) => s + Number(h.ping), 0);
        state[host].avg = Math.round((sum / successes.length) * 100) / 100;
    } else {
        state[host].avg = null;
    }

    const total = hist.length;
    const failed = total - successes.length;
    state[host].loss = total > 0 ? Math.round((failed / total) * 10000) / 100 : 0;
}

async function doPing(host, timeoutMs) {
    const timeoutSec = Math.max(1, Math.ceil(timeoutMs / 1000));
    try {
        const res = await ping.promise.probe(host, { timeout: timeoutSec });
        const time = (res && res.time && !isNaN(res.time)) ? parseFloat(res.time) : null;
        return time;
    } catch (err) {
        return null;
    }
}

function scheduleHost(item) {
    const host = item.host;
    const timeout = Number(item.timeout ?? 3000);
    const delay = Number(item.delay ?? 5) * 1000;

    state[host] = { host, last_ping: null, last_checked: null, history: [], avg: null, loss: 0 };

    const run = async () => {
        const ts = new Date().toISOString();
        const pingMs = await doPing(host, timeout);
        updateHistory(host, pingMs, ts);
    };

    run();
    const id = setInterval(run, delay);
    return id;
}

for (const item of hosts) {
    if (!item || !item.host) continue;
    scheduleHost(item);
}

app.get('/', (req, res) => {
    res.json(Object.values(state));
});

app.listen(port || 3000, () => {
    console.log(`Ping API listening on http://localhost:${port}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});