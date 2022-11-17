import { resolve } from "path"

export default {
    storePath: resolve(__dirname, './store'),
    stateFile: resolve(__dirname, './store/state.json'),
    pathsFile: resolve(__dirname, './store/paths.sh'),
    packagesTypesFile: resolve(__dirname, './Packages.ts'),
} as const