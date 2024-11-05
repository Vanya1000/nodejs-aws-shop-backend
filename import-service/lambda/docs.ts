import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import openApiSpec from '../open-api/open-api.json';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const openApiJsonString = JSON.stringify(openApiSpec);

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" >
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function() {
        const spec = ${openApiJsonString};
        const ui = SwaggerUIBundle({
          spec: spec,
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: "StandaloneLayout"
        });
      };
    </script>
  </body>
  </html>
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: html,
  };
};
