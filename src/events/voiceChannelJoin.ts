import ClientEvent from "../util/ClientEvent";
import FurryBot from "../main";
import * as Eris from "eris";
import { db } from "../modules/Database";
import { Colors } from "../util/Constants";

export default new ClientEvent("voiceChannelJoin", (async function (this: FurryBot, member: Eris.Member, newChannel: Eris.VoiceChannel) {
	this.track("events", "voiceChannelJoin");
	const g = await db.getGuild(member.guild.id);
	const e = g.logEvents.voiceJoin;
	if (!e.enabled || !e.channel) return;
	const ch = member.guild.channels.get<Eris.GuildTextableChannel>(e.channel);

	const embed: Eris.EmbedOptions = {
		title: "Member Joined Voice Channel",
		author: {
			name: `${member.username}#${member.discriminator}`,
			icon_url: member.avatarURL
		},
		description: `Member ${member.username}#${member.discriminator} joined the voice channel **${newChannel.name}**`,
		timestamp: new Date().toISOString(),
		color: Colors.green
	};

	return ch.createMessage({ embed }).catch(err => null);
}));
