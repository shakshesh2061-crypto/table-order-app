import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export interface DataStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  lambdaSecurityGroup: ec2.SecurityGroup;
}

const DB_MASTER_USERNAME = "tableorder_admin";
const DB_NAME = "tableorder";
const SSM_PASSWORD_PARAM = "/table-order/rds/password";

export class DataStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly uploadsBucket: s3.Bucket;
  public readonly wsConnectionsTable: dynamodb.Table;
  public readonly wsEventsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const rdsSecurityGroup = new ec2.SecurityGroup(this, "RdsSecurityGroup", {
      vpc: props.vpc,
      securityGroupName: "table-order-rds-sg",
      description: "RDS Postgres - inbound 5432 from Lambda SG only (plus a temporary migration window)",
      allowAllOutbound: true,
    });
    rdsSecurityGroup.addIngressRule(
      props.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow Postgres from application Lambdas"
    );

    // Password lives only in SSM Parameter Store (SecureString, free tier),
    // referenced via a CloudFormation dynamic reference so the plaintext
    // never appears in the synthesized template, stack outputs, or console.
    const credentials = rds.Credentials.fromPassword(
      DB_MASTER_USERNAME,
      cdk.SecretValue.ssmSecure(SSM_PASSWORD_PARAM, "1")
    );

    this.dbInstance = new rds.DatabaseInstance(this, "TableOrderDb", {
      instanceIdentifier: "table-order-db",
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [rdsSecurityGroup],
      credentials,
      databaseName: DB_NAME,
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      multiAz: false,
      publiclyAccessible: false, // toggled temporarily during the migration window only
      backupRetention: cdk.Duration.days(1),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // portfolio project — fine to destroy/recreate between sessions
      deletionProtection: false,
    });

    new cdk.CfnOutput(this, "DbEndpoint", { value: this.dbInstance.dbInstanceEndpointAddress });
    new cdk.CfnOutput(this, "DbPort", { value: this.dbInstance.dbInstanceEndpointPort });
    new cdk.CfnOutput(this, "DbSecurityGroupId", { value: rdsSecurityGroup.securityGroupId });
    new cdk.CfnOutput(this, "DbName", { value: DB_NAME });
    new cdk.CfnOutput(this, "DbUsername", { value: DB_MASTER_USERNAME });

    // Menu-item photo uploads. Block all public ACL usage; a scoped bucket
    // policy (not an ACL) grants public READ on menu-photos/* only — never
    // public write.
    this.uploadsBucket = new s3.Bucket(this, "UploadsBucket", {
      bucketName: `table-order-uploads-${this.account}`,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.uploadsBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "PublicReadMenuPhotos",
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:GetObject"],
        resources: [this.uploadsBucket.arnForObjects("menu-photos/*")],
      })
    );

    new cdk.CfnOutput(this, "UploadsBucketName", { value: this.uploadsBucket.bucketName });

    // Real-time WebSocket connection tracking + event queue (Phase D).
    // Provisioned capacity (not on-demand) deliberately: only provisioned
    // mode falls under DynamoDB's always-free 25 RCU / 25 WCU allowance.
    this.wsConnectionsTable = new dynamodb.Table(this, "WsConnectionsTable", {
      tableName: "table-order-ws-connections",
      partitionKey: { name: "connectionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.wsEventsTable = new dynamodb.Table(this, "WsEventsTable", {
      tableName: "table-order-ws-events",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      timeToLiveAttribute: "expiresAt",
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, "WsConnectionsTableName", { value: this.wsConnectionsTable.tableName });
    new cdk.CfnOutput(this, "WsEventsTableName", { value: this.wsEventsTable.tableName });
    new cdk.CfnOutput(this, "WsEventsTableStreamArn", { value: this.wsEventsTable.tableStreamArn! });
  }
}
