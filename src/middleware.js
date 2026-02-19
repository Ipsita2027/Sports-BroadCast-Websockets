import { httpArcjetRules } from "./arcjet.js"

export const securityWare=()=>{
    return async (req,res,next)=>{
        if (!httpArcjetRules){
            return next();
        }
        try{
            const decision=await httpArcjetRules.protect(req);
            if (decision.isDenied()){
                if (decision.reason.isRateLimit()){
                    return res.status(429).json({error:"Too many requests."})
                }
                return res.status(403).json({error:"Forbidden"});
            }
            next();
        }
        catch(e){
            console.error(`Arcjet Middleware Error`);
            return res.status(503).json({
                message:"Service Unavailable"
            });
        }
    }
}