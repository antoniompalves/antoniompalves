// cPanel / Passenger startup file.
// Passenger loads the startup file with require(), which cannot load ES modules directly,
// so this CommonJS wrapper imports the real app. Set "Application startup file" to: server.cjs
import('./app.js').catch((e) => { console.error(e); process.exit(1); });
