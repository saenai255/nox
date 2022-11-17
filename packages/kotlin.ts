import { nox, PackageConfiguration, StringSemanticVersion } from "../nox";

const version: StringSemanticVersion = '1.7.21';
const sourceDir = `kotlin-compiler-${version}`;

export default class KotlinPackageConfiguration implements PackageConfiguration<'kotlin'> {
    standardName = 'kotlin' as const
    provides = ['kotlin']
    prettyName = 'Kotlin Language'

    version = nox.version(version)
    src = `https://github.com/JetBrains/kotlin/releases/download/v${version}/${sourceDir}.zip`
    dependencies = [
        nox.deps.runtime('jdk@*')
    ]
    output = {
        dir: `kotlinc`,
        binDirRelativeToOutputDir: 'bin',
        libDirRelativeToOutputDir: 'lib',
    }

    // Returns output directory
    async install() {
        await nox.utils.extract(`${sourceDir}.zip`, '.');
        await nox.sh`chmod +x ./kotlinc/bin/*`
    }
};