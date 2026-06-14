# Hostinger Static Hosting Deployment

The generated `frontend/dist` directory is intentionally excluded from Git.
GitHub Actions builds it and uploads the result to Hostinger over FTPS.

## Deployment Flow

```text
git push origin main
  -> GitHub Actions runs npm ci
  -> GitHub Actions runs npm run build
  -> frontend/dist is uploaded to Hostinger public_html
```

Hostinger does not need Node.js support for this setup.

## 1. Find Hostinger FTP Details

In Hostinger hPanel, open:

```text
Websites -> Manage -> Files -> FTP Accounts
```

Record:

```text
FTP hostname
FTP username
FTP password
Website upload directory
```

The upload directory is commonly `/public_html`, but an FTP account can start
inside that directory. Verify the path in Hostinger File Manager instead of
assuming it.

## 2. Add GitHub Secrets

Open the GitHub repository:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Add these four secrets:

| Secret | Value |
| --- | --- |
| `HOSTINGER_FTP_HOST` | The Hostinger FTP hostname, without `ftp://` |
| `HOSTINGER_FTP_USERNAME` | The complete FTP username |
| `HOSTINGER_FTP_PASSWORD` | The FTP account password |
| `HOSTINGER_FTP_REMOTE_DIR` | Usually `/public_html`, or `/` if the FTP account already opens there |

Optional:

| Secret | Value |
| --- | --- |
| `HOSTINGER_FTP_PORT` | Hostinger FTP port; defaults to `21` |

Do not put these values in repository files.

## 3. Run the First Deployment

The workflow is located at:

```text
.github/workflows/deploy-frontend-hostinger.yml
```

After it is pushed to GitHub:

1. Open the repository's **Actions** tab.
2. Select **Deploy frontend to Hostinger**.
3. Select **Run workflow**.
4. Watch the `build-and-deploy` job.

Future pushes to `main` automatically deploy when a file under `frontend` or
the workflow itself changes.

The workflow uses FTPS and verifies the server certificate. It synchronizes the
contents of `frontend/dist` to the configured directory and removes obsolete
frontend files. Hostinger's `.well-known` directory and `.ftpquota` file are
excluded from deletion.

## SPA Routing

`frontend/public/.htaccess` is copied into `dist` by Vite. It routes direct
requests such as `/practice` and `/report` back to `index.html`.

## Backend

The frontend and backend are separate deployments:

- `bowly.io`: Hostinger frontend.
- `api.bowly.io`: Alibaba Cloud Function Compute backend.

Do not place backend API keys in Hostinger's frontend settings. Keep
`QWEN_API_KEY` only in the Alibaba Cloud backend environment.

## Local Verification

Before pushing:

```bash
npm ci --prefix frontend
npm run build --prefix frontend
```

The generated `frontend/dist` can be deleted and rebuilt at any time.

## Troubleshooting

### Login failed

Confirm the complete FTP username and reset the FTP password in hPanel.

### Remote directory not found

Use Hostinger File Manager to verify whether the FTP account sees:

```text
/public_html
```

or already starts inside `public_html`, in which case use:

```text
/
```

### TLS certificate error

Confirm that `HOSTINGER_FTP_HOST` is Hostinger's supplied FTP hostname rather
than a custom domain whose TLS certificate does not match the FTP server.

### `max-retries exceeded`

This means the runner could not establish a usable FTP connection before it
attempted to upload files. Check:

1. `HOSTINGER_FTP_HOST` contains only the FTP hostname, without `ftp://`,
   `ftps://`, a path, or a port.
2. `HOSTINGER_FTP_PORT` is `21` unless hPanel explicitly shows another FTP
   port.
3. The FTP account is active and can connect from an external FTP client.
4. Hostinger is not restricting FTP access by IP address.
