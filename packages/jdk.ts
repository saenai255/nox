import { nox, PackageConfiguration, StringSemanticVersion } from "../nox";

const version: StringSemanticVersion = '17.0.5';
const sourceDir = `OpenJDK17U-jdk_x64_linux_hotspot_${version}`;

export default class JDKPackageConfiguration implements PackageConfiguration<'jdk'> {
    standardName = 'jdk' as const
    provides = ['java', 'jdk']
    prettyName = 'Java 17 Development Kit'

    version = nox.version(version)
    src = `https://github.com/adoptium/temurin17-binaries/releases/download/jdk-${version}%2B8/${sourceDir}_8.tar.gz`
    dependencies = [
        nox.deps.runtime('zlib@*')
    ]
    output = {
        dir: `jdk-${version}+8`,
        binDirRelativeToOutputDir: 'bin',
        libDirRelativeToOutputDir: 'lib',
        includeDirRelativeToOutputDir: 'include',
    }

    async install() {
        await nox.utils.extract(`${sourceDir}_8.tar.gz`, '.');
        await nox.sh`chmod +x ./jdk-${version}+8/bin/*`
    }
};