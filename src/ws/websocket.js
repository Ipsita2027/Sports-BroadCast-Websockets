import {WebSocket,WebSocketServer} from "ws";
import {socketArcjetRules} from "../arcjet.js";


const matchSubscribers=new Map();

function subscribe(matchid,socket){
    if(!matchSubscribers.has(matchid)){
        matchSubscribers.set(matchid,new Set());
    }

    const subscribers=matchSubscribers.get(matchid);
    subscribers.add(socket);

    socket.subscriptions.add(matchid);
    
}

function unsubscribe(matchid,socket){
    if(!matchSubscribers.has(matchid)){
        return;
    }

    const subscribers=matchSubscribers.get(matchid);

    if(!socket.subscribers.has(matchid)){
        return;
    }

    socket.subscriptions.delete(matchid);

    subscribers.delete(socket);

    if(!subscribers||subscribers.size===0){
        matchSubscribers.delete(matchid);
    }

    return;
}

function handleMessage(socket,payload){
    let message;
    try{
        message=JSON.parse(payload.toString());
    }
    catch(e){
        welcomeUpgrade(socket,{type:"error",message:"Invalid JSON"});
        return;
    }
    const type=message.type;
    if(type==="subscribe"){
        subscribe(message.matchid,socket);
        welcomeUpgrade(socket,{type:"subscribed",matchid:message.mathid});
        return;
    }
    if(type==="unsubscribe"){
        unsubscribe(message.matchid,socket);
        welcomeUpgrade(socket,{type:"unsubscribed",matchid:message.matchid});
        return;
    }
   
}

function welcomeUpgrade(socket,payload){
    if(socket.readyState!==WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

function broadcast(wss,payload){
    for(const client of wss.clients){
        if (client.readyState!==WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}

function broadcastSubscribers(matchid,payload){
    const subscribers=matchSubscribers.get(matchid);

    if(!subscribers||subscribers.size===0){
        return;
    }

    const message=JSON.stringify(payload);

    for(const client of subscribers){
        if(client.readyState===WebSocket.OPEN){
            client.send(message);
        }
    }


}


function cleanUpSubscriptions(socket){
    for(const mathcid of socket.subscriptions){
        unsubscribe(matchid,socket);
    }
}


export const attachWebSocketServer=(server)=>{
        const wss=new WebSocketServer({
        noServer:true,
        path:"/ws",
        maxPayload:10*1024*1024
        });

    server.on('upgrade', async (req, socket, head) => {
        const { pathname } = new URL(req.url, `http://${req.headers.host}`);

        if (pathname !== '/ws') {
            return;
        }

        if (socketArcjetRules) {
            try {
                const decision = await socketArcjetRules.protect(req);

                if (decision.isDenied()) {
                    if (decision.reason.isRateLimit()) {
                        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
                    } else {
                        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                    }
                    socket.destroy();
                    return;
                }
            } catch (e) {
                console.error('WS upgrade protection error', e);
                socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });


    wss.on("connection",async (socket,req)=>{
        socket.isAlive=true;
        socket.subscriptions=new Set();
        welcomeUpgrade(socket,{type:"welcome"});

        socket.on("pong",()=>{socket.isAlive=true;});
        socket.on("message",(data)=>{
            handleMessage(socket,data);
        })
        socket.on("error",()=>{socket.terminate();});
        socket.on("close",()=>{cleanUpSubscriptions(socket);});
        socket.on("error",(e)=>{console.error(`${e}`)});
    });


    const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive){
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    })}, 30000);

    wss.on('close', () => clearInterval(interval));


    function broadcastCreatedMatch(match){
        broadcast(wss,{type:"match_created",data:match});
    };

    function broadcastCommentary(matchid,comment){
        broadcastSubscribers(matchid,{type:"commentary",data:comment});
    }

    return {broadcastCreatedMatch,broadcastCommentary};

}
