import { argv } from "process";
import { install, uninstall } from "./install";
import log from "./log";
import { Configuration, InstallType } from "./nox";
import storeState from "./store-state";
import fs from 'fs/promises'
import path from "path";
import config from "./config";

const syncConfiguration = async (path: string) => {
    const config: Configuration = require(path).default;
    const currentPackages = Object.values(config.users)[0].packages;
    const installedPackages = await storeState.keys();

    const transaction: (() => Promise<void>)[] = [];
    for (const installedPackage of installedPackages) {
        if (!currentPackages.includes(installedPackage as any) && (await storeState.get(installedPackage)).installType === InstallType.Direct) {
            transaction.push(() => uninstall(installedPackage as any));
        }
    }
    for (const currentPackage of currentPackages) {
        transaction.push(() => install(currentPackage))
    }

    await Promise.all(transaction.map(it => it()))
}

const typeRegen = async () => {
    const dirs = await fs.readdir(path.join(__dirname, 'packages'), {
        withFileTypes: true
    }).then(it => it.filter(dirent => dirent.isFile()).map(dirent => dirent.name.split('.')[0]));

    await fs.writeFile(config.packagesTypesFile, `
type Packages =
${dirs.map(it => `    | '${it}'`).join('\n')}
    ;

export default Packages;
    `.trim())
}

const main = async () => {
    if (argv.length < 3) {
        log.error('missing command')
        process.exit(1);
    }

    const command = argv[2];
    switch (command) {
        case 'sync': {
            if (argv.length < 4) {
                log.error('missing nox configuration path');
                process.exit(1)
            }

            await syncConfiguration(argv[3])
            return
        }
        case 'typegen': {
            await typeRegen()
            return
        }
        default: {
            log.error('invalid command')
        }
    }
}

main();