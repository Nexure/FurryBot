import { Logger } from "../util/LoggerV8";
import config from "../config";
import phin from "phin";
import FurryBot from "../main";

export default (async (manager: FurryBot, shards: number[]) => {
	if (!shards || shards.length === 0) throw new TypeError("invalid shards provided");
	try {
		await phin<any>({
			method: "POST",
			url: "https://botblock.org/api/count",
			data: {
				server_count: shards.reduce((a, b) => a + b, 0),
				bot_id: config.bot.client.id,
				shard_count: shards.length,
				shards,
				...config.keys.botLists
			} as any,
			timeout: 1e4,
			parse: "json"
		});

		// botblock was blocked on top.gg
		const rq = await phin<any>({
			method: "POST",
			url: `https://top.gg/api/bots/${config.bot.client.id}/stats`,
			data: {
				shards
			} as any,
			headers: {
				"Content-Type": "application/json",
				"Authorization": config.keys.botLists["top.gg"]
			},
			timeout: 1e4,
			parse: "json"
		})
			.then(req => {
				try {
					return JSON.parse(req.body.toString());
				} catch (e) {
					manager.log("error", req.body, "Bot List Stats");
				}
			});
		manager.log("log", `Posted guild counts: ${shards.reduce((a, b) => a + b, 0)}`, "Bot List Stats");
	} catch (e) {
		manager.log("error", e, "Bot List Stats");
	}
	return {
		count: shards.reduce((a, b) => a + b, 0)
	};
});
