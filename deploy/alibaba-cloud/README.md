# Deploy Bowly Backend To Alibaba Cloud SAE

> Lowest-cost recommendation: use the Function Compute ZIP flow below. ACR
> Enterprise Edition is not required.

## Function Compute ZIP Deployment

### Build The Upload Package

From the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\deploy\alibaba-cloud\build-function-compute-package.ps1
```

Upload this generated file:

```text
deploy/alibaba-cloud/bowly-backend-function-compute.zip
```

The ZIP contains compiled backend code and production dependencies. It does not
contain `backend/.env` or the Qwen API key.

### Function Compute Console Settings

1. Leave the Container Registry Enterprise purchase page without buying it.
2. Open **Function Compute** in the Alibaba Cloud console.
3. Select Singapore if available.
4. Create a **Web Function** named `bowly-backend`.
5. Choose code upload / ZIP deployment and upload the generated ZIP.
6. Use a Node.js 20 or newer runtime. If Web Function requires a custom runtime,
   choose a Node.js-compatible custom runtime.
7. Set the startup command to:

```text
npm start
```

8. Set the listening port to `9000`, and add `PORT=9000`.
9. Start with the smallest memory allocation and one instance or scale-to-zero.
10. Enable a public Function URL / HTTP endpoint.

Add environment variables:

```text
PORT=9000
APP_VERSION=hackathon-2026
DEPLOYMENT_PLATFORM=alibaba-cloud-function-compute
ALIBABA_CLOUD_REGION=ap-southeast-1
USE_MOCK_AI=false
QWEN_API_KEY=<set in Function Compute only>
QWEN_BASE_URL=https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3.7-plus
QWEN_TIMEOUT_MS=12000
REPORT_QWEN_TIMEOUT_MS=8000
```

Do not upload `backend/.env`, and do not paste the key into source code.

### Verify

Open:

```text
https://<function-public-url>/health
```

Then send one POST request to `/coach` and reload `/health`. The final response
should contain:

```json
{
  "deployment": {
    "platform": "alibaba-cloud-function-compute",
    "region": "ap-southeast-1"
  },
  "ai": {
    "mode": "live",
    "provider": "qwen",
    "model": "qwen3.7-plus"
  }
}
```

This deployment uses:

- Alibaba Cloud Container Registry (ACR) for the backend image.
- Serverless App Engine (SAE) for the public Node.js API.
- Qwen Cloud for coaching and report generation.

The final proof URL will look like:

```text
https://<public-sae-domain>/health
```

## 1. Local Container Check

From the repository root:

```powershell
docker build -t bowly-backend:latest .\backend
docker run --rm -p 8787:8787 `
  -e USE_MOCK_AI=true `
  -e DEPLOYMENT_PLATFORM=local-docker `
  bowly-backend:latest
```

Verify:

```powershell
curl.exe http://127.0.0.1:8787/health
```

## 2. Create An ACR Repository

In the Alibaba Cloud console:

1. Open **Container Registry**.
2. Use the Singapore region (`ap-southeast-1`) to match the Qwen endpoint.
3. Create a Personal or Enterprise instance.
4. Create namespace `bowly` and repository `bowly-backend`.
5. Copy the login command and repository endpoint shown by ACR.

Do not put the registry password or Qwen API key in this repository.

## 3. Build And Push

Replace the placeholders with the exact ACR values from the console:

```powershell
docker login --username=<acr-username> registry-intl.ap-southeast-1.aliyuncs.com

docker build -t bowly-backend:latest .\backend

docker tag bowly-backend:latest `
  registry-intl.ap-southeast-1.aliyuncs.com/bowly/bowly-backend:latest

docker push `
  registry-intl.ap-southeast-1.aliyuncs.com/bowly/bowly-backend:latest
```

Your registry hostname may differ. Always use the endpoint displayed by ACR.

## 4. Create The SAE Application

In **Serverless App Engine**:

1. Select Singapore if SAE is available for the account and region.
2. Create an application named `bowly-backend`.
3. Choose **Container Image** deployment.
4. Select the ACR image pushed above.
5. Set container port to `8787`.
6. Start with one instance and the smallest suitable CPU/memory allocation.
7. Enable public access and create an Internet-facing gateway/domain.

Add these environment variables:

```text
PORT=8787
APP_VERSION=hackathon-2026
DEPLOYMENT_PLATFORM=alibaba-cloud-sae
ALIBABA_CLOUD_REGION=ap-southeast-1
USE_MOCK_AI=false
QWEN_API_KEY=<set in SAE only>
QWEN_BASE_URL=https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3.7-plus
QWEN_TIMEOUT_MS=12000
REPORT_QWEN_TIMEOUT_MS=8000
```

Use SAE secret/environment management for `QWEN_API_KEY`. Never bake it into
the Docker image.

Configure the health check:

```text
Protocol: HTTP
Path: /health
Port: 8787
Initial delay: 10 seconds
Period: 30 seconds
```

## 5. Verify The Public Deployment

Open:

```text
https://<public-sae-domain>/health
```

Expected initial response:

```json
{
  "ok": true,
  "service": "bowly-ai-backend",
  "version": "hackathon-2026",
  "deployment": {
    "platform": "alibaba-cloud-sae",
    "region": "ap-southeast-1"
  },
  "ai": {
    "mode": "live",
    "provider": "mock",
    "keyConfigured": true,
    "model": "qwen3.7-plus"
  }
}
```

`provider` changes to `qwen` after the first successful AI request.

Test the live coach endpoint:

```powershell
$body = @{
  childName = "Deployment Test"
  challengeTitle = "Slow bow"
  metrics = @{
    pitchStability = 70
    postureConfidence = 65
    rhythmStability = 72
    confidenceLevel = 75
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri "https://<public-sae-domain>/coach" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Reload `/health`. It must show:

```json
"provider": "qwen"
```

Function Compute can route `/coach` and `/health` to different warm instances,
so the most reliable proof is the POST response itself. A successful live AI
request includes non-sensitive response metadata:

```json
"ai": {
  "mode": "live",
  "provider": "qwen",
  "model": "qwen3.7-plus",
  "fallbackUsed": false
}
```

If `provider` is `mock-fallback`, inspect `lastError` in the same response.

## 6. Connect The Frontend

Set the production frontend environment before building:

```text
VITE_API_BASE_URL=https://api.bowly.io
```

Rebuild the frontend:

```powershell
npm.cmd run build --prefix frontend
```

## 7. Devpost Deployment Proof

Include all of the following:

1. Public `/health` URL.
2. Screenshot showing `platform: alibaba-cloud-sae` and `provider: qwen`.
3. Link to [`backend/Dockerfile`](../../backend/Dockerfile).
4. Link to [`backend/src/services/qwenService.ts`](../../backend/src/services/qwenService.ts).
5. Link to this deployment guide.
6. Optional SAE application screenshot with application name and region, but
   no credentials or API keys.

## Alternative If SAE Is Unavailable

Use an Alibaba Cloud ECS instance with Docker:

1. Create an Ubuntu ECS instance in Singapore.
2. Open inbound TCP port `8787` in its security group.
3. Install Docker.
4. Pull the ACR image and run it with the environment variables above.
5. Prefer an HTTPS reverse proxy and domain before public judging.

The public proof URL would then be:

```text
http://<ecs-public-ip>:8787/health
```
