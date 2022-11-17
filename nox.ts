import * as cp from 'child_process';
import { promisify } from 'util';
import type Packages from './Packages';
import * as StreamZip from 'node-stream-zip';
import FileDownloader from 'nodejs-file-downloader';
import log from './log';
import * as cliProgress from 'cli-progress'
import chalk from 'chalk';
import path from 'path';

export type PackageName = Packages;
export type PackageRef = PackageName
export type PathLike = string;
export type SemanticVersion = {
    major: number;
    minor: number;
    patch: number;
};

export enum ComparisonResult {
    Greater = 'Greater',
    Lesser = 'Lesser',
    Equal = 'Equal'
}

export const SemanticVersion = {
    from(major: number, minor: number = 0, patch: number = 0): SemanticVersion {
        return {
            major,
            minor,
            patch
        }
    },
    compare(left: SemanticVersion, right: SemanticVersion): ComparisonResult {
        if (left.major > right.major) {
            return ComparisonResult.Greater;
        } else if (left.major < right.major) {
            return ComparisonResult.Lesser;
        }

        if (left.minor > right.minor) {
            return ComparisonResult.Greater;
        } else if (left.minor < right.minor) {
            return ComparisonResult.Lesser;
        }

        if (left.patch > right.patch) {
            return ComparisonResult.Greater;
        } else if (left.patch < right.patch) {
            return ComparisonResult.Lesser;
        }

        return ComparisonResult.Equal;
    }
}

export enum DependencyType {
    Build = 'Build',
    Runtime = 'Runtime',
    Optional = 'Optional'
}
export type PackageDependency = {
    name: PackageRef;
    minVersionInclusive?: SemanticVersion;
    maxVersionExclusive?: SemanticVersion;
    type: DependencyType
}

export type StringSemanticVersion =
    | `${number}`
    | `${number}.${number}`
    | `${number}.${number}.${number}`;

export const StringSemanticVersion = {
    parse(version: StringSemanticVersion): SemanticVersion {
        const [major, minor, patch] = version.split('.').map(it => +it);
        return {
            major,
            minor: minor || 0,
            patch: patch || 0
        }
    }
}

export type SemanticVersionMatcher =
    | `*`
    | `^${StringSemanticVersion}`
    | `~${StringSemanticVersion}`
    | `${StringSemanticVersion}`

export const PackageDependency = {
    of(name: PackageRef, type: DependencyType, version: SemanticVersionMatcher): PackageDependency {
        if (version === '*') {
            return {
                name,
                type
            }
        }

        let versionIdx = 0;
        if (version.startsWith('^') || version.startsWith('~')) {
            versionIdx = 1;
        }

        const parsedVersion = StringSemanticVersion.parse(
            version.substring(versionIdx) as StringSemanticVersion
        );

        return {
            name,
            type,
            minVersionInclusive: parsedVersion,
            maxVersionExclusive: version.startsWith('^') ? {
                major: parsedVersion.major + 1,
                minor: 0,
                patch: 0
            } : version.startsWith('~') ? {
                ...parsedVersion,
                minor: parsedVersion.minor + 1,
                patch: 0
            } : parsedVersion
        }
    }
}

export type Configuration = {
    packages: PackageRef[];
    // overrides: {
    //     package: Record<PackageName, Partial<PackageConfiguration<any>>>;
    // };
    users: Record<string, Partial<UserConfiguration>>;
};

export type UserConfiguration = {
    packages: PackageRef[];
    overrides: {
        package: Record<PackageName, Partial<PackageConfiguration<any>>>;
    };
    home: PathLike;
    defaultShell: string;
};

export type PackageInstallationPaths = {
    path: PathLike;
    binPath: PathLike;
    libPath: PathLike;
}

export type PackageConfiguration<T> = {
    standardName: T;
    provides: string | string[];
    prettyName: string;
    version: SemanticVersion;
    dependencies: PackageDependency[];
    src: string;
    output: {
        dir: PathLike,
        binDirRelativeToOutputDir: PathLike | PathLike[],
        libDirRelativeToOutputDir?: PathLike | PathLike[],
        includeDirRelativeToOutputDir?: PathLike | PathLike[],
    },
    install?: () => void | Promise<void>;
    uninstall?: () => void | Promise<void>;
}

