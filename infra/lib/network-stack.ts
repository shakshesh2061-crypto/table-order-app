import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Public-subnets-only, zero NAT gateways — the single biggest free-tier
    // leak otherwise (NAT Gateway is never covered by any free tier).
    this.vpc = new ec2.Vpc(this, "TableOrderVpc", {
      vpcName: "table-order-vpc",
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // Free gateway endpoints so VPC-attached Lambdas can reach S3/DynamoDB
    // without any NAT/internet path.
    this.vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });
    this.vpc.addGatewayEndpoint("DynamoDbEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, "LambdaSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: "table-order-lambda-sg",
      description: "Security group for VPC-attached Lambdas (REST API, WS $connect)",
      allowAllOutbound: true,
    });

    new cdk.CfnOutput(this, "VpcId", { value: this.vpc.vpcId });
    new cdk.CfnOutput(this, "LambdaSecurityGroupId", { value: this.lambdaSecurityGroup.securityGroupId });
  }
}
