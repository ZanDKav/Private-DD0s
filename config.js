// config.js - Konfigurasi Bot
module.exports = {
    // TELEGRAM BOT TOKEN - GANTI DENGAN TOKEN BOT ANDA
    BOT_TOKEN: "8354132452:AAEIbSL3ujZOyjnZaCivklIImmNjoMMSDcc",
    
    // ADMIN ID (optional)
    ADMIN_ID: "7849712634",
    
    // Attack Configuration
    ATTACK: {
        DEFAULT_THREADS: 10000,
        DEFAULT_DURATION: 60,
        MAX_DURATION: 300000, // 5 menit max
        MIN_DURATION: 100,   // 10 detik min
        TARGET_RPS: 10000000,
    },
    
    // Rate Limit (cegah spam)
    RATE_LIMIT: {
        ENABLED: true,
        COOLDOWN: 30, // 30 detik per user
        MAX_ATTACKS_PER_DAY: 10
    },
    
    // Panel Mode
    PANEL: {
        MODE: 'auto', // auto, termux, pterodactyl
        MAX_WORKERS: require('os').cpus().length * 2
    }
};
