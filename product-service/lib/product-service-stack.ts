import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apiGateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { join } from 'path';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsLambda = new NodejsFunction(this, 'GetProductsFunction', {
      entry: join(__dirname,'..', 'lambda', 'get-products.ts'),
      runtime: Runtime.NODEJS_20_X,
      functionName: 'get-products',
  });

  const getProductByIdLambda = new NodejsFunction(this, 'GetProductByIdFunction', {
      entry: join(__dirname,'..', 'lambda', 'get-product-by-id.ts'),
      runtime: Runtime.NODEJS_20_X,
      functionName: 'get-product-by-id',
  });

  const docsLambda = new NodejsFunction(this, 'DocsFunction', {
    entry: join(__dirname, '..', 'lambda', 'docs.ts'),
    runtime: Runtime.NODEJS_20_X,
    functionName: 'docs-function',
    bundling: {
      loader: {
        '.json': 'json', // Tell esbuild to include JSON files
      },
    },
  });

  const httpApi = new apiGateway.HttpApi(this, 'ProductsHttpApi', {
    apiName: 'Products Http Api',
    corsPreflight: {
      allowHeaders: ['*'],
      allowOrigins: ['*'],
      allowMethods: [apiGateway.CorsHttpMethod.ANY]
    }
  });

  httpApi.addRoutes({
    path: '/products',
    methods: [apiGateway.HttpMethod.GET],
    integration: new integrations.HttpLambdaIntegration('GetProductsIntegration', getProductsLambda),
  });

  httpApi.addRoutes({
    path: '/products/{productId}',
    methods: [apiGateway.HttpMethod.GET],
    integration: new integrations.HttpLambdaIntegration('GetProductByIdIntegration', getProductByIdLambda),
  });

  httpApi.addRoutes({
    path: '/docs',
    methods: [apiGateway.HttpMethod.GET],
    integration: new integrations.HttpLambdaIntegration(
      'DocsIntegration',
      docsLambda
    ),
  });
}
}
