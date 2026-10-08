// AWS Lambda entry point for the online leaderboards (Function URL, Node.js 20).
// Table: puckbound-leaderboard, key (board, player); index byRank on (board, rank).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, NumberValue } from '@aws-sdk/lib-dynamodb';
import { handle, MAX_SAVE_BODY } from './leaderboard.mjs';

const TABLE = process.env.TABLE || 'puckbound-leaderboard';
// numbers come back exact (the rank key has ~20 digits, more than a double holds)
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), { unmarshallOptions: { wrapNumbers: true } });

const num = (v) => (v && typeof v === 'object' && 'value' in v ? v.value : v);
// rank is stored as a number (it sorts the index); in code it's a decimal string
const toRow = (item) => {
  if (!item) return null;
  const row = { ...item, at: Number(num(item.at)) };
  if (item.score !== undefined) row.score = Number(num(item.score));
  if (item.last !== undefined) row.last = Number(num(item.last));
  if (item.rank !== undefined) row.rank = String(num(item.rank));
  return row;
};

const store = {
  async get(board, player) {
    const r = await db.send(new GetCommand({ TableName: TABLE, Key: { board, player } }));
    return toRow(r.Item) || null;
  },
  async put(row) {
    const item = { ...row };
    if (row.rank !== undefined) item.rank = NumberValue.from(row.rank); // saves have no rank (and stay out of the index)
    await db.send(new PutCommand({ TableName: TABLE, Item: item }));
  },
  async top(board, n) {
    const r = await db.send(new QueryCommand({
      TableName: TABLE, IndexName: 'byRank', KeyConditionExpression: 'board = :b',
      ExpressionAttributeValues: { ':b': board }, ScanIndexForward: false, Limit: n,
    }));
    return (r.Items || []).map(toRow);
  },
  async countAbove(board, rank) {
    let count = 0, start;
    do {
      const r = await db.send(new QueryCommand({
        TableName: TABLE, IndexName: 'byRank', KeyConditionExpression: 'board = :b AND #r > :r',
        ExpressionAttributeNames: { '#r': 'rank' }, ExpressionAttributeValues: { ':b': board, ':r': NumberValue.from(rank) },
        Select: 'COUNT', ExclusiveStartKey: start,
      }));
      count += r.Count || 0; start = r.LastEvaluatedKey;
    } while (start);
    return count;
  },
  async count(board) {
    let count = 0, start;
    do {
      const r = await db.send(new QueryCommand({
        TableName: TABLE, KeyConditionExpression: 'board = :b', ExpressionAttributeValues: { ':b': board },
        Select: 'COUNT', ExclusiveStartKey: start,
      }));
      count += r.Count || 0; start = r.LastEvaluatedKey;
    } while (start);
    return count;
  },
};

export async function handler(event) {
  const req = {
    method: event.requestContext?.http?.method || 'GET',
    query: event.queryStringParameters || {},
    body: event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : event.body,
  };
  if ((req.body || '').length > MAX_SAVE_BODY) return { statusCode: 413, body: '{"error":"too big"}' };
  try {
    const res = await handle(req, store);
    return { statusCode: res.status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(res.body) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: { 'content-type': 'application/json' }, body: '{"error":"server error"}' };
  }
}
