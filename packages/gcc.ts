import { nox, PackageConfiguration, StringSemanticVersion } from "../nox";

const version: StringSemanticVersion = '12.2.0';
const sourceDir = `gcc-${version}`;

export default class GCCPackageConfiguration implements PackageConfiguration<'gcc'> {
    standardName = 'gcc' as const
    provides = ['gcc']
    prettyName = 'GNU Compiler Collection'

    version = nox.version(version)
    src = `https://gfortran.meteodat.ch/download/x86_64/releases/${sourceDir}.tar.xz`
    dependencies = []
    output = {
        dir: sourceDir,
        binDirRelativeToOutputDir: 'bin',
        libDirRelativeToOutputDir: ['lib64'],
        includeDirRelativeToOutputDir: 'include',
    }   

    async install() {
        await nox.utils.extract(`${sourceDir}.tar.xz`, '.');
    }
};