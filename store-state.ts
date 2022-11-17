import { Stats } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import config from './config';
import log from './log';
import { PackageInstallInfo, SemanticVersion } from './nox';

export type StoreState = Record<string, PackageInstallInfo<any>>;

const createEmptyState = async () => {
    await fs.writeFile(config.stateFile, '{}\n');
}

const readStateFile = async (): Promise<StoreState> => {
    try {
        return JSON.parse(
            await fs.readFile(config.stateFile).then(it => it.toString('utf-8'))
        )
    } catch (e) {
        await createEmptyState();
        return {};
    }
};

const writeStateFile = async (state: StoreState): Promise<void> => {
    await fs.writeFile(config.stateFile, JSON.stringify(state, undefined, 2) + '\n');
}

const generatePathsFor = (pkgName: string, dirs?: string | string[]): string => {
    if (!dirs) {
        return ``;
    }
    let out = '';
    if (typeof dirs === 'string') {
        out += `export PATH="$PATH:${path.resolve(config.storePath, pkgName, dirs)}"\n`;
    } else {
        for (const dir of dirs) {
            out += `export PATH="$PATH:${path.resolve(config.storePath, pkgName, dir)}"\n`;
        }
    }

    return out;
}

const regeneratePaths = async (state: StoreState): Promise<void> => {
    let paths = '';
    for (const pkg of Object.values(state)) {
        paths += `# ${pkg.prettyName} (${pkg.standardName})\n`
        paths += generatePathsFor(pkg.standardName, pkg.output.binDirRelativeToOutputDir);
        paths += generatePathsFor(pkg.standardName, pkg.output.libDirRelativeToOutputDir);
        paths += generatePathsFor(pkg.standardName, pkg.output.includeDirRelativeToOutputDir);
        paths += '\n'
    }

    await fs.writeFile(config.pathsFile, paths);
};

class StoreStateImpl {
    async delete(key: string): Promise<void> {
        log.info(`state :: removing ${key} for store state...`)
        const state = await readStateFile();
        delete state[key];
        await writeStateFile(state);
        await regeneratePaths(state);
    }

    async get(key: string): Promise<PackageInstallInfo<any>> {
        const state = await readStateFile();

        if (this.has(key)) {
            return state[key]
        }

        log.error(`store state does not contain "${key}"`)
        process.exit(1)
    }

    async has(key: string): Promise<boolean> {
        const state = await readStateFile();
        return !!state[key]
    }

    async set(key: string, value: PackageInstallInfo<any>): Promise<this> {
        log.info(`state :: Updating store state for ${key}...`)
        const state = await readStateFile();
        state[key] = value;
        await writeStateFile(state);
        await regeneratePaths(state)
        return this;
    }

    async entries(): Promise<Array<[string, PackageInstallInfo<any>]>> {
        const state = await readStateFile();
        return Object.entries(state);
    }

    async keys(): Promise<Array<string>> {
        const state = await readStateFile();
        return Object.keys(state)
    }

    async values(): Promise<Array<PackageInstallInfo<any>>> {
        const state = await readStateFile();
        return Object.values(state)
    }
}

const storeState = new StoreStateImpl();
export default storeState