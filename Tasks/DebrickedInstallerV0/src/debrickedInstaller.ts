"use strict";

import * as tl from 'azure-pipelines-task-lib/task';
import * as path from 'path';
import * as toolLib from 'azure-pipelines-tool-lib/tool';
import * as utils from './utils';

tl.setResourcePath(path.join(__dirname, '..', 'task.json'));

let telemetry = {
    jobId: tl.getVariable('SYSTEM_JOBID')
};

console.log("##vso[telemetry.publish area=%s;feature=%s]%s",
    "TaskEndpointId",
    "FcliInstallerV0",
    JSON.stringify(telemetry));

async function downloadDebricked() {
    const version = await utils.getDebrickedVersion();
    const debrickedPath = await utils.downloadDebricked(version);

    // prepend the tools path. instructs the agent to prepend for future tasks
    if (!process.env['PATH'].startsWith(path.dirname(debrickedPath))) {
        toolLib.prependPath(path.dirname(debrickedPath));
    }
}

async function verifyDebricked() {
    console.log(tl.loc("VerifyingDebrickedInstallation"));
    const debrickedPath = tl.which("debricked", true);
    var debricked = tl.tool(debrickedPath);
    debricked.arg("--version");
    return debricked.exec();
}

downloadDebricked()
    .then(() => verifyDebricked())
    .then(() => {
        tl.setResult(tl.TaskResult.Succeeded, "");
    }).catch((error) => {
    tl.setResult(tl.TaskResult.Failed, error)
});
