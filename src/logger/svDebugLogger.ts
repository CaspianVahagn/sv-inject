// Simple logger implementation
class SVDebugLogger {
  private _enabled = false;

  enable(){
    this._enabled = true;
  }

  getTime(){
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');

    return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
  }

  log(...args: any[]) {
    if(!this._enabled){
      return;
    }
    console.log(`[LOG   ${this.getTime()}] `.padEnd(30," "), ...args);
  }

  err(...args: any[]) {
    console.error(`[ERR   ${this.getTime()}] `.padEnd(30," "), ...args);
  }

  info(...args: any[]) {
    if(!this._enabled){
      return;
    }
    console.info(`[INFO  ${this.getTime()}] `.padEnd(30," "), ...args);
  }

  debug(...args: any[]) {
    if(!this._enabled){
      return;
    }
    console.debug(`[DEBUG ${this.getTime()}] `.padEnd(30," "), ...args);
  }
}

export default new SVDebugLogger();