# Alibaba Cloud Operations Checklist

Use this checklist before public demos or broader testing.

## Cost controls

1. Open Alibaba Cloud **Billing Management > Cost Management > Budget**.
2. Create a monthly budget for the Bowly project.
3. Set alerts at 50%, 80%, and 100% of the budget.
4. Send alerts to at least one verified email address.
5. Review Function Compute invocation, execution-duration, and outbound-traffic
   charges after each public test.
6. Review Model Studio or DashScope token usage separately from Function
   Compute charges.

Recommended prototype budget:

- Soft warning: USD 15 equivalent.
- Strong warning: USD 25 equivalent.
- Manual review before exceeding USD 30 equivalent.

Alibaba Cloud budgets are alerts, not guaranteed hard spending caps. Keep
Function Compute minimum instances at zero unless a demo requires a warm
instance.

## Runtime verification

Check these endpoints before a demo:

```text
https://api.bowly.io/health
https://bowly.io
```

The health response should show:

- `ok: true`
- `deployment.platform: alibaba-cloud-function-compute`
- `ai.mode: live`
- `ai.provider: qwen`
- `ai.keyConfigured: true`

`mock-fallback` means the product remains usable, but the Qwen request failed.
Check Function Compute logs using the response `x-request-id`.

## Logging and privacy

Backend logs contain:

- request ID
- HTTP method and path
- response status
- request duration
- shortened browser user agent
- simplified client error messages

Logs must not contain camera frames, audio, API keys, full request bodies, or
children's names.

## Demo-day checks

- Confirm the custom domain certificate is valid.
- Confirm CORS accepts the production frontend.
- Confirm the Qwen API key has not expired.
- Confirm Function Compute can access the public internet.
- Run one short practice and verify a report is saved.
- Open `/practice?debug=1` only for troubleshooting, not during the child demo.
