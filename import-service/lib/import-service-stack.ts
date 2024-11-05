import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apiGateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3notificaitions from 'aws-cdk-lib/aws-s3-notifications';
import { join } from 'path';
import 'dotenv/config';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'ImportCsvBucket', {
      bucketName: process.env.IMPORT_S3_BUCKET_NAME as string,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedHeaders: ['*'],
          exposedHeaders: [],
        },
      ],
    });

    const getImportProductsFileLambda = new NodejsFunction(
      this,
      'GetImportProductsFileFunction',
      {
        entry: join(__dirname, '..', 'lambda', 'import-products-file.ts'),
        runtime: Runtime.NODEJS_20_X,
        functionName: 'import-products-file',
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
      }
    );

    const docsLambda = new NodejsFunction(this, 'ImportServiceDocsFunction', {
      entry: join(__dirname, '..', 'lambda', 'docs.ts'),
      runtime: Runtime.NODEJS_20_X,
      functionName: 'import-service-docs-function',
      bundling: {
        loader: {
          '.json': 'json',
        },
      },
    });

    bucket.grantPut(getImportProductsFileLambda);

    const httpApi = new apiGateway.HttpApi(this, 'ImportHttpApi', {
      apiName: 'Import Http Api',
      corsPreflight: {
        allowHeaders: ['*'],
        allowOrigins: ['*'],
        allowMethods: [apiGateway.CorsHttpMethod.ANY],
      },
    });

    httpApi.addRoutes({
      path: '/import',
      methods: [apiGateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        'GetImportProductsFileIntegration',
        getImportProductsFileLambda
      ),
    });

    httpApi.addRoutes({
      path: '/docs',
      methods: [apiGateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        'ImportServiceDocsIntegration',
        docsLambda
      ),
    });

    const importFileParserLambda = new NodejsFunction(
      this,
      'ImportFileParserFunction',
      {
        entry: join(__dirname, '..', 'lambda', 'import-file-parser.ts'),
        runtime: Runtime.NODEJS_20_X,
        functionName: 'import-file-parser',
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
      }
    );

    bucket.grantReadWrite(importFileParserLambda);
    bucket.grantDelete(importFileParserLambda);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3notificaitions.LambdaDestination(importFileParserLambda),
      { prefix: 'uploaded' }
    );
  }
}