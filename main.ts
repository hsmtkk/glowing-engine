import { Construct } from "constructs";
import { App, TerraformStack, GcsBackend } from "cdktf";
import * as google from '@cdktf/provider-google';

const project = "glowing-engine";
const region = "us-central1";
const cdktfBackend = `cdktf-bucket-${project}`;

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new GcsBackend(this, {
        bucket: cdktfBackend,
    });

    new google.provider.GoogleProvider(this, "google", {
        project,
        region,
    });

  }
}

const app = new App();
new MyStack(app, "glowing-engine");
app.synth();
