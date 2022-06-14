import {
  Callback,
  CloudWatchLogsEvent,
  Context,
} from 'aws-lambda';
import * as zlib from 'zlib';
import { apply, waterfall } from 'async';

interface CloudWatchEventStream {
  logEvents: CloudWatchEventMessage[];
}

interface CloudWatchEventMessage {
  message: string;
}

// Typescript enforces event.awslogs.data is a string
export const handler = (
  event: CloudWatchLogsEvent,
  context: Context,
  callback: Callback,
) => {
  // Closure over original AWS Lambda error callback function
  function handleError(err: any, result: any): void {
      console.log(`terminated log sending: ${err}`);
      return callback(err, null);
  }

  waterfall(
    [
      apply(decodeEventBase64, event.awslogs.data),
      decompress,
      convertToString,
      parseCloudWatchEventStream,
      parseCloudWatchEventMessage,
    ],
    handleError,
  );
};



// console.log each message successfully parsed
function parseCloudWatchEventMessage(
  events: CloudWatchEventMessage[],
  callback: Callback<any>,
): void {
  for (const event of events) {
    try {
      let parsed: CloudWatchEventMessage = event;
      let message: string = parsed?.message;
      console.log(`message: ${message}`);
    } catch (err) {
      return callback(`JSON parse message field failed: ${err}`);
    }
  }
}

// Create array of messages from CloudWatch logs event stream JSON
function parseCloudWatchEventStream(str: string, callback: Callback): void {
  let parsed: CloudWatchEventStream = { logEvents: [] };
  let events: CloudWatchEventMessage[] = [];

  try {
    parsed = JSON.parse(str);
    events = parsed?.logEvents;

    if (events.length == 0) {
      throw 'JSON payload was parsed but logEvents was empty';
    }
  } catch (err) {
    return callback(`JSON parse failed: ${err}`);
  }
  return callback(null, events);
}

// Buffer.toString() can fail for large sizes
function convertToString(decompressed: Buffer, callback: Callback): void {
  let str: string = '';
  try {
    str = decompressed.toString();
  } catch (err) {
    return callback(`Buffer toString failed: ${err}`);
  }
  return callback(null, str);
}

// Create a Buffer containing decompressed json
function decompress(compressed: Buffer, callback: Callback): void {
  let decompressed: Buffer = Buffer.from('');
  try {
    decompressed = zlib.unzipSync(compressed);
  } catch (err) {
    return callback(`zlib unzip failed: ${err}`);
  }
  return callback(null, decompressed);
}

// Create a buffer containing base64 decoded payload
function decodeEventBase64(payload: string, callback: Callback): void {
  let compressed: Buffer = Buffer.from('');
  try {
    compressed = Buffer.from(payload, 'base64');
  } catch (err) {
    return callback(`Buffer from base64 failed: ${err}`);
  }
  return callback(null, compressed);
}
