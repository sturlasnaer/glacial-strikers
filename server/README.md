# Online leaderboards and cloud saves server

A single AWS Lambda function with a public function URL, and one DynamoDB table. Region `eu-west-1`.

**Cloud saves** live in the same table under board `_save`, keyed by a SHA-256 hash of the player's 32-character backup code. Requests are `POST {op: 'save_put' | 'save_get', token, data}`, saves are capped at 256 KB, and a slot accepts one write every 20 seconds. Save rows have no `rank`, so they never appear in the leaderboard index.

| Piece | Name |
|---|---|
| Table | `puckbound-leaderboard`: key `board` + `player`, on-demand billing, index `byRank` on `board` + `rank` |
| Function | `puckbound-leaderboard`: Node.js 20, `index.handler` from `lambda.mjs` + `leaderboard.mjs`, 128 MB, 5 s timeout |
| Role | `puckbound-leaderboard-lambda`: may read and write that table and its index, and write its own logs |
| URL | Function URL, auth NONE, CORS `*` for GET/POST |

## Files

- `leaderboard.mjs`: the request handling, shared with the local test server. It covers board rules, score checks, the per-player rate limit, the name filter and ranking.
- `lambda.mjs`: the Lambda entry point and its DynamoDB storage.
- `deploy-policy.json`: the permissions the deploying IAM user needs, limited to these three resources.

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
