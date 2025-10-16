require('dotenv').config();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];

function checkAllowedOrigin(req, res, next) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) {
    return res
      .status(403)
      .set('Content-Type', 'text/html')
      .send(`
        <!DOCTYPE html>
        <html>
        <head><title>403 Forbidden</title></head>
        <body>
          <center><h1>403 Forbidden</h1></center>
          <hr><center>nginx/1.18.0</center>
        </body>
        </html>
      `);
  }

  // If Origin is present but not allowed
  if (origin && !allowedOrigins.includes(origin)) {
    return res
      .status(502)
      .set('Content-Type', 'text/html')
      .send(`
        <!DOCTYPE html>
        <html>
        <head><title>502 Bad Gateway</title></head>
        <body>
          <center><h1>502 Bad Gateway</h1></center>
          <hr><center>nginx/1.18.0</center>
        </body>
        </html>
      `);
  }

  if (referer) {
    const refererOrigin = new URL(referer).origin;
    if (!allowedOrigins.includes(refererOrigin)) {
      return res
        .status(502)
        .set('Content-Type', 'text/html')
        .send(`
          <!DOCTYPE html>
          <html>
          <head><title>502 Bad Gateway</title></head>
          <body>
            <center><h1>502 Bad Gateway</h1></center>
            <hr><center>nginx/1.18.0</center>
          </body>
          </html>
        `);
    }
  }

  next();
}

module.exports = checkAllowedOrigin;
