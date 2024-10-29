import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apiGateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
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

    stocksTable.grantReadWriteData(getProductsLambda);
    stocksTable.grantReadWriteData(getProductByIdLambda);
    stocksTable.grantReadWriteData(postProductLambda);
  }
}
