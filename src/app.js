import express from "express";
import { matchRouter } from "./routes/matches.js";
import dotenv from "dotenv";
import http from "http";
import { attachWebSocketServer } from "./ws/websocket.js";
import { securityWare } from "./middleware.js";
import {commentaryRouter} from "./routes/commentary.js";

dotenv.config("./.env");

const PORT=Number(process.env.PORT)||4000;
const HOST=process.env.HOST||"0.0.0.0"

const app=express();
const server=http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(securityWare());
app.use("/matches",matchRouter);
app.use('/matches/:id/commentary', commentaryRouter);

app.get("/",(req,res)=>{
    res.send("HELLO THERE");
});


const {broadcastCreatedMatch,broadcastCommentary}=attachWebSocketServer(server);
app.locals.broadcastCreatedMatch=broadcastCreatedMatch;
app.locals.broadcastCommentary=broadcastCommentary;

server.listen(PORT,HOST,()=>{
    const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

    console.log(`Server is running on ${baseUrl}`);
    console.log(`WebSocket Server is running on ${baseUrl.replace('http', 'ws')}/ws`);
});

// app.listen(PORT,()=>{
//     console.log(`Server listening at http://localhost:8000`);
// })