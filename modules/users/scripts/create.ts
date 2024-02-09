import { Context } from "@ogs/runtime";
import { User } from "../schema/common.ts";

export interface Request {
    username: string;
}

export interface Response {
    user: User;
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
    const query = await ctx.postgres.run(conn => conn.queryObject<User>`INSERT INTO users (username) VALUES (${req.username}) RETURNING *`)

    return {
        user: query.rows[0]
    };
}

