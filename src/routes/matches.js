import {Router} from "express";
import {listMatchesQuerySchema,createMatchSchema} from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import {getMatchStatus} from "../utils/match-status.js"
import {desc} from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT=100;

//GET /matches
matchRouter.get("/",async (req,res)=>{
    const parsed=listMatchesQuerySchema.safeParse(req.query);

    if(!parsed.success){
        return res.status(400).json({
            message:"Invalid Query",
            details:parsed.error.issues
        });
    }

    //if query structure is valid, then go fetch the matches
    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    //fetch logic for matches from the database, list of match objects-

    try {
        const data = await db
            .select()
            .from(matches)
            .orderBy((desc(matches.createdAt)))
            .limit(limit)

        // if(res.app.locals.broadcastCreatedMatch) {
        //     console.log("Tried it!!")
        //     res.app.locals.broadcastCreatedMatch(data);
        // }

        return res.status(200).json({ data });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to list matches.',details:e.message});
    }

});


//POST /matches

matchRouter.post("/",async (req,res)=>{
    console.log(req.body);
    const parsed=createMatchSchema.safeParse(req.body);

    if(!parsed.success){
        return res.status(400).json({
            message:"Invalid match properties",
            details:parsed.error.issues
        });
    }

    const { data: { startTime, endTime, homeScore, awayScore } } = parsed;

    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime),
        }).returning();

        if(res.app.locals.broadcastCreatedMatch) {
            console.log("Tried it!!")
            res.app.locals.broadcastCreatedMatch(event);
        }

        res.status(201).json({ data: event });


    } catch (e) {
        res.status(500).json({ error: 'Failed to create match.', details: e.message });

    }

    // try{
    //     return res.send(200);
    // }
});