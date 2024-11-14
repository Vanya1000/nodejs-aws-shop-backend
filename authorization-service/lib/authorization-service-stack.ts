import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';
import 'dotenv/config';

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const basicAuthorizerLambda = new NodejsFunction(
      this,
      'BasicAuthorizerFunction',
      {
        entry: join(__dirname, '..', 'lambda', 'basic-authorizer.ts'),
        runtime: Runtime.NODEJS_20_X,
        functionName: 'basic-authorizer',
        environment: {
          vanya1000: process.env.vanya1000 as string,
        },
      }
    );

    new cdk.CfnOutput(this, 'BasicAuthorizerLambdaArn', {
      value: basicAuthorizerLambda.functionArn,
      exportName: 'BasicAuthorizerLambdaArn',
    });
  }
}
