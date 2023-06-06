import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as certManager from 'aws-cdk-lib/aws-certificatemanager';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';

export class S3Cloudfront53Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const DOMAIN_NAME = 'amritpaudel.me';

    const bucket = new s3.Bucket(this, 'buildnAssets', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      websiteIndexDocument: 'index.html'
    });

    bucket.grantPublicAccess();

    const hostedZone = route53.HostedZone.fromLookup(this, 'website-hostedzone', { domainName: DOMAIN_NAME });

    const certificate = new certManager.Certificate(this, 'website-certificate', {
      domainName: DOMAIN_NAME,
      validation: certManager.CertificateValidation.fromDns(),
    });

    const siteDistribution = new cloudfront.Distribution(this, "SiteDistribution", {
      defaultRootObject: 'index.html',
      domainNames: [DOMAIN_NAME],
      certificate: certificate,
      defaultBehavior: {
        origin: new S3Origin(bucket)
      }
    });

    new route53.ARecord(this, 'web-dns-A-record', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new CloudFrontTarget(siteDistribution))
    })


    new cdk.CfnOutput(this, 'cloudfront-url', {
      value: siteDistribution.distributionDomainName,
      description: 'cloudfront website-url',
      exportName: 'cloudfrontURL',
    });

    new cdk.CfnOutput(this, 'website-url', {
      value: DOMAIN_NAME,
      description: 'custom url',
      exportName: 'websiteUrl',
    });

  }
}
