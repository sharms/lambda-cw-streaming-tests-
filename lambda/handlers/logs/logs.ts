import { Callback, CloudWatchLogsDecodedData, CloudWatchLogsEvent, Context } from "aws-lambda";
import * as zlib from 'zlib';
import {apply, waterfall} from 'async';

interface CloudWatchEventStream {
    logEvents: CloudWatchEventMessage[]
};

interface CloudWatchEventMessage {
    message: string,
};

// Typescript enforces event.awslogs.data is a string
export const handler = async (event:CloudWatchLogsEvent, context: Context, callback: Callback) => {
    waterfall([
        apply(decodeEventBase64(), event.awslogs.data),
        function(compressed: Buffer, callback: Callback) {
            let decompressed: Buffer = Buffer.from("");
            try {
                decompressed = zlib.unzipSync(compressed);
            }
            catch (err) {
                callback(`zlib unzip failed: ${err}`);
            }
            callback(null, decompressed);
        },
        // Buffer.toString() can fail for large sizes
        function(decompressed: Buffer, callback: Callback) {
            let str: string = "";
            try {
                str = decompressed.toString();
            }
            catch(err) {
                callback(`Buffer toString failed: ${err}`);
            }
            callback(null, str);
        },
        function(str: string, callback: Callback) {
            let parsed: CloudWatchEventStream = {logEvents: []};
            let events: CloudWatchEventMessage[] = [];

            try {
                console.log(`Parsing: ${str}`);
                parsed = JSON.parse(str);
                events = parsed?.logEvents;

                if (events.length == 0) {
                    throw "JSON payload was parsed but logEvents was empty";
                }
            }
            catch(err) {
                callback(`JSON parse failed: ${err}`);
            }
            callback(null, events);
        },
        function(events: CloudWatchEventMessage[], err: any) {
            for(const event of events) {
                try {
                    console.log(`event: ${JSON.stringify(event)}`);
                    let parsed: CloudWatchEventMessage = event;
                    let message: string = parsed?.message;
                    console.log(`message: ${message}`);
                }
                catch(err) {
                    callback(`JSON parse message field failed: ${err}`);
                }

            }
        }

    ], function(err, results) {console.log(`terminated log sending: ${err}`)});
}

function decodeEventBase64(): Function {
    return function (payload: string, callback: Callback) {
        let compressed: Buffer = Buffer.from("");
        try {
            compressed = Buffer.from(payload, 'base64');
        }
        catch (err) {
            callback(`Buffer from base64 failed: ${err}`);
        }
        callback(null, compressed);
    };
}
