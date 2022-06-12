import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LambdaStreamingTestsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const hello = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lambda/handlers/hello'),
      handler: 'hello.HelloHandler',
    });

    const logsHandler = new lambda.Function(this, 'LogsHandler', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lambda/handlers/logs'),
      handler: 'logs.handler',
    });

    const logGroup = logs.LogGroup.fromLogGroupName(
      this,
      'LambdaLogGroup',
      '/aws/lambda/LambdaStreamingTestsStack-HelloHandler2E4FBA4D-Md4q69medFvg',
    );

    const logSubscription = new logs.SubscriptionFilter(
      this,
      'HelloSubscriptionFilter',
      {
        logGroup,
        destination: new cdk.aws_logs_destinations.LambdaDestination(
          logsHandler,
        ),
        filterPattern: logs.FilterPattern.allEvents(),
      },
    );

    // example resource
    // const queue = new sqs.Queue(this, 'LambdaStreamingTestsQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