export enum InstallType {
    Direct = 'Direct',
    Indirect = 'Indirect'
}

export type PackageInstallInfo<T> = Omit<PackageConfiguration<T>, 'install' | 'uninstall'> & {
    installDate: Date | string;
    installType: InstallType;
};

// const makePromise = <T>() => {
//     let resolve: (value: T) => void;
//     let reject: (err?: any) => void;
//     const p = new Promise((res, rej) => {
//         resolve = res;
//         reject = rej;
//     });

//     return {
//         resolve,
//         reject,
//         promise: p
//     }
// }

export const nox = {
    sh: async (cmd: TemplateStringsArray, ...args: any[]) => {
        let out = cmd[0];
        for (let i = 1; i < cmd.length; i++) {
            out += `"${args[i - 1]}"` + cmd[i]
        }

        const execAsync = promisify(cp.exec);
        log.info(`sh :: ${out}`)
        return await execAsync(`source "${path.join(__dirname, './store/paths.sh')}" && ${out}`);
    },
    download: async (url: string, location: string = '.'): Promise<string> => {
        log.info(`download :: ${url}`)

        const progress = new cliProgress.SingleBar({
            fps: 10,
            etaAsynchronousUpdate: true,
            hideCursor: true,
            format: 'Progress |' + chalk.whiteBright('{bar}') + '| {percentage}% || Remaining: {remainingSize}KB / {totalSize}KB',
        }, cliProgress.Presets.shades_classic);

        let initialSize = 0;
        const downloader = new FileDownloader({
            url,
            directory: location,
            maxAttempts: 3,
            onProgress(percentage, chunk, remainingSize) {
                if (initialSize === 0) {
                    initialSize = Math.floor(remainingSize / 1024)
                };

                progress.update(+percentage, {
                    chunk: chunk,
                    remainingSize: initialSize - Math.floor(remainingSize / 1024),
                    totalSize: initialSize,
                })
            },
        });


        progress.start(100, 0);
        const { filePath, downloadStatus } = await downloader.download();
        progress.update(100);
        progress.stop();
        if (downloadStatus === 'COMPLETE') {
            return filePath as string;
        } else {
            log.error(`failed to download ${url}`)
        }
    },
    version: StringSemanticVersion.parse,
    deps: {
        build(dependency: `${PackageRef}@${SemanticVersionMatcher}`): PackageDependency {
            const [name, version]: [PackageRef, SemanticVersionMatcher] = dependency.split('@') as any;
            return PackageDependency.of(name, DependencyType.Build, version);
        },
        runtime(dependency: `${PackageRef}@${SemanticVersionMatcher}`): PackageDependency {
            const [name, version]: [PackageRef, SemanticVersionMatcher] = dependency.split('@') as any;
            return PackageDependency.of(name, DependencyType.Runtime, version);
        },
        optional(dependency: `${PackageRef}@${SemanticVersionMatcher}`): PackageDependency {
            const [name, version]: [PackageRef, SemanticVersionMatcher] = dependency.split('@') as any;
            return PackageDependency.of(name, DependencyType.Optional, version);
        }
    },
    utils: {
        async extract(file: PathLike, outPath: PathLike) {
            log.info(`extract :: '${file}' to '${outPath}'`)
            switch (true) {
                case file.endsWith('.zip'): {
                    const zip = new StreamZip.async({ file })
                    await zip.extract(null, outPath);
                    await zip.close()
                    return
                }
                case file.endsWith('.tar.gz') || file.endsWith('.tgz'): {
                    await nox.sh`tar -xzf ${file}`
                    return
                }
                case file.endsWith('.tar.xz') || file.endsWith('.txz'): {
                    await nox.sh`tar -xf ${file}`
                    return
                }
                default: {
                    log.error(`unsupported archive type`);
                    process.exit(1);
                }
            }
        },
    }
} as const;