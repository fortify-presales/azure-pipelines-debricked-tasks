"use strict";

import * as fs from 'fs';
import * as tl from 'azure-pipelines-task-lib/task';
import * as toolLib from 'azure-pipelines-tool-lib/tool';
import * as os from 'os';
import * as path from "path";
import * as util from 'util';

export async function getDebrickedVersion(): Promise<string> {
    const version = tl.getInput("version");
    if (version && version !== "latest") {
        return sanitizeVersionString(version);
    }

    console.log(tl.loc("FindingLatestDebrickedVersion"));
    const latestVersion =  await getLatestDebrickedVersion();
    console.log(tl.loc("LatestDebrickedVersion", latestVersion));
    return latestVersion;
}

export async function downloadDebricked(version: string): Promise<string> {
    return await downloadDebrickedInternal(version);
}

// handle user input scenarios
function sanitizeVersionString(inputVersion: string) : string{
    // debricked doesn't use semantic versioning correctly so we can't use below
    //const version = toolLib.cleanVersion(inputVersion);
    // instead just remove trailing/leading whitespace
    let version = inputVersion.trim();
    if(!version) {
        throw new Error(tl.loc("NotAValidVersion"));
    }

    return version;
}

const debrickedToolName = 'debricked';
const stableDebrickedVersion = 'v1.5.1';

async function getLatestDebrickedVersion(): Promise<string> {
    const debrickedLatestReleaseUrl = 'https://api.github.com/repos/debricked/cli/releases/latest';
    let latestVersion = stableDebrickedVersion;

    try {
        const downloadPath = await toolLib.downloadTool(debrickedLatestReleaseUrl);
        const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
        if (response.tag_name) {
            latestVersion = response.tag_name;
        }
    } catch (error) {
        tl.warning(tl.loc('ErrorFetchingLatestVersion', debrickedLatestReleaseUrl, error, stableDebrickedVersion));
    }

    return latestVersion;
}

async function downloadDebrickedInternal(version: string): Promise<string> {
    let cachedToolpath = toolLib.findLocalTool(debrickedToolName, version);

    if (!cachedToolpath) {
        const downloadUrl = getDownloadUrl(version);
        let downloadPath;
        try {
            downloadPath = await toolLib.downloadTool(downloadUrl);
        }
        catch (ex) {
            throw new Error(tl.loc('DebrickedDownloadFailed', downloadUrl, ex));
        }

        switch (os.type()) {
            case 'Linux':
            case 'Darwin':
            case 'Windows_NT':
            default:
                tl.debug('Extracting the downloaded debricked tar file..');
                const untaredDebrickedPath = await toolLib.extractTar(downloadPath);
                cachedToolpath = await toolLib.cacheDir(untaredDebrickedPath, debrickedToolName, version);
                break;
        }
        console.log(tl.loc("SuccessfullyDownloaded", version, cachedToolpath));
    } else {
        console.log(tl.loc("VersionAlreadyInstalled", version, cachedToolpath));
    }

    const debrickedPath = path.join(cachedToolpath, debrickedToolName + getExecutableExtension());
    fs.chmodSync(debrickedPath, '755');
    const gozipPath = path.join(cachedToolpath, 'gozip' + getExecutableExtension());
    if (fs.existsSync(gozipPath)) {
        fs.chmodSync(gozipPath, '755');
    }

    return debrickedPath;
}

function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }

    return '';
}

function getDownloadUrl(version: string) {
    let downloadUrlFormat = 'https://github.com/debricked/cli/releases/download/%s/%s';
    switch (os.type()) {
        case 'Linux':
            // https://github.com/debricked/cli/releases/latest/download/cli_linux_x86_64.tar.gz
            return util.format(downloadUrlFormat, version, 'cli_linux_x86_64.tar.gz');

        case 'Darwin':
            //https://github.com/debricked/cli/releases/latest/download/cli_macOS_arm64.tar.gz
            return util.format(downloadUrlFormat, version, 'cli_macOS_arm64.tar.gz');

        case 'Windows_NT':
        default:
            // https://github.com/debricked/cli/releases/latest/download/cli_windows_x86_64.tar.gz
            return util.format(downloadUrlFormat, version, 'cli_windows_x86_64.tar.gz');

    }
}
