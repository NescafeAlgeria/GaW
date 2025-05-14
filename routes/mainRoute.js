const mainRoute = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Welcome to the main page!\n');
}

export default mainRoute;