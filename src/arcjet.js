import arcjet,{detectBot,shield,slidingWindow} from "@arcjet/node";
import "dotenv/config";

const arcjetMode=process.env.ARCJET_MODE??"DRY_RUN";

export const httpArcjetRules=process.env.ARCJET_KEY?
arcjet({
    key:process.env.ARCJET_KEY,
    rules:[
        shield({mode:arcjetMode}),
        detectBot({mode:arcjetMode,allow:["CATEGORY:SEARCH_ENGINE","CATEGORY:PREVIEW"]}),
        slidingWindow({mode:arcjetMode,interval:"5s",max:8})
    ]
})
:null;

export const socketArcjetRules=process.env.ARCJET_KEY?
arcjet({
    key:process.env.ARCJET_KEY,
    rules:[
        shield({mode:arcjetMode}),
        detectBot({mode:arcjetMode,allow:["CATEGORY:SEARCH_ENGINE","CATEGORY:PREVIEW"]}),
        slidingWindow({mode:arcjetMode,interval:"5s",max:5})
    ]  
})
:null;

