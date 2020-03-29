import ClientEvent from "../util/ClientEvent";
import FurryBot from "../main";
import Eris, { GuildChannel } from "eris";
import ExtendedMessage from "../modules/ExtendedMessage";
import Timers from "../util/Timers";
import config from "../config";
import db, { mdb } from "../modules/Database";
import { Time, Internal, Strings, Request } from "../util/Functions";
import { Blacklist } from "../util/@types/Misc";
import Logger from "../util/LoggerV8";
import EmbedBuilder from "../util/EmbedBuilder";
import * as fs from "fs-extra";
import { Colors } from "../util/Constants";
import * as uuid from "uuid";
import GuildConfig from "../modules/config/GuildConfig";
import UserConfig from "../modules/config/UserConfig";
import phin from "phin";

export default new ClientEvent("messageCreate", (async function (this: FurryBot, message: Eris.Message<Eris.GuildTextableChannel>) {
	let
		msg: ExtendedMessage<Eris.GuildTextableChannel>,
		gConfig: GuildConfig,
		uConfig: UserConfig;
	try {
		const t = new Timers(config.beta);
		t.start("main");

		if (!message || !message.author || message.author.bot || (config.beta && !config.betaAccess.includes(message.author.id))) return;

		t.start("messageProcess");
		msg = new ExtendedMessage(message, this);
		t.end("messageProcess");

		t.start("leveling");
		// @FIXME leveling
		t.end("leveling");

		t.start("blacklist");
		const gbl: Blacklist.GuildEntry[] = [Eris.Constants.ChannelTypes.GUILD_TEXT, Eris.Constants.ChannelTypes.GUILD_NEWS].includes(msg.channel.type) ? await mdb.collection("blacklist").find({ guildId: msg.channel.guild.id }).toArray().then(res => res.filter(r => [0, null].includes(r.expire) || r.expire > Date.now())) : [];
		const ubl: Blacklist.UserEntry[] = await mdb.collection("blacklist").find({ userId: msg.author.id }).toArray().then(res => res.filter(r => [0, null].includes(r.expire) || r.expire > Date.now()));
		const bl = gbl.length > 0 || ubl.length > 0;

		if (msg.member.roles.includes(config.blacklistRoleId) && !bl) await msg.member.removeRole(config.blacklistRoleId, "user is not blacklisted (might have expired)").catch(err => null);

		if (bl && !config.developers.includes(msg.author.id)) {
			if (msg.channel.guild && msg.channel.guild.id === config.bot.mainGuild) {
				if (!msg.member.roles.includes(config.blacklistRoleId)) await msg.member.addRole(config.blacklistRoleId, "user is blacklisted").catch(err => null);
			}

			if (msg.cmd && msg.cmd.cmd) {
				if (ubl.length > 0) {
					const n = ubl.filter(u => !u.noticeShown);
					if (n.length > 0) {

						await mdb.collection("blacklist").findOneAndUpdate({ id: n[0].id }, { $set: { noticeShown: true } });
						const expiry = [0, null].includes(n[0].expire) ? "Never" : Time.formatDateWithPadding(new Date(n[0].expire));
						return msg.reply(`you were blacklisted on ${Time.formatDateWithPadding(n[0].created)}. Reason: ${n[0].reason}, blame: ${n[0].blame}. Expiry: ${expiry}. You can ask about your blacklist in our support server: <${config.bot.supportURL}>`).catch(err => null);
					} else return;
				}

				if ([Eris.Constants.ChannelTypes.GUILD_TEXT, Eris.Constants.ChannelTypes.GUILD_NEWS].includes(msg.channel.type) && gbl.length > 0) {
					const n = ubl.filter(u => !u.noticeShown);
					if (n.length > 0) {
						await mdb.collection("blacklist").findOneAndUpdate({ id: n[0].id }, { $set: { noticeShown: true } });
						const expiry = [0, null].includes(n[0].expire) ? "Never" : Time.formatDateWithPadding(new Date(n[0].expire));
						return msg.reply(`this server was blacklisted on ${Time.formatDateWithPadding(n[0].created)}. Reason: ${n[0].reason}. Blame: ${n[0].blame}. Expiry: ${expiry}. You can ask about your blacklist in our support server: <${config.bot.supportURL}>`).catch(err => null);
					} else return;
				}
			}

			return;
		}
		t.end("blacklist");

		t.start("dm");
		// needed due to everything else being GuildTextableChannel
		if ((message.channel as unknown as Eris.PrivateChannel).type === Eris.Constants.ChannelTypes.DM) {
			if (bl) return;

			if (/discord\.gg/gi.test(msg.content.toLowerCase())) {
				// being more constructive instead of outright banning
				// const g = await this.getRESTGuild(config.bot.mainGuild);
				// await g.banMember(message.author.id, 0, "Advertising in bots dms.");

				await this.executeWebhook(config.webhooks.directMessage.id, config.webhooks.directMessage.token, {
					embeds: [{
						title: `DM Invite from ${msg.author.username}#${msg.author.discriminator} (${msg.author.id})`,
						fields: [{
							name: "Content",
							value: msg.content,
							inline: false
						}],
						timestamp: new Date().toISOString()
					}],
					username: `Direct Messages${config.beta ? " - Beta" : ""}`,
					avatarURL: "https://i.furry.bot/furry.png"
				});

				await msg.author.getDMChannel().then(dm => dm.createMessage(config.bot.directMessage.invite)).catch(err => null);
				return Logger.log("Direct Message", `DM Advertisment recieved from ${msg.author.username}#${msg.author.discriminator}: ${msg.content}`);
			} else {
				await this.w.get("directMessage").execute({
					embeds: [{
						title: `Direct Message from ${msg.author.username}#${msg.author.discriminator} (${msg.author.id})`,
						fields: [{
							name: "Content",
							value: msg.content,
							inline: false
						}],
						timestamp: new Date().toISOString()
					}],
					username: `Direct Messages${config.beta ? " - Beta" : ""}`,
					avatarURL: "https://i.furry.bot/furry.png"
				});

				await msg.author.getDMChannel().then(dm => dm.createMessage(config.bot.directMessage.normal));
				return Logger.log("Direct Message", `Direct message recieved from ${msg.author.username}#${msg.author.discriminator}: ${msg.content}`);
			}
		}
		t.end("dm");

		t.start("db");
		uConfig = await db.getUser(msg.author.id);
		gConfig = await db.getGuild(msg.channel.guild.id);
		// overwrite prefix set without db
		if (gConfig.settings.prefix !== config.defaults.prefix) msg.prefix = gConfig.settings.prefix;
		t.end("db");

		t.start("mention");
		if ([`<@!${this.user.id}>`, `<@${this.user.id}>`].includes(msg.content)) {
			const embed =
				new EmbedBuilder(gConfig.settings.lang)
					.setTitle("{lang:other.mention.title}")
					.setColor(Math.floor(Math.random() * 0xFFFFFF))
					.setAuthor(msg.author.tag, msg.author.avatarURL)
					.setTimestamp(new Date().toISOString())
					.setDescription(`{lang:other.mention.description|${msg.author.tag}|${gConfig.settings.prefix}|${config.bot.addURL}|${config.bot.supportURL}}`)
					.toJSON();

			if (!msg.channel.permissionsOf(this.user.id).has("sendMessages")) return msg.author.getDMChannel().then(dm => dm.createMessage({
				content: "I couldn't send messages in the channel where I was mentioned, so I sent this directly to you!",
				embed
			})).catch(err => null);
			else if (!msg.channel.permissionsOf(this.user.id).has("embedLinks")) return msg.channel.createMessage(`${embed.title}\n${embed.description}\n(If you give me permission to embed links this would look a lot nicer)`).catch(err => null);
			else return msg.channel.createMessage({
				embed
			}).catch(err => null);
		}
		t.end("mention");

		t.start("autoResponse");
		if (["f", "rip"].includes(msg.content.toLowerCase()) && gConfig.settings.fResponse && msg.channel.permissionsOf(this.user.id).has("sendMessages")) {
			if (!msg.channel.permissionsOf(this.user.id).has("sendMessages")) return;
			if (!config.developers.includes(msg.author.id) && !(ubl.length > 0)) {
				this.spamCounter.response.push({
					time: Date.now(),
					user: msg.author.id,
					response: "f"
				});

				const sp = [...this.spamCounter.response.filter(s => s.user === msg.author.id)];
				let spC = sp.length;
				if (sp.length >= config.antiSpam.response.start && sp.length % config.antiSpam.response.warning === 0) {

					let report: any = {
						userTag: msg.author.tag,
						userId: msg.author.id,
						generatedTimestamp: Date.now(),
						entries: sp.map(s => ({ response: s.response, time: s.time })),
						type: "response",
						beta: config.beta
					};

					const d = fs.readdirSync(`${config.dir.logs}/spam`).filter(d => !fs.lstatSync(`${config.dir.logs}/spam/${d}`).isDirectory() && d.startsWith(msg.author.id) && d.endsWith("-response.json") && fs.lstatSync(`${config.dir.logs}/spam/${d}`).birthtimeMs + 1.2e5 > Date.now());

					if (d.length > 0) {
						report = Internal.combineReports(...d.map(f => JSON.parse(fs.readFileSync(`${config.dir.logs}/spam/${f}`).toString())), report);
						spC = report.entries.length;
						d.map(f => fs.unlinkSync(`${config.dir.logs}/spam/${f}`));
					}

					const reportId = Strings.random(10);

					fs.writeFileSync(`${config.dir.logs}/spam/${msg.author.id}-${reportId}-response.json`, JSON.stringify(report));

					await this.executeWebhook(config.webhooks.logs.id, config.webhooks.logs.token, {
						embeds: [
							{
								title: `Possible Auto Response Spam From ${msg.author.tag} (${msg.author.id}) | VL: ${spC}`,
								description: `Report: ${config.beta ? `https://${config.web.api.ip}:${config.web.api.port}/reports/response/${msg.author.id}/${reportId}` : `https://botapi.furry.bot/reports/response/${msg.author.id}/${reportId}`}`
							}
						],
						username: `FurryBot Spam Logs${config.beta ? " - Beta" : ""}`,
						avatarURL: "https://assets.furry.bot/blacklist_logs.png"
					}).catch(err => null);

					if (spC >= config.antiSpam.response.blacklist) {
						const id = Strings.random(7);
						const expire = Date.now() + 1.21e+9;
						const d = new Date(expire);
						await mdb.collection("blacklist").insertOne({
							created: Date.now(),
							type: "user",
							blame: "automatic",
							blameId: this.user.id,
							userId: msg.author.id,
							reason: "Spamming Auto Responses.",
							id,
							noticeShown: false,
							expire
						} as Blacklist.UserEntry);

						await this.executeWebhook(config.webhooks.logs.id, config.webhooks.logs.token, {
							embeds: [
								{
									title: "User Blacklisted",
									description: `Id: ${msg.author.id}\nTag: ${msg.author.tag}\nReason: Spamming Auto Responses. \nReport: ${config.beta ? `https://${config.web.api.ip}/reports/response/${msg.author.id}/${reportId}` : `https://botapi.furry.bot/reports/response/${msg.author.id}/${reportId}`}\nBlame: Automatic\nExpiry: ${Time.formatDateWithPadding(d, false)} (MM/DD/YYYY)`,
									timestamp: new Date().toISOString(),
									color: Math.floor(Math.random() * 0xFFFFFF)
								}
							],
							username: `Blacklist Logs${config.beta ? " - Beta" : ""}`,
							avatarURL: "https://assets.furry.bot/blacklist_logs.png"
						}).catch(err => null);
					}

					return;
				}
			}

			let count = await mdb.collection("stats").findOne({ id: "fCount" }).then(res => parseInt(res.count, 10)).catch(err => 1);
			await mdb.collection("stats").findOneAndUpdate({ id: "fCount" }, { $set: { count: ++count } });
			if (msg.channel.permissionsOf(this.user.id).has("embedLinks")) return msg.channel.createMessage({
				embed: {
					title: "Paying Respects.",
					author: {
						name: msg.author.tag,
						icon_url: msg.author.avatarURL
					},
					description: `**${msg.author.username}** has paid respects.\nRespects Paid Total: **${count}**`,
					footer: {
						text: `This can be disabled by using "${gConfig.settings.prefix}settings f response disabled" (no quotes)`
					},
					color: Colors.gold
				}
			}); else return msg.channel.createMessage(`<@!${msg.author.id}> has paid respects.\n\nRespects paid total: **${count}**\n\nYou can turn this auto response off by using \`${gConfig.settings.prefix}settings f response disabled\``).catch(err => null);
		}
		t.end("autoResponse");

		if (!msg.prefix || !msg.content.toLowerCase().startsWith(msg.prefix.toLowerCase()) || msg.content.toLowerCase() === msg.prefix.toLowerCase() || !msg.cmd || !msg.cmd.cmd) return;
		const cmd = msg.cmd.cmd;

		if (!config.developers.includes(msg.author.id)) {
			this.spamCounter.command.push({
				time: Date.now(),
				user: msg.author.id,
				cmd: msg.cmd.cmd.triggers[0]
			});

			const sp = [...this.spamCounter.command.filter(s => s.user === msg.author.id)];
			let spC = sp.length;
			if (sp.length >= config.antiSpam.cmd.start && sp.length % config.antiSpam.cmd.warning === 0) {
				let report: any = {
					userTag: msg.author.tag,
					userId: msg.author.id,
					generatedTimestamp: Date.now(),
					entries: sp.map(s => ({ cmd: s.cmd, time: s.time })),
					type: "cmd",
					beta: config.beta
				};

				const d = fs.readdirSync(`${config.dir.logs}/spam`).filter(d => !fs.lstatSync(`${config.dir.logs}/spam/${d}`).isDirectory() && d.startsWith(msg.author.id) && d.endsWith("-cmd.json") && fs.lstatSync(`${config.dir.logs}/spam/${d}`).birthtimeMs + 1.2e5 > Date.now());

				if (d.length > 0) {
					report = Internal.combineReports(...d.map(f => JSON.parse(fs.readFileSync(`${config.dir.logs}/spam/${f}`).toString())), report);
					spC = report.entries.length;
					d.map(f => fs.unlinkSync(`${config.dir.logs}/spam/${f}`));
				}

				const reportId = Strings.random(10);

				fs.writeFileSync(`${config.dir.logs}/spam/${msg.author.id}-${reportId}-cmd.json`, JSON.stringify(report));

				Logger.log(`Shard #${msg.channel.guild.shard.id} | Command Handler`, `Possible command spam from "${msg.author.tag}" (${msg.author.id}), VL: ${spC}, Report: ${config.beta ? `https://${config.web.api.ip}/reports/cmd/${msg.author.id}/${reportId}` : `https://botapi.furry.bot/reports/cmd/${msg.author.id}/${reportId}`}`);
				await this.executeWebhook(config.webhooks.logs.id, config.webhooks.logs.token, {
					embeds: [
						{
							title: `Possible Command Spam From ${msg.author.tag} (${msg.author.id}) | VL: ${spC}`,
							description: `Report: ${config.beta ? `https://${config.web.api.ip}/reports/cmd/${msg.author.id}/${reportId}` : `https://botapi.furry.bot/reports/cmd/${msg.author.id}/${reportId}`}`
						}
					],
					username: `Furry Bot Spam Logs${config.beta ? " - Beta" : ""}`,
					avatarURL: "https://assets.furry.bot/blacklist_logs.png"
				});

				if (spC >= config.antiSpam.cmd.blacklist) {
					const id = Strings.random(7);
					const expire = Date.now() + 2.592e+9;
					const d = new Date(expire);
					await mdb.collection("blacklist").insertOne({
						created: Date.now(),
						type: "user",
						blame: "automatic",
						blameId: this.user.id,
						userId: msg.author.id,
						reason: "Spamming Commands.",
						id,
						noticeShown: false,
						expire
					} as Blacklist.UserEntry);

					Logger.log(`Shard #${msg.channel.guild.shard.id} | Command Handler`, `User "${msg.author.tag}" (${msg.author.id}) blacklisted for spamming, VL: ${spC}, Report: ${config.beta ? `https://${config.web.api.ip}/reports/cmd/${msg.author.id}/${reportId}` : `https://botapi.furry.bot/reports/cmd/${msg.author.id}/${reportId}`}`);
					await this.executeWebhook(config.webhooks.logs.id, config.webhooks.logs.token, {
						embeds: [
							{
								title: "User Blacklisted",
								description: `Id: ${msg.author.id}\nTag: ${msg.author.tag}\nReason: Spamming Commands. \nReport: ${config.beta ? `https://${config.web.api.ip}/reports/cmd/${msg.author.id}/${reportId}` : `https://botapi.furry.bot/reports/cmd/${msg.author.id}/${reportId}`}\nBlame: Automatic\nExpiry:  ${Time.formatDateWithPadding(d, false)} (MM/DD/YYYY)`,
								timestamp: new Date().toISOString(),
								color: Math.floor(Math.random() * 0xFFFFFF)
							}
						],
						username: `Blacklist Logs${config.beta ? " - Beta" : ""}`,
						avatarURL: "https://assets.furry.bot/blacklist_logs.png"
					});
				}
			}
		}

		if (!msg.channel.permissionsOf(this.user.id).has("sendMessages")) return msg.author.getDMChannel().then(dm => dm.createMessage(`You attempted to run the command "${msg.cmd.cmd.triggers[0]}" in the channel <#${msg.channel.id}>, but I'm missing the **sendMessages** permission.\n\nContent:\n> ${msg.content}`)).catch(err => null);

		if (cmd.features.includes("betaOnly") && !config.beta) return;

		if (cmd.features.includes("devOnly") && !config.developers.includes(msg.author.id)) {
			Logger.debug(`Shard #${msg.channel.guild.shard.id}`, `${msg.author.tag} (${msg.author.id}) attempted to run developer command "${cmd.triggers[0]}" in guild ${msg.channel.guild.name} (${msg.channel.guild.id})`);
			return msg.reply(`you must be a developer to use this command.`).catch(err => null);
		}

		if (cmd.features.includes("supportOnly") && msg.channel.guild.id !== config.bot.mainGuild) return msg.reply("this command may only be ran in my support server.").catch(err => null);

		if (cmd.features.includes("guildOwnerOnly") && msg.author.id !== msg.channel.guild.ownerID) return msg.reply("only this servers owner may use this command.").catch(err => null);

		if (cmd.features.includes("nsfw")) {
			if (!msg.channel.nsfw) return msg.reply(`this command can only be ran in nsfw channels.`, {
				file: await Request.getImageFromURL("https://assets.furry.bot/nsfw.gif"),
				name: "nsfw.gif"
			}).catch(err => null);

			if (!gConfig.settings.nsfw) return msg.reply(`nsfw commands are not enabled in this server. To enable them, have an administrator run \`${gConfig.settings.prefix}settings nsfw commands enabled\`.`).catch(err => null);

			if (msg.channel.topic && config.yiff.disableStatements.some(t => msg.channel.topic.indexOf(t) !== -1)) {
				if (!msg.channel.permissionsOf(this.user.id).has("embedLinks")) return msg.reply(`some requirement was not met, but I need the \`embedLinks\` permission to tell you what.`).catch(err => null);
				const st = config.yiff.disableStatements.filter(t => msg.channel.topic.indexOf(t) !== -1);

				return msg.channel.createMessage({
					embed: {
						author: {
							name: msg.author.tag,
							icon_url: msg.author.avatarURL
						},
						title: "NSFW Commands Disabled",
						description: `NSFW commands have been explicitly disabled in this channel. To reenable them, remove **${st.join("**, **")}** from the channel topic.`,
						color: Colors.red,
						timestamp: new Date().toISOString()
					}
				}).catch(err => null);
			}
		}

		const donator = await uConfig.premiumCheck();
		if (cmd.features.includes("donatorOnly") && !config.developers.includes(msg.author.id)) {
			if (!msg.channel.permissionsOf(this.user.id).has("embedLinks")) return msg.reply(`some requirement was not met, but I need the \`embedLinks\` permission to tell you what.`).catch(err => null);
			if (!donator.active) return msg.channel.createMessage({
				embed: {
					title: "Usage Not Allowed",
					description: `You must be a donator to use this command.\nYou can donate [here](${config.bot.patreon}).`,
					color: Colors.red,
					timestamp: new Date().toISOString(),
					author: {
						name: msg.author.tag,
						icon_url: msg.author.avatarURL
					}
				}
			});
		}

		const premium = await gConfig.premiumCheck();
		if (cmd.features.includes("premiumGuildOnly") && !config.developers.includes(msg.author.id)) {
			if (!msg.channel.permissionsOf(this.user.id).has("embedLinks")) return msg.reply(`some requirement was not met, but I need the \`embedLinks\` permission to tell you what.`).catch(err => null);
			if (!premium.active) return msg.channel.createMessage({
				embed: {
					title: "Usage Not Allowed",
					description: `This command can only be used in premium servers.\nYou can donate [here](${config.bot.patreon}), and can activate a premium server using \`${gConfig.settings.prefix}pserver add\`.`,
					color: Colors.red,
					timestamp: new Date().toISOString(),
					author: {
						name: msg.author.tag,
						icon_url: msg.author.avatarURL
					}
				}
			});
		}

		if (cmd.userPermissions.length > 0 && !config.developers.includes(msg.author.id)) {
			if (cmd.userPermissions.some(perm => !msg.channel.guild.members.get(msg.author.id).permission.has(perm))) {
				const p = cmd.userPermissions.filter(perm => !msg.channel.guild.members.get(msg.author.id).permission.has(perm));
				if (!msg.channel.permissionsOf(msg.client.user.id).has("embedLinks")) return msg.reply(`you're missing some permissions to be able to run that, but I need the \`embedLinks\` permission to tell you which.`).catch(err => null);
				Logger.debug(`Shard #${msg.channel.guild.shard.id}`, `user ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) is missing the permission(s) ${p.join(", ")} to run the command ${cmd.triggers[0]}`);
				return msg.channel.createMessage({
					embed: {
						title: "You do not have the required permission(s) to use this!",
						description: `You require the permission(s) **${p.join("**, **")}** to run this, which you do not have.`,
						color: Colors.red,
						timestamp: new Date().toISOString()
					}
				}).catch(err => null);
			}
		}

		if (cmd.botPermissions.length > 0) {
			if (cmd.botPermissions.some(perm => !msg.channel.guild.members.get(this.user.id).permission.has(perm))) {
				const p = cmd.botPermissions.filter(perm => !msg.channel.guild.members.get(this.user.id).permission.has(perm));
				if (!msg.channel.permissionsOf(msg.client.user.id).has("embedLinks")) return msg.reply(`I am missing some permissions to be able to run that, but I need the \`embedLinks\` permission to tell you which.`).catch(err => null);
				Logger.debug(`Shard #${msg.channel.guild.shard.id}`, `I am missing the permission(s) ${p.join(", ")} for the command ${cmd.triggers[0]}, server: ${(msg.channel as Eris.TextChannel).guild.name} (${(msg.channel as Eris.TextChannel).guild.id})`);
				return msg.channel.createMessage({
					embed: {
						title: "I do not have the required permission(s) to use this!",
						description: `I need the permission(s) **${p.join("**, **")}** for this command to function properly, please add these to me and try again.`,
						color: Colors.red,
						timestamp: new Date().toISOString()
					}
				}).catch(err => null);
			}
		}

		if (!config.developers.includes(msg.author.id)) {
			const cool = this.cd.check(msg.author.id, "cmd", { cmd: cmd.triggers[0] });
			const time = cool.time < 1000 ? 1000 : Math.round(cool.time / 1000) * 1000;
			if (cool.found && cmd.cooldown !== 0 && cool.time !== 0) {
				const t = Time.ms(time, true);
				const n = Time.ms(cmd.cooldown, true);
				const d = Time.ms(cmd.donatorCooldown, true);
				return msg.channel.createMessage({
					embed: {
						title: "Command On Cooldown",
						color: Colors.red,
						description: [
							`Please wait **${t}** before trying to use this command again!`,
							donator.active ? `You are a [donator](${config.bot.patreon}), so you get shorter cooldowns!` : `Normal users have to wait **${n}**, meanwhile [donators](${config.bot.patreon}) only have to wait **${d}**.`
						].join("\n"),
						timestamp: new Date().toISOString(),
						author: {
							name: msg.author.tag,
							icon_url: msg.author.avatarURL
						}
					}
				});
			}
		}

		if (cmd.cooldown !== 0 && !config.developers.includes(msg.author.id)) this.cd.add(msg.author.id, "cmd", donator.active ? cmd.donatorCooldown : cmd.cooldown, { cmd: cmd.triggers[0] });

		Logger.log(`Shard #${msg.channel.guild.shard.id}`, `Command "${cmd.triggers[0]}" ran with ${msg.unparsedArgs.length === 0 ? "no arguments" : `the arguments "${msg.unparsedArgs.join(" ")}"`} by user ${msg.author.tag} (${msg.author.id}) in guild ${msg.channel.guild.name} (${msg.channel.guild.id})`);

		t.start("cmd");
		const c = await cmd.run.call(this, msg, uConfig, gConfig, cmd).catch(err => err);
		t.end("cmd");
		Logger.debug(`Shard #${msg.channel.guild.shard.id}`, `Command handler for "${cmd.triggers[0]}" took ${t.calc("cmd", "cmd")}ms`);
		if (cmd.triggers[0] !== "eval" && msg.channel.isTyping) await msg.channel.stopTyping();
		if (c instanceof Error) throw c;
		t.end("main");

		// timing command processing
		if (msg.cmd.cat.name !== "dev") await mdb.collection("timing").insertOne({ times: t.timers, cmd: cmd.triggers[0], id: uuid.v4() });
	} catch (e) {
		const err: Error & { code?: string; } = e; // typescript doesn't allow annotating of catch clause variables, TS-1196
		if (!["ERR_INVALID_USAGE", "RETURN"].includes(err.message)) {
			Logger.error(msg && msg.channel && msg.channel.guild && msg.channel.guild.shard ? `Shard #${msg.channel.guild.shard.id}` : "Error", err);
			if (!msg || !msg.channel || !msg.channel.guild || !msg.channel.guild.shard) return;
		}
		const cmd = msg.cmd !== null ? msg.cmd.cmd : null;
		if (!cmd) return;
		switch (err.message) {
			case "ERR_INVALID_USAGE": {


				return msg.channel.createMessage({
					embed: new EmbedBuilder(gConfig.settings.lang)
						.setTitle(`:x: {lang:other.error.invalidUsage.title}`)
						.setDescription([
							"**{lang:other.error.invalidUsage.info}**:",
							`\u25FD {lang:other.error.invalidUsage.command}: ${cmd.triggers[0]}`,
							`\u25FD {lang:other.error.invalidUsage.usage}: \`${gConfig.settings.prefix}${cmd.triggers[0]} ${cmd.usage}\``,
							`\u25FD {lang:other.error.invalidUsage.description}: ${cmd.description || "{lang:other.error.invalidUsage.noDescription}"}`,
							`\u25FD {lang:other.error.invalidUsage.category}: ${cmd.category}`,
							`\u25FD {lang:other.error.invalidUsage.providedArgs}: **${msg.unparsedArgs.length < 1 ? "{lang:other.error.invalidUsage.noArgs}" : msg.unparsedArgs.join(" ")}**`
						].join("\n"))
						.setTimestamp(new Date().toISOString())
						.setColor(Colors.red)
						.setAuthor(msg.author.tag, msg.author.avatarURL)
				}).catch(err => null);
				break;
			}

			case "RETURN": { return; break; }

			default: {
				const r = Strings.random(10);
				const ecode = `err.${cmd !== null ? cmd.triggers[0] : "general"}.${config.beta ? "beta" : "prod"}.${r}`;
				Logger.error(`Shard #${msg.channel.guild.shard.id}`, ecode);
				Logger.error(`Shard #${msg.channel.guild.shard.id}`, err);

				const s = await phin({
					method: "POST",
					url: "https://pastebin.com/api/api_post.php",
					form: {
						api_dev_key: config.keys.pastebin.devKey,
						api_user_key: config.keys.pastebin.userKey,
						api_option: "paste",
						api_paste_code: err.stack,
						api_paste_private: "2",
						api_paste_name: "Furry Bot Error",
						api_paste_expire_date: "1W"
					},
					timeout: 5e3
				}).then(k => k.body.toString());
				const embed: Eris.EmbedOptions = {
					title: ":x: Error",
					description: [
						"**Error**:",
						`\u25FD Stack: ${s}`,
						`\u25FD Error Name: ${err.name}`,
						`\u25FD Error Message: ${err.message}`,
						`\u25FD Error Code: ${err.code || "None"}`,
						"",
						"**Other Info**:",
						`\u25FD User: ${msg.author.tag} (<@!${msg.author.id}>)`,
						`\u25FD Code: \`${ecode}\``,
						`\u25FD Command: ${cmd !== null ? cmd.triggers[0] : "none"}`,
						"",
						"**Location**:",
						`\u25FD Message Content: **${msg.content}**`,
						`\u25FD Message ID: \`${msg.id}\``,
						`\u25FD Channel: **${msg.channel.name}**`,
						`\u25FD Channel ID: \`${msg.channel.id}\``,
						`\u25FD Guild: **${msg.channel.guild.name}**`,
						`\u25FD Guild ID: \`${msg.channel.guild.id}\``,
						`\u25FD Shard: #${msg.channel.guild.shard.id}`,
						`\u25FD Time: ${Time.formatDateWithPadding(Date.now(), true, false)}`
					].join("\n"),
					timestamp: new Date().toISOString(),
					color: Colors.red
				};
				let k = "";
				if (config.developers.includes(msg.author.id)) return msg.channel.createMessage({ embed });
				else {
					await this.w.get("errors").execute({
						embeds: [embed]
					});
					switch (err.code) {
						case "ECONNRESET": {
							k = "{lang:other.error.econnreset}";
							break;
						}
					}
					if (!k) k = "{lang:other.error.unknown}";
					return msg.channel.createMessage(`${k}\n{lang:other.error.join|${config.bot.supportURL}|${ecode}|${err.name}|${err.message}}`).catch(err => null);
				}
			}
		}
	}
}));
