import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apiGateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import { join } from 'path';
import 'dotenv/config';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsLambda = new NodejsFunction(this, 'GetProductsFunction', {
      entry: join(__dirname, '..', 'lambda', 'get-products.ts'),
      runtime: Runtime.NODEJS_20_X,
      functionName: 'get-products',
    });

    const getProductsByIdsLambda = new NodejsFunction(
      this,
      'GetProductsByIdsFunction',
      {
        entry: join(__dirname, '..', 'lambda', 'get-products-by-ids.ts'),
        runtime: Runtime.NODEJS_20_X,
        functionName: 'get-products-by-ids',
      }
    );

    const getProductByIdLambda = new NodejsFunction(
      this,
      'GetProductByIdFunction',
      {
        entry: join(__dirname, '..', 'lambda', 'get-product-by-id.ts'),
        runtime: Runtime.NODEJS_20_X,
        functionName: 'get-product-by-id',
      }
    );

    const postProductLambda = new NodejsFunction(this, 'PostProductFunction', {
      entry: join(__dirname, '..', 'lambda', 'post-product.ts'),
      runtime: Runtime.NODEJS_20_X,
      functionName: 'post-product',
    });

    const cataloBatchProcessLambda = new NodejsFunction(
      this,
      'CataloBatchProcessFunction',
      {
        entry: join(__dirname, '..', 'lambda', 'catalog-batch-process.ts'),
        runtime: Runtime.NODEJS_20_X,
        functionName: 'catalog-batch-process',
      }
    );

    const docsLambda = new NodejsFunction(this, 'DocsFunction', {
      entry: join(__dirname, '..', 'lambda', 'docs.ts'),
      runtime: Runtime.NODEJS_20_X,
      functionName: 'docs-function',
      bundling: {
        loader: {
          '.json': 'json',
        },
      },
    });

    const httpApi = new apiGateway.HttpApi(this, 'ProductsHttpApi', {
      apiName: 'Products Http Api',
      corsPreflight: {
        allowHeaders: ['*'],
        allowOrigins: ['*'],
        allowMethods: [apiGateway.CorsHttpMethod.ANY],
      },
    });

    httpApi.addRoutes({
      path: '/products',
      methods: [apiGateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        'GetProductsIntegration',
        getProductsLambda
      ),
    });

    httpApi.addRoutes({
      path: '/products/batch',
      methods: [apiGateway.HttpMethod.GET, apiGateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        'GetProductsByIdsIntegration',
        getProductsByIdsLambda
      ),
    });

    httpApi.addRoutes({
      path: '/products/{productId}',
      methods: [apiGateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        'GetProductByIdIntegration',
        getProductByIdLambda
      ),
    });

    httpApi.addRoutes({
      path: '/products',
      methods: [apiGateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        'PostProductIntegration',
        postProductLambda
      ),
    });

    httpApi.addRoutes({
      path: '/docs',
      methods: [apiGateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        'DocsIntegration',
        docsLambda
      ),
    });

    const productsTable = new dynamodb.Table(this, 'ProductsTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      tableName: 'products',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const stocksTable = new dynamodb.Table(this, 'StocksTable', {
      partitionKey: {
        name: 'product_id',
        type: dynamodb.AttributeType.STRING,
      },
      tableName: 'stocks',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    productsTable.grantReadWriteData(getProductsLambda);
    productsTable.grantReadWriteData(getProductByIdLambda);
    productsTable.grantReadWriteData(postProductLambda);
    productsTable.grantReadWriteData(cataloBatchProcessLambda);

    stocksTable.grantReadWriteData(getProductsLambda);
    stocksTable.grantReadWriteData(getProductByIdLambda);
    stocksTable.grantReadWriteData(postProductLambda);
    stocksTable.grantReadWriteData(cataloBatchProcessLambda);

    productsTable.grantReadData(getProductsByIdsLambda);
    stocksTable.grantReadData(getProductsByIdsLambda);

    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue');

    cataloBatchProcessLambda.addEventSource(
      new event_sources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
      value: catalogItemsQueue.queueArn,
      exportName: 'CatalogItemsQueueArn',
    });

    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      displayName: 'Create Product Topic',
    });

    cataloBatchProcessLambda.addEnvironment(
      'TOPIC_ARN',
      createProductTopic.topicArn
    );
    createProductTopic.grantPublish(cataloBatchProcessLambda);

    const highPriceEmail = 'ivanzakharanka@gmail.com';
    const mediumPriceEmail = 'vanya1000@yandex.by';

    createProductTopic.addSubscription(
      new subs.EmailSubscription(highPriceEmail, {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            greaterThan: 1000,
          }),
        },
      })
    );

    createProductTopic.addSubscription(
      new subs.EmailSubscription(mediumPriceEmail, {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            lessThan: 1000,
          }),
        },
      })
    );
  }
}
