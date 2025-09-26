import express from 'express';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { createBareServer } from '@tomphttp/bare-server-node';
import cors from 'cors';
import path from "path";
import { hostname } from "node:os";

const ssl = true; // Set to false if you want to disable SSL

const __dirname = process.cwd();
const bareServer = createBareServer('/b/');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/public')));
app.use(cors());

// SSL Certificate Setup
let server;
if (ssl) {
    const sslOptions = {
        key: fs.readFileSync(path.join(__dirname, 'certs/privatekey.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs/fullchain.pem')),
    };
    server = https.createServer(sslOptions);
} else {
    server = http.createServer();
}

// Attach routing
server.on('request', (req, res) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

// Define routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});

/* add your own extra urls like this:

app.get('/pathOnYourSite', (req, res) => {
    res.sendFile(path.join(__dirname, '/linkToItInYourSource'));
});

*/

const PORT = 3000;
server.on('listening', () => {
    const address = server.address();
    console.log("Listening on:");
    console.log(`\t${ssl ? 'https' : 'http'}://localhost:${address.port}`);
    console.log(`\t${ssl ? 'https' : 'http'}://${hostname()}:${address.port}`);
    console.log(
        `\t${ssl ? 'https' : 'http'}://${address.family === "IPv6" ? `[${address.address}]` : address.address
        }:${address.port}`
    );
});

server.listen({ port: PORT });

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close();
    bareServer.close();
    process.exit(0);
}
