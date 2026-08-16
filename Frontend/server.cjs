const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT) || 8080;
const root = path.join(__dirname, "dist");

const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(req.url.split("?")[0]);

    if (pathname === "/") {
        pathname = "/index.html";
    }

    let filePath = path.join(root, pathname);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        filePath = path.join(root, "index.html");
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500);
            res.end("Internal Server Error");
            return;
        }

        const ext = path.extname(filePath).toLowerCase();

        res.writeHead(200, {
            "Content-Type": mimeTypes[ext] || "application/octet-stream"
        });

        res.end(data);
    });
});

server.listen(port, "0.0.0.0", () => {
    console.log(`Frontend server running on port ${port}`);
});