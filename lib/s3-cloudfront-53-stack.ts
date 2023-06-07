import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as certManager from 'aws-cdk-lib/aws-certificatemanager';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CloudFrontTarget, Route53RecordTarget } from 'aws-cdk-lib/aws-route53-targets';

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

    // HostedZone is created manually, 
    // we create hosted zone for domain after purchasing domainname
    const hostedZone = route53.HostedZone.fromLookup(this, 'website-hostedzone', { domainName: DOMAIN_NAME });

    //  we need to request certificate from domain name provider .
    //  we can dot that by certificate manager
    //  we request certificate for *.domain.com which will return certificate valid for any subdomain
    //  we are mentioning bare domain  as subjectAlternativeNames  because some domain providers may 
    //  not include  bare/root domain in certificate of *.domain.com
    const certificate = new certManager.Certificate(this, 'website-certificate', {
      domainName: `*.${DOMAIN_NAME}`,
      subjectAlternativeNames: [DOMAIN_NAME],
      validation: certManager.CertificateValidation.fromDns(),
    });

    // cloudfront distribution ,
    // we are providing array of domainNames  might get linked  to cloudfront
    // Attached certificate should cover all domain in domainNames array
    //
    const siteDistribution = new cloudfront.Distribution(this, "SiteDistribution", {
      defaultRootObject: 'index.html',
      domainNames: [`www.${DOMAIN_NAME}`, DOMAIN_NAME],
      certificate: certificate,
      defaultBehavior: {
        origin: new S3Origin(bucket),
        // allows both http and https request
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL
      }
    });

    // for www.domain.com -> cloudfront
    new route53.ARecord(this, 'web-dns-www-A-record', {
      recordName: 'www',
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new CloudFrontTarget(siteDistribution))
    })

    // for domein.com -> cloudfront
    new route53.ARecord(this, 'web-dns-Bare-A-record', {
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

    new cdk.CfnOutput(this, 'bucket-website-url', {
      value: bucket.bucketDomainName,
      exportName: 'bucketwebsiteUrl',
    });

  }
}
