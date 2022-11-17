import chalk from "chalk";

class Logger {
    info(msg: string) {
        this.log('info', msg);
    }
    error(msg: string) {
        this.log('error', msg);
    }
    warn(msg: string) {
        this.log('warn', msg);
    }
    debug(msg: string) {
        this.log('debug', msg);
    }

    private log(level: 'info' | 'error' | 'warn' | 'debug', msg: string) {
        let levelText = '';
        switch(level) {
            case 'info': {
                levelText = ''
                break;
            }
            case 'error': {
                levelText = chalk.red('error')
                break;
            }
            case 'warn': {
                levelText = chalk.yellow('warn')
                break;
            }
            case 'debug': {
                levelText = chalk.green('debug')
                break;
            }
        }

        console.log(chalk.magenta('nox') + (levelText ? `:${levelText}` : ''), '::', chalk.cyan(msg))
    }
}

const log = new Logger();
export default log;