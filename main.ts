import { Construct } from "constructs";
import { App, TerraformStack, GcsBackend, TerraformAsset, AssetType } from "cdktf";
import * as google from "@cdktf/provider-google";
import * as path from "path";

const project = "glowing-engine-386523";
const region = "us-central1";
const repository = "glowing-engine";
const cdktfBucket = "cdktf-bucket-glowing-engine";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new GcsBackend(this, {
        bucket: cdktfBucket,
    });

    new google.provider.GoogleProvider(this, "google", {
        project,
        region,
    });

    new google.cloudbuildTrigger.CloudbuildTrigger(this, "trigger", {
        filename: "cloudbuild.yaml",
        github: {
            owner: "hsmtkk",
            name: repository,
            push: {
                branch: "main",
            },
        },
    });

    new google.artifactRegistryRepository.ArtifactRegistryRepository(this, "registry", {
        format: "DOCKER",
        location: region,
        repositoryId: "registry",
    });

    const gourmetSearchAPIKey = new google.secretManagerSecret.SecretManagerSecret(this, 'gourmetSearchAPIKey', {
        secretId: "gourmet-search-api-key",
        replication: {
            automatic: true,
        },
    });

    const frontRunner = new google.serviceAccount.ServiceAccount(this, 'frontRunner', {
        accountId: "front-runner",
    });

    const backRunner = new google.serviceAccount.ServiceAccount(this, 'backRunner', {
        accountId: "back-runner",
    });

    const backService = new google.cloudRunV2Service.CloudRunV2Service(this, 'backService', {
        location: region,
        name: 'back-service',
        template: {
            containers: [{
                env: [{
                    name: "GOURMET_SEARCH_API_KEY",
                    valueSource: {
                        secretKeyRef: {
                            secret: gourmetSearchAPIKey.secretId,
                            version: "latest",
                        },
                    },
                }],
                image: "us-docker.pkg.dev/cloudrun/container/hello",
            }],
            serviceAccount: backRunner.email,
        },
    });

    const asset = new TerraformAsset(this, "asset", {
        path: path.resolve("back"),
        type: AssetType.ARCHIVE,
    });

    const assetBucket = new google.storageBucket.StorageBucket(this, "assetBucket", {
        lifecycleRule: [{
          condition: {
            age: 1,
          },
          action: {
            type: "Delete",
          },
        }],
        location: region,
        name: `asset-bucket-${project}`,
    });

    const assetObject = new google.storageBucketObject.StorageBucketObject(this, "assetObject", {
        bucket: assetBucket.name,
        name: asset.assetHash,
        source: asset.path,
    });

    new google.cloudfunctions2Function.Cloudfunctions2Function(this, "frontService", {
        buildConfig: {
            runtime: "go120",
            entryPoint: "EntryPoint",
            source: {
                storageSource: {
                    bucket: assetBucket.name,
                    object: assetObject.name,
                },
            },
        },
        name: "front-service",
        serviceConfig: {
            environmentVariables: {
                BACK_SERVICE_URL: backService.uri,
            },
            serviceAccountEmail: frontRunner.email,
        },
    });

  }
}

const app = new App();
new MyStack(app, "glowing-engine");
app.synth();
