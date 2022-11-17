import { nox, PackageConfiguration, StringSemanticVersion } from "../nox";

const version: StringSemanticVersion = '1.2.13';
const sourceDir = `zlib-${version}`;

export default class ZLibPackageConfiguration implements PackageConfiguration<'zlib'> {
    standardName = 'zlib' as const
    provides = ['zlib']
    prettyName = 'zlib'

    version = nox.version(version)
    src = `https://zlib.net/${sourceDir}.tar.gz`
    dependencies = [
        nox.deps.build('gcc@*'),
        nox.deps.build('cmake@*')
    ]
    output = {
        dir: sourceDir,
        binDirRelativeToOutputDir: 'bin',
        libDirRelativeToOutputDir: 'lib',
    }

    // Returns output directory
    async install() {
        await nox.utils.extract(`${sourceDir}.tar.gz`, '.');
        const output = await nox.sh`which gcc`
        console.log(output)
        process.env['CC']='gcc'
        await nox.sh`cd ${sourceDir} && ./configure && make && mkdir zlib && mv libz.so* ./zlib`
    }
};