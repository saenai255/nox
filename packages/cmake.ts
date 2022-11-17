import { nox, PackageConfiguration, StringSemanticVersion } from "../nox";

const version: StringSemanticVersion = '3.25.0';
const sourceDir = `cmake-${version}-linux-x86_64`;

export default class CMakePackageConfiguration implements PackageConfiguration<'cmake'> {
    standardName = 'cmake' as const
    provides = ['cmake']
    prettyName = 'CMake'

    version = nox.version(version)
    src = `https://github.com/Kitware/CMake/releases/download/v${version}/${sourceDir}.tar.gz`
    dependencies = []
    output = {
        dir: sourceDir,
        binDirRelativeToOutputDir: 'bin',
    }

    async install() {
        await nox.utils.extract(`${sourceDir}.tar.gz`, '.');
    }
};