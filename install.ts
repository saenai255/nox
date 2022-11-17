import { InstallType, nox, PackageConfiguration, PackageRef } from "./nox";
import * as os from 'os'
import * as path from 'path'
import * as process from 'process'
import * as fs from 'fs/promises'
import config from "./config";
import storeState from "./store-state";
import log from "./log";

const withTempDir = async (cb: (dir: string) => void | Promise<void>) => {
    const tmpDir = await fs.mkdtemp(path.resolve(os.tmpdir(), 'nox-'));
    log.info(`created temporary directory ${tmpDir}...`)
    try {
        await cb(tmpDir);
    } catch (e) {
        throw e;
    } finally {
        log.info(`removing temporary directory ${tmpDir}...`)
        await fs.rm(tmpDir, {
            recursive: true,
            force: true
        });
    }
}

const insideDir = async (path: string, cb: () => void | Promise<void>) => {
    const currentWorkingDir = process.cwd();
    log.info(`entering directory ${path}...`)
    try {
        process.chdir(path)
        await cb();
    } catch (e) {
        throw e;
    } finally {
        log.info(`leaving directory ${path}...`)
        process.chdir(currentWorkingDir);
    }
}


const importPackageConfiguration = async <T = any>(name: string): Promise<PackageConfiguration<T>> => {
    const PackageConfigurationClass = await import(`./packages/` + name);
    const packageConfiguration = new PackageConfigurationClass.default();
    return packageConfiguration;
}

export const uninstall = async (name: PackageRef) => {
    log.info(`uninstalling package ${name}...`)
    const isInstalled = await storeState.has(name);
    if (!isInstalled) {
        return
    }

    const packageConfiguration = await importPackageConfiguration(name).catch(() => {
        log.error(`Package "${name}" does not exist.`);
        process.exit(1);
    });

    if (packageConfiguration.uninstall) {
        await packageConfiguration.uninstall();
    }

    await fs.rm(path.join(config.storePath, name), {
        force: true,
        recursive: true
    });
    await storeState.delete(name);
}

export const install = async (name: PackageRef, indirect = false) => {
    log.info(`installing ${indirect ? 'dependency' : 'package'} ${name}...`)
    const isInstalled = await storeState.has(name);
    if (isInstalled) {
        log.info(`package ${name} is already installed`);
        if (!indirect) {
            const pkg = await storeState.get(name);
            pkg.installType = InstallType.Direct;
            await storeState.set(name, pkg);
        }
        return
    }

    const packageConfiguration = await importPackageConfiguration(name).catch(() => {
        log.error(`"${name}" does not exist.`)
        process.exit(1)
    });

    await Promise.all(
        packageConfiguration.dependencies.map(async dep => {
            await install(dep.name, true)
        })
    )

    await withTempDir(async tmpDir => {
        await nox.download(packageConfiguration.src, tmpDir);
        let distPath = path.join(tmpDir, packageConfiguration.output.dir);
        const storePath = path.resolve(config.storePath, packageConfiguration.standardName);

        await insideDir(tmpDir, async () => {
            if (packageConfiguration.install) {
                await packageConfiguration.install();
                const storeStat = await fs.stat(storePath).catch(() => null);
                if (storeStat) {
                    await fs.rm(storePath, {
                        force: true,
                        recursive: true
                    })
                }
            }
        });

        await fs.rename(distPath, path.resolve(config.storePath, packageConfiguration.standardName));
    });

    delete packageConfiguration.install;
    delete packageConfiguration.uninstall;
    await storeState.set(name, {
        ...packageConfiguration,
        installDate: new Date(),
        installType: indirect ? InstallType.Indirect : InstallType.Direct
    });
    log.info(`finished installing ${name}`);
}

// install('kotlin' as any);