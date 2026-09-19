import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function readSsmSecureStringAtSynth(parameterName: string): string {
  return execFileSync(
    "aws",
    ["ssm", "get-parameter", "--name", parameterName, "--with-decryption", "--query", "Parameter.Value", "--output", "text", "--region", "us-east-1"],
    { encoding: "utf-8" }
  ).trim();
}

const NODEJS_BUNDLING = {
  format: lambdaNode.OutputFormat.ESM,
  banner:
    "import { createRequire as __topLevelCreateRequire } from 'module'; const require = __topLevelCreateRequire(import.meta.url);",
  externalModules: [
    "mysql",
    "mysql2",
    "mariadb",
    "mariadb/callback",
    "oracledb",
    "tedious",
    "pg-native",
    "better-sqlite3",
    "sqlite3",
  ],
  commandHooks: {
    beforeBundling: () => [],
    afterBundling: (_inputDir: string, outputDir: string) => {
      const jwksPath = path.join(__dirname, "..", "..", "backend", "src", "auth", "cognito-jwks", "jwks.json");
      return [`mkdir -p ${outputDir}/cognito-jwks`, `cp ${jwksPath} ${outputDir}/cognito-jwks/jwks.json`];
    },
    beforeInstall: () => [],
  },
};

export interface RealtimeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  lambdaSecurityGroup: ec2.SecurityGroup;
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUsername: string;
  wsConnectionsTable: dynamodb.Table;
  wsEventsTable: dynamodb.Table;
}

export class RealtimeStack extends cdk.Stack {
  public readonly wsUrl: string;

  constructor(scope: Construct, id: string, props: RealtimeStackProps) {
    super(scope, id, props);

    const dbEnv = {
      DB_CLIENT: "pg",
      DB_HOST: props.dbHost,
      DB_PORT: props.dbPort,
      DB_NAME: props.dbName,
      DB_USER: props.dbUsername,
      DB_PASSWORD: readSsmSecureStringAtSynth("/table-order/rds/password"),
      JWT_SECRET: readSsmSecureStringAtSynth("/table-order/jwt-secret"),
    };

    // $connect needs RDS (guest table-session lookups) — same VPC-only,
    // no-internet-needed pattern as the REST API Lambda.
    const connectFn = new lambdaNode.NodejsFunction(this, "ConnectFunction", {
      functionName: "table-order-ws-connect",
      entry: path.join(__dirname, "..", "..", "backend", "src", "realtime", "connectLambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      allowPublicSubnet: true,
      securityGroups: [props.lambdaSecurityGroup],
      logRetention: logs.RetentionDays.ONE_WEEK,
      bundling: NODEJS_BUNDLING,
      environment: { ...dbEnv, WS_CONNECTIONS_TABLE: props.wsConnectionsTable.tableName },
    });
    props.wsConnectionsTable.grantWriteData(connectFn);

    // $disconnect and $default touch no RDS/Cognito state at all — no VPC,
    // free internet by default, faster cold starts.
    const disconnectFn = new lambdaNode.NodejsFunction(this, "DisconnectFunction", {
      functionName: "table-order-ws-disconnect",
      entry: path.join(__dirname, "..", "..", "backend", "src", "realtime", "disconnectLambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_WEEK,
      bundling: NODEJS_BUNDLING,
      environment: { WS_CONNECTIONS_TABLE: props.wsConnectionsTable.tableName },
    });
    props.wsConnectionsTable.grantWriteData(disconnectFn);

    const defaultFn = new lambdaNode.NodejsFunction(this, "DefaultFunction", {
      functionName: "table-order-ws-default",
      entry: path.join(__dirname, "..", "..", "backend", "src", "realtime", "defaultLambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      logRetention: logs.RetentionDays.ONE_WEEK,
      bundling: NODEJS_BUNDLING,
    });

    const webSocketApi = new apigwv2.WebSocketApi(this, "WebSocketApi", {
      apiName: "table-order-ws",
      connectRouteOptions: { integration: new apigwIntegrations.WebSocketLambdaIntegration("ConnectIntegration", connectFn) },
      disconnectRouteOptions: { integration: new apigwIntegrations.WebSocketLambdaIntegration("DisconnectIntegration", disconnectFn) },
      defaultRouteOptions: { integration: new apigwIntegrations.WebSocketLambdaIntegration("DefaultIntegration", defaultFn) },
    });

    const stage = new apigwv2.WebSocketStage(this, "ProdStage", {
      webSocketApi,
      stageName: "prod",
      autoDeploy: true,
    });

    // Broadcaster: triggered by the ws-events Stream, deliberately outside
    // the VPC (no RDS dependency) so it gets free internet egress for
    // postToConnection — see broadcastLambda.ts for the matching logic.
    const broadcastFn = new lambdaNode.NodejsFunction(this, "BroadcastFunction", {
      functionName: "table-order-ws-broadcast",
      entry: path.join(__dirname, "..", "..", "backend", "src", "realtime", "broadcastLambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      logRetention: logs.RetentionDays.ONE_WEEK,
      bundling: NODEJS_BUNDLING,
      environment: {
        WS_CONNECTIONS_TABLE: props.wsConnectionsTable.tableName,
        WS_API_ENDPOINT: `https://${webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${stage.stageName}`,
      },
    });
    props.wsConnectionsTable.grantReadWriteData(broadcastFn);
    broadcastFn.addEventSource(
      new lambdaEventSources.DynamoEventSource(props.wsEventsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 1,
      })
    );
    // postToConnection against this specific WebSocket API/stage only.
    broadcastFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["execute-api:ManageConnections"],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${stage.stageName}/POST/@connections/*`],
      })
    );

    this.wsUrl = stage.url;
    new cdk.CfnOutput(this, "WebSocketUrl", { value: stage.url });
  }
}
