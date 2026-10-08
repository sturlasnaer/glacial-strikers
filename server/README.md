# Online leaderboards and cloud saves server

A single AWS Lambda function with a public function URL, and one DynamoDB table, in account 966187623392, region `eu-west-1`. Deployed on 8 October 2026; the game's `DEFAULT_URL` in `src/online.js` points at it:

`https://vivkdhbjjsajnazmoijsbim3gq0tjzox.lambda-url.eu-west-1.on.aws/`

**Cloud saves** live in the same table under board `_save`, keyed by a SHA-256 hash of the player's 32-character backup code. Requests are `POST {op: 'save_put' | 'save_get', token, data}`, saves are capped at 256 KB, and a slot accepts one write every 20 seconds. Save rows have no `rank`, so they never appear in the leaderboard index.

| Piece | Name |
|---|---|
| Table | `puckbound-leaderboard`: key `board` + `player`, on-demand billing, index `byRank` on `board` + `rank` |
| Function | `puckbound-leaderboard`: Node.js 22 (`nodejs22.x`, arm64), `index.handler` from `lambda.mjs` (packed as `index.mjs`) + `leaderboard.mjs`, 128 MB, 5 s timeout, env `TABLE` |
| Role | `puckbound-leaderboard-lambda`: `GetItem`, `PutItem` and `Query` on that table and its index, and writing its own logs |
| Logs | `/aws/lambda/puckbound-leaderboard`, kept 3 days |
| URL | Function URL, auth NONE, CORS `*` for GET/POST (`content-type` header). Public `lambda:InvokeFunctionUrl`, plus `lambda:InvokeFunction` only when invoked through the URL |

## Files

- `leaderboard.mjs`: the request handling, shared with the local test server. It covers board rules, score checks, the per-player rate limit, the name filter and ranking.
- `lambda.mjs`: the Lambda entry point and its DynamoDB storage.
- `deploy-policy.json`: the permissions the deploying IAM user needs, limited to these three resources.

## Updating the server code

The deploying user is `puckmax-polly`, with only the permissions in `deploy-policy.json`. It has no S3 access, and the AWS MCP script runner passes parameters as text, so the code goes up as an all-ASCII zip:

```bash
python3 tools/pack_lambda.py lambda_zip.txt
```

Then call `UpdateFunctionCode(FunctionName='puckbound-leaderboard', ZipFile=Z)`, where `Z` is the string literal in that file. Check `len(Z)` and the printed checksum in the script first. Run `node tools/test_leaderboard.mjs` before deploying.

## Local testing

```bash
node tools/test_leaderboard.mjs
node tools/leaderboard_server.mjs 8790
```

Then open the game with `?lb=http://127.0.0.1:8790`.

## What it trusts

Scores come from the player's browser, so anyone determined can fake one. The server rejects unknown boards and out-of-range or malformed scores. It allows one post per player per board every 2 seconds, keeps only each player's best, and filters club names. If cheating becomes a problem, the next step would be verifying drill replays on the server.

## Cost

At hobby scale everything sits in the AWS free tier: Lambda requests, DynamoDB on-demand reads and writes, and 3-day log retention. Each leaderboard view is a handful of DynamoDB reads.
