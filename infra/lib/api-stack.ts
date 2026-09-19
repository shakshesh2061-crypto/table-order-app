import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as logs from "aws-cdk-lib/aws-logs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/**
 * CloudFormation's SSM-secure dynamic reference ({{resolve:ssm-secure:...}})
 * is only supported in a small allowlist of resource properties — Lambda
 * environment variables are NOT one of them (confirmed via `cdk synth`
 * template validation, which flags it explicitly). So instead of a dynamic
 * reference resolved by CloudFormation, this fetches the value directly at
 * `cdk synth`/`cdk deploy` time using the same AWS credentials already
 * configured on this machine, and embeds it as a literal string. Tradeoff
 * (accepted): the plaintext value ends up in the synthesized template and
 * is visible in the Lambda console — acceptable here since the only person
 * with access to this AWS account is its owner, and it avoids a paid VPC
 * endpoint the Lambda would otherwise need to fetch it itself at runtime.
 */
function readSsmSecureStringAtSynth(parameterName: string): string {
  return execFileSync(
    "aws",
    ["ssm", "get-parameter", "--name", parameterName, "--with-decryption", "--query", "Parameter.Value", "--output", "text", "--region", "us-east-1"],
    { encoding: "utf-8" }
  ).trim();
}

export interface ApiStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  lambdaSecurityGroup: ec2.SecurityGroup;
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUsername: string;
  uploadsBucket: s3.Bucket;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  wsEventsTable: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const fn = new lambdaNode.NodejsFunction(this, "RestApiFunction", {
      functionName: "table-order-api",
      entry: path.join(__dirname, "..", "..", "backend", "src", "lambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      // No reservedConcurrentExecutions: this account's default Lambda
      // concurrency quota is only 10 (new-account default, not yet raised),
      // and reserving any amount here would violate AWS's floor of 10
      // unreserved concurrency for the rest of the account. The account-wide
      // limit of 10 already caps runaway cost for a single-function app.
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      // Correction from an earlier assumption: Lambda ENIs never get a
      // public IP, even in a public subnet with auto-assign enabled — that
      // setting only applies to EC2. A VPC-attached Lambda therefore has NO
      // internet egress without a NAT gateway or a paid VPC interface
      // endpoint (neither free). Since this function only needs RDS, which
      // is reachable privately within the VPC, it deliberately stays
      // internet-less rather than pay for either — see AUTH_PROVIDER below.
      allowPublicSubnet: true,
      securityGroups: [props.lambdaSecurityGroup],
      logRetention: logs.RetentionDays.ONE_WEEK,
      bundling: {
        // Codebase is "type": "module" throughout (uses import.meta.url for
        // __dirname) — ESM output keeps that working at runtime instead of
        // silently emptying import.meta under CJS.
        format: lambdaNode.OutputFormat.ESM,
        // serverless-http (and some of its transitive deps) call require()
        // dynamically at runtime to detect the framework type — plain ESM
        // output has no `require` at all, so esbuild's shim throws "Dynamic
        // require of ... is not supported". Standard fix: inject a real
        // require backed by Node's createRequire.
        banner:
          "import { createRequire as __topLevelCreateRequire } from 'module'; const require = __topLevelCreateRequire(import.meta.url);",
        // Knex's pg client statically requires every dialect driver
        // (mysql/mysql2/mariadb/etc.) even though only "pg" is ever
        // selected at runtime — esbuild fails trying to resolve the
        // uninstalled ones unless marked external (the require() calls are
        // simply never reached since DB_CLIENT is always "pg" here).
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
        // The Cognito JWKS cache must ship alongside the bundled code (read
        // via readFileSync relative to the compiled file), not be dropped
        // as an unreferenced asset.
        commandHooks: {
          beforeBundling: () => [],
          afterBundling: (_inputDir: string, outputDir: string) => {
            const jwksPath = path.join(__dirname, "..", "..", "backend", "src", "auth", "cognito-jwks", "jwks.json");
            return [`mkdir -p ${outputDir}/cognito-jwks`, `cp ${jwksPath} ${outputDir}/cognito-jwks/jwks.json`];
          },
          beforeInstall: () => [],
        },
      },
      environment: {
        // AUTH_PROVIDER is "local" (RDS-backed JWT), not "cognito", purely
        // as a cost decision: this VPC-attached Lambda has no internet
        // egress (see note above), and Cognito's Admin* API calls are live
        // network calls that would hang until timeout without a paid VPC
        // endpoint. Cognito itself is still fully deployed and verified
        // (AuthStack, Phase B) — it's just not wired into this deployment.
        AUTH_PROVIDER: "local",
        STORAGE_PROVIDER: "s3",
        DB_CLIENT: "pg",
        DB_HOST: props.dbHost,
        DB_PORT: props.dbPort,
        DB_NAME: props.dbName,
        DB_USER: props.dbUsername,
        // Fetched once at `cdk deploy` time (see readSsmSecureStringAtSynth
        // above) — the Lambda itself never calls SSM at runtime, so it
        // needs neither SSM/KMS IAM permissions nor an internet path.
        DB_PASSWORD: readSsmSecureStringAtSynth("/table-order/rds/password"),
        JWT_SECRET: readSsmSecureStringAtSynth("/table-order/jwt-secret"),
        S3_BUCKET_NAME: props.uploadsBucket.bucketName,
        // Real-time: this Lambda only writes events (never fans out to
        // sockets itself) — see dynamoEventPublisher.ts / broadcastLambda.ts.
        REALTIME_PUBLISHER: "dynamodb",
        WS_EVENTS_TABLE: props.wsEventsTable.tableName,
      },
    });

    // Narrow, resource-scoped permissions — no "*" anywhere. RDS is reached
    // directly over the VPC (no IAM action involved), and the DB/JWT
    // secrets are resolved by CloudFormation at deploy time, not fetched by
    // the Lambda at runtime.
    props.uploadsBucket.grantReadWrite(fn, "menu-photos/*");
    props.wsEventsTable.grantWriteData(fn);

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "table-order-api",
      corsPreflight: {
        allowOrigins: ["*"], // tightened to the CloudFront domain once WebStack (Phase E) exists
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigwv2.HttpMethod.ANY],
      integration: new apigwIntegrations.HttpLambdaIntegration("ProxyIntegration", fn),
    });
    httpApi.addRoutes({
      path: "/",
      methods: [apigwv2.HttpMethod.ANY],
      integration: new apigwIntegrations.HttpLambdaIntegration("RootIntegration", fn),
    });

    this.apiUrl = httpApi.apiEndpoint;
    new cdk.CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
  }
}
