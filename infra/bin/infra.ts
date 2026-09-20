#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { DataStack } from "../lib/data-stack";
import { AuthStack } from "../lib/auth-stack";
import { ApiStack } from "../lib/api-stack";
import { RealtimeStack } from "../lib/realtime-stack";
import { WebStack } from "../lib/web-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

const network = new NetworkStack(app, "TableOrderNetworkStack", { env });

const data = new DataStack(app, "TableOrderDataStack", {
  env,
  vpc: network.vpc,
  lambdaSecurityGroup: network.lambdaSecurityGroup,
});

const auth = new AuthStack(app, "TableOrderAuthStack", { env });

// WebStack's CloudFront domain, known from the first deploy — see the
// frontendBaseUrl doc comment on ApiStackProps for why this can't be a
// real cross-stack reference (ApiStack must exist before the frontend can
// be built, and WebStack deploys after ApiStack).
const FRONTEND_BASE_URL = "https://d2k3v3lord2yqa.cloudfront.net";

new ApiStack(app, "TableOrderApiStack", {
  env,
  vpc: network.vpc,
  lambdaSecurityGroup: network.lambdaSecurityGroup,
  dbHost: data.dbInstance.dbInstanceEndpointAddress,
  dbPort: data.dbInstance.dbInstanceEndpointPort,
  dbName: "tableorder",
  dbUsername: "tableorder_admin",
  uploadsBucket: data.uploadsBucket,
  userPool: auth.userPool,
  userPoolClient: auth.userPoolClient,
  wsEventsTable: data.wsEventsTable,
  frontendBaseUrl: FRONTEND_BASE_URL,
});

new RealtimeStack(app, "TableOrderRealtimeStack", {
  env,
  vpc: network.vpc,
  lambdaSecurityGroup: network.lambdaSecurityGroup,
  dbHost: data.dbInstance.dbInstanceEndpointAddress,
  dbPort: data.dbInstance.dbInstanceEndpointPort,
  dbName: "tableorder",
  dbUsername: "tableorder_admin",
  wsConnectionsTable: data.wsConnectionsTable,
  wsEventsTable: data.wsEventsTable,
});

new WebStack(app, "TableOrderWebStack", { env });
