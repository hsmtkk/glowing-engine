import { Construct } from "constructs";
import { App, TerraformStack, GcsBackend, TerraformAsset, AssetType } from "cdktf";
import * as google from "@cdktf/provider-google";
import * as path from "path";
import { DataGoogleIamPolicy } from "@cdktf/provider-google/lib/data-google-iam-policy";

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

    new google.projectIamMember.ProjectIamMember(this, 'frontRunnerToFunctions', {
        member: `serviceAccount:${frontRunner.email}`,
        project,
        role: "roles/run.invoker",
    });

    const backRunner = new google.serviceAccount.ServiceAccount(this, 'backRunner', {
        accountId: "back-runner",
    });

    new google.projectIamMember.ProjectIamMember(this, "backRunnerToSecret", {
        member: `serviceAccount:${backRunner.email}`,
        project,
        role: "roles/secretmanager.secretAccessor",
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


    const backService = new google.cloudfunctions2Function.Cloudfunctions2Function(this, "backService", {
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
        location: region,
        name: "back-service",
        serviceConfig: {
            secretEnvironmentVariables: [{
                key: "GOURMET_SEARCH_API_KEY",
                projectId: project,
                secret: gourmetSearchAPIKey.secretId,
                version: "latest",
            }],
            serviceAccountEmail: backRunner.email,
        },
    });

    const frontService = new google.cloudRunV2Service.CloudRunV2Service(this, 'frontService', {
        location: region,
        name: 'front-service',
        template: {
            containers: [{
                env: [{
                    name: "BACK_SERVICE_URL",
                    value: backService.serviceConfig.uri,
                }],
                image: "us-docker.pkg.dev/cloudrun/container/hello",
            }],
            serviceAccount: frontRunner.email,
        },
    });

    const publicData = new DataGoogleIamPolicy(this, "publicData", {
        binding: [{
            role: "roles/run.invoker",
            members: ["allUsers"],
        }],
    });

    new google.cloudRunServiceIamPolicy.CloudRunServiceIamPolicy(this, "frontPublic", {
        location: region,
        policyData: publicData.policyData,
        service: frontService.name,
    });

  }
}

const app = new App();
new MyStack(app, "glowing-engine");
app.synth();
