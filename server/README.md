# Online leaderboards and cloud saves server

A single AWS Lambda function with a public function URL, and one DynamoDB table, in account 966187623392, region `eu-west-1`. Deployed on 8 October 2026; the game's `DEFAULT_URL` in `src/online.js` points at it:

`https://vivkdhbjjsajnazmoijsbim3gq0tjzox.lambda-url.eu-west-1.on.aws/`

**Weekly boards:** the four drill boards also keep one board per ISO week (UTC, Monday to Monday), stored as `<board>@<week>` (for example `sniper@2026-W41`) in the same table. A score post updates the all-time best and that week's best, and answers with both ranks. The client sends `played` (when the score was set), so a score queued offline lands in its own week; times more than 8 days old, or in the future, count as now. `GET ?board=sniper&period=week` reads the current week's board and adds `week` and `resetsAt`. Old weeks stay in the table: a few bytes per player per board per week.

**Friends boards:** a group is a six-character code (letters and digits without look-alikes like O/0 and I/1) with a name, stored under board `_group`. `POST {op: 'group_new', player, name}` makes one (one per player every 30 seconds) and joins it; `{op: 'group_join', player, group}` checks the code exists and copies the player's current all-time and this week's bests in; `{op: 'group_leave', player, group}` rewrites their rows on that group's boards without a `rank`, which drops them out of the `byRank` index (and so off the board and out of its count). Each board has a copy per group, `<board>#<CODE>` and `<board>@<week>#<CODE>`; a score post that lists `groups` (up to 3 codes) also updates those. `GET ?board=sniper&group=CODE` (with or without `period=week`) reads one. Everything uses the same `GetItem`, `PutItem` and `Query` permissions as before; board totals are counted from the index since 8 October 2026.

**Ghost runs:** a Cone Weave best can bring its run along: `POST {op: 'ghost_put', board: 'cones', player, score, played, ghost: {path, splits, char}}`, where `path` is base64 (a 4-byte start, then 3 bytes a sample at 15 a second; at most 6000 characters, and no longer than the time). It's stored as `ghost:cones` and/or `ghost:cones@<week>` beside the best it matches (409 if it matches neither). `GET ?board=cones&ghost=1` (with `period=week` and/or `group=CODE`) returns the leader's run, or `null` when their best has no run stored.

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
