import SSHConfig from '@fabio286/ssh2-promise/lib/sshConfig';
import SSHConnection from '@fabio286/ssh2-promise/lib/sshConnection';
import { Client } from 'ssh2';


// const connectedClients: Client[] = [];
// const closedClients: Client[] = []
// // Override the connect method to keep track of connected clients
// const originalConnect = Client.prototype.connect;
// const originalEnd= Client.prototype.end;

// Client.prototype.connect = function (config: any) {
//   const conn = originalConnect.call(this, config);

//   return conn;
// };

// Client.prototype.end = function (){
//     this.destroy();

//     const conn = originalEnd.call(this);
//     // closedClients.push(conn);

//     this.removeAllListeners();

//     (this as any)._sock.end();
//     (this as any)._sock.destroy();


//     return conn
// }
// const originalClose = SSHConnection.prototype.close
// SSHConnection.prototype.close = async function(){
//     originalClose.call(this);
//     this.removeAllListeners();
//     console.log('connection closed')
// }

// setInterval(()=>{
//   if(global.gc) global.gc()
// }, 20000)