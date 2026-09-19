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
