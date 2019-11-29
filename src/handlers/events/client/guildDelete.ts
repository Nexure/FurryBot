import { ClientEvent } from "bot-stuff";
import { Logger } from "clustersv2";
import FurryBot from "@FurryBot";
import * as Eris from "eris";
import config from "../../../config";

export default new ClientEvent<FurryBot>("guildDelete", (async function (this: FurryBot, guild: Eris.Guild) {
	const st = await this.cluster.getManagerStats();
	const gc = st.clusters.length === 1 ? this.bot.guilds.size : await this.cluster.getManagerStats().then(c => c.guildCount);
	await this.f.incrementDailyCounter(true, gc);

	await this.a.track("guildDelete", {
		clusterId: this.cluster.id,
		shardId: guild.shard.id,
		guildId: guild.id,
		guildOwner: guild.ownerID,
		total: gc,
		members: {
			total: guild.memberCount,
			online: guild.members.filter(m => m.status === "online").length,
			idle: guild.members.filter(m => m.status === "idle").length,
			dnd: guild.members.filter(m => m.status === "dnd").length,
			offline: guild.members.filter(m => m.status === "offline").length,
			bots: guild.members.filter(m => m.bot).length
		},
		timestamp: Date.now()
	});

	let author = {
		name: "Unknown#0000",
		icon_url: "https://i.furcdn.net/noicon.png"
	};
	let owner = "Unknown#0000 (000000000000000000)";
	if (guild.ownerID) {
		const u: Eris.User = await this.bot.getRESTUser(guild.ownerID).catch(err => null);
		if (u !== null) {
			author = {
				name: `${u.username}#${u.discriminator}`,
				icon_url: u.avatarURL ? u.avatarURL : "https://i.furcdn.net/noicon.png"
			};
			owner = `${u.username}#${u.discriminator} (${u.id})`;
		}
	}


	Logger.info(`Cluster #${this.cluster.id} | Shard #${guild.shard.id} | Client`, `Left guild ${guild.name} (${guild.id}), owner: ${owner}, this guild had ${guild.memberCount} members!`);
	const embed: Eris.EmbedOptions = {
		title: "Guild Left!",
		description: [
			`Guild #${gc + 1}`,
			`Current Total: ${gc}`,
			"",
			"**Guild Info**:",
			`${"\u25FD"} Name: ${guild.name}`,
			`${"\u25FD"} **Members**:`,
			`\t<:${config.emojis.online}>: ${guild.members.filter(m => m.status === "online").length}`,
			`\t<:${config.emojis.idle}>: ${guild.members.filter(m => m.status === "idle").length}`,
			`\t<:${config.emojis.dnd}>: ${guild.members.filter(m => m.status === "dnd").length}`,
			`\t<:${config.emojis.offline}>: ${guild.members.filter(m => m.status === "offline").length}`,
			`\t<:${config.emojis.bot}>: ${guild.members.filter(m => m.user.bot).length}`,
			`\t<:${config.emojis.human}>: ${guild.members.filter(m => !m.user.bot).length}`,
			`${"\u25FD"} Large: ${guild.large ? "Yes" : "No"} (${guild.memberCount})`,
			`${"\u25FD"} Owner: ${owner}`
		].join("\n"),
		author,
		image: {
			url: ![undefined, null, ""].includes(guild.iconURL) ? guild.iconURL : "https://i.furcdn.net/noicon.png"
		},
		thumbnail: {
			url: "https://i.furcdn.net/noicon.png"
		},
		timestamp: new Date().toISOString(),
		color: this.f.randomColor(),
		footer: {
			text: `Shard ${guild.shard.id + 1}/${st.shards.length} | Cluster ${this.clusterId + 1}/${st.clusters.length}`,
			icon_url: "https://i.furry.bot/furry.png"
		}
	};

	if (embed.author.icon_url) embed.thumbnail.url = embed.author.icon_url;

	return this.bot.executeWebhook(config.webhooks.guilds.id, config.webhooks.guilds.token, {
		embeds: [
			embed
		],
		username: `Furry Bot Guild Stats${config.beta ? " - Beta" : ""}`,
		avatarURL: "https://i.furry.bot/furry.png"
	});
}));
