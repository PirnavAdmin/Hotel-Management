# Ubuntu deployment

1. Install Docker Engine and the Docker Compose plugin on the Ubuntu server.
2. Copy this repository to the server. Create the root `.env` from `.env.example` if it does not exist. For an existing deployment, preserve its current values and add `SMTP_PASS` rather than replacing the file. Set it to a Google App Password for the configured Gmail account (requires 2-Step Verification; do not use the normal account password). Keep `.env` private; it is excluded from Git. Ensure MySQL at `DB_HOST` accepts connections from Docker containers and the database user has access to `DB_NAME`.
3. From the repository root, build and start the services:

   ```sh
   docker compose up -d --build
   ```

4. Open `http://65.0.8.48:3000` for the frontend. The API is available at `http://65.0.8.48:5000`; the frontend's Nginx proxy routes API, event stream, upload, and Swagger requests to it.
5. On the server firewall/security group, allow inbound TCP 3000 and 5000. Keep MySQL's port restricted to trusted sources.

View logs with `docker compose logs -f backend frontend`, and stop the services with `docker compose down`.
