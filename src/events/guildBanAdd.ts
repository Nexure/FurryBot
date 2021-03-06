import ClientEvent from "../util/ClientEvent";
import FurryBot from "../main";
import * as Eris from "eris";
import { db } from "../modules/Database";
import { Colors } from "../util/Constants";
import { Utility } from "../util/Functions";

export default new ClientEvent("guildBanAdd", (async function (this: FurryBot, guild: Eris.Guild, user: Eris.User) {
	this.track("events", "guildBanAdd");
	const g = await db.getGuild(guild.id);
	const e = g.logEvents.memberBan;
	if (!e.enabled || !e.channel) return;
	const ch = guild.channels.get<Eris.GuildTextableChannel>(e.channel);

	const embed: Eris.EmbedOptions = {
		title: "Member Banned",
		author: {
			name: guild.name,
			icon_url: guild.iconURL
		},
		description: [
			`Member ${user.username}#${user.discriminator} (<@!${user.id}>) was banned.`
		].join("\n"),
		timestamp: new Date().toISOString(),
		color: Colors.red
	};

	const log = await Utility.fetchAuditLogEntries(this, guild, Eris.Constants.AuditLogActions.MEMBER_BAN_ADD, user.id);
	if (log.success === false) {
		embed.description += `\n${log.error.text} (${log.error.code})`;
	} else if (log.success) {
		embed.description += `\nBlame: ${log.blame.username}#${log.blame.discriminator}\nReason: ${log.reason || "None Provided."}`;
	}

	await ch.createMessage({ embed }).catch(err => null);

	/*if (g.settings.modlog && guild.channels.has(g.settings.modlog)) {
		const ml = guild.channels.get<Eris.GuildTextableChannel>(g.settings.modlog);
		const ms = ml.messages.get(ml.lastMessageID);
		if (ms && ms.embeds.length > 0 && ms.embeds.find(e => e.description.indexOf(user.id) !== -1)) return console.log("a");
		await this.m.get(g.settings.modlog).create({
			target: user.id,
			blame: blame ? blame.id : null,
			reason,
			color: Colors.red,
			time: 0,
			actionName: "Member Banned",
			extra: "",
			timestamp: Date.now()
		});
	}*/
}));
