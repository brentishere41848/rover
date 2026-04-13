import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from "discord.js";
import { REST } from "discord.js";

import { config } from "./config.js";
import { randomString } from "./crypto.js";
import { linkedUsersByDiscordId, linkedUsersByRobloxId, pendingLinks } from "./store.js";
import { fetchRobloxAvatar, lookupRobloxUserById, lookupRobloxUserByUsername } from "./roblox.js";

const commands = [
  new SlashCommandBuilder().setName("verify").setDescription("Link your Roblox account with Discord."),
  new SlashCommandBuilder()
    .setName("whois")
    .setDescription("Look up Discord or Roblox account information.")
    .addSubcommand((subcommand) =>
      subcommand.setName("discord").setDescription("Look up a Discord member and their linked Roblox account.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roblox")
        .setDescription("Look up a Roblox user.")
        .addStringOption((option) =>
          option.setName("username").setDescription("Roblox username").setRequired(true)
        )
    )
].map((command) => command.toJSON());

async function registerCommands() {
  if (!config.discordBotToken || !config.discordClientId) {
    console.warn("Discord bot configuration is incomplete. Skipping slash command registration.");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(config.discordBotToken);
  await rest.put(Routes.applicationCommands(config.discordClientId), {
    body: commands
  });
}

function buildVerifyEmbed(memberDisplayName) {
  return new EmbedBuilder()
    .setColor(0xe23a7d)
    .setTitle("RoVer")
    .setDescription("You must link your Roblox account to your Discord account to continue.")
    .addFields(
      { name: "Discord", value: memberDisplayName, inline: true },
      { name: "Flow", value: "Secure Roblox OAuth", inline: true },
      { name: "Privacy", value: "No passwords or Roblox browser cookies are collected.", inline: false }
    )
    .setFooter({ text: "Only you can see this" });
}

function buildVerifySuccessEmbed(record) {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("RoVer")
    .setDescription("Update complete")
    .addFields(
      { name: "Roblox Username", value: record.robloxUsername, inline: true },
      { name: "Display Name", value: record.robloxDisplayName, inline: true },
      { name: "Roblox User ID", value: record.robloxId, inline: true }
    )
    .setFooter({ text: "Only you can see this" });

  if (record.avatarUrl) {
    embed.setThumbnail(record.avatarUrl);
  }

  return embed;
}

function buildWhoisDiscordEmbed(record, targetMember) {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(targetMember.user.tag)
    .addFields(
      { name: "Discord ID", value: targetMember.id, inline: true },
      { name: "Server Nickname", value: targetMember.displayName || "None", inline: true }
    );

  if (!record) {
    embed.setDescription("This user is not verified with the bot.");
    return embed;
  }

  embed.addFields(
    { name: "Roblox Username", value: record.robloxUsername, inline: true },
    { name: "Roblox Display Name", value: record.robloxDisplayName, inline: true },
    { name: "Roblox User ID", value: record.robloxId, inline: true },
    { name: "Profile", value: record.profileUrl, inline: false },
    { name: "Linked At", value: `<t:${Math.floor(new Date(record.linkedAt).getTime() / 1000)}:F>`, inline: false }
  );

  if (record.avatarUrl) {
    embed.setThumbnail(record.avatarUrl);
  }

  return embed;
}

function buildWhoisNotVerifiedEmbed(targetMember) {
  return new EmbedBuilder()
    .setColor(0x95a5a6)
    .setTitle(targetMember.user.tag)
    .setDescription("This user is not verified with the bot.")
    .setFooter({ text: "Only you can see this" });
}

function buildRobloxEmbed(user, avatarUrl) {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(user.displayName || user.name)
    .setDescription(`@${user.name}`)
    .addFields(
      { name: "User ID", value: String(user.id), inline: true },
      { name: "Has Verified Badge", value: user.hasVerifiedBadge ? "Yes" : "No", inline: true },
      { name: "Profile", value: `https://www.roblox.com/users/${user.id}/profile`, inline: false }
    );

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  const linkedRecord = linkedUsersByRobloxId.get(String(user.id));
  if (linkedRecord) {
    embed.addFields({ name: "Linked Discord", value: linkedRecord.discordTag, inline: true });
  }

  return embed;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    ...(config.discordEnableGuildMembersIntent ? [GatewayIntentBits.GuildMembers] : [])
  ]
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "verify") {
        const linkToken = randomString(18);
        pendingLinks.set(linkToken, {
          discordId: interaction.user.id,
          discordTag: interaction.user.tag,
          createdAt: new Date().toISOString()
        });

        const linkUrl = `${config.publicBaseUrl}/?linkToken=${encodeURIComponent(linkToken)}`;
        const embed = buildVerifyEmbed(interaction.member?.displayName || interaction.user.tag);
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel("Verify my Roblox account").setStyle(ButtonStyle.Link).setURL(linkUrl),
          new ButtonBuilder().setCustomId(`verify-check:${interaction.user.id}`).setLabel("I've linked my account").setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
          embeds: [embed],
          components: [buttons],
          ephemeral: true
        });
        return;
      }

      if (interaction.commandName === "whois") {
        const subcommand = interaction.options.getSubcommand(true);

        if (subcommand === "discord") {
          if (!config.discordEnableGuildMembersIntent) {
            await interaction.reply({
              content:
                "This command needs Server Members Intent. Enable it in the Discord Developer Portal and set `DISCORD_ENABLE_GUILD_MEMBERS_INTENT=true` in your `.env`.",
              ephemeral: true
            });
            return;
          }

          const members = await interaction.guild.members.fetch({ limit: 25 });
          const options = members.map((member) => ({
            label: member.user.tag.slice(0, 100),
            description: `ID: ${member.id}`,
            value: member.id
          }));

          const select = new StringSelectMenuBuilder()
            .setCustomId("whois-discord-select")
            .setPlaceholder("Select a Discord member")
            .addOptions(options.slice(0, 25));

          const row = new ActionRowBuilder().addComponents(select);

          await interaction.reply({
            content: "Select a member to inspect.",
            components: [row],
            ephemeral: true
          });
          return;
        }

        if (subcommand === "roblox") {
          const username = interaction.options.getString("username", true);
          const basicUser = await lookupRobloxUserByUsername(username);

          if (!basicUser) {
            await interaction.reply({ content: "Roblox user not found.", ephemeral: true });
            return;
          }

          const user = await lookupRobloxUserById(basicUser.id);
          const avatarUrl = await fetchRobloxAvatar(user.id).catch(() => null);
          await interaction.reply({ embeds: [buildRobloxEmbed(user, avatarUrl)], ephemeral: true });
          return;
        }

        return;
      }
    }

    if (interaction.isButton() && interaction.customId.startsWith("verify-check:")) {
      const discordId = interaction.customId.split(":")[1];
      const record = linkedUsersByDiscordId.get(discordId);

      if (!record) {
        await interaction.reply({
          content: "No linked Roblox account was found yet. Complete the web flow, then try again.",
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        embeds: [buildVerifySuccessEmbed(record)],
        ephemeral: true
      });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "whois-discord-select") {
      const targetId = interaction.values[0];
      const member = await interaction.guild.members.fetch(targetId);
      const record = linkedUsersByDiscordId.get(targetId) || null;
      await interaction.update({
        content: "",
        embeds: [record ? buildWhoisDiscordEmbed(record, member) : buildWhoisNotVerifiedEmbed(member)],
        components: []
      });
      return;
    }
  } catch (error) {
    console.error(error);
    const payload = { content: "The command failed. Check configuration and try again.", ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

await registerCommands();

if (config.discordBotToken) {
  client.login(config.discordBotToken).catch((error) => {
    if (String(error?.message || "").includes("Used disallowed intents")) {
      console.error(
        "Bot login failed because Discord rejected a privileged intent. Disable `DISCORD_ENABLE_GUILD_MEMBERS_INTENT` or enable Server Members Intent in the Discord Developer Portal."
      );
      process.exit(1);
    }

    console.error(error);
    process.exit(1);
  });
} else {
  console.warn("DISCORD_BOT_TOKEN is missing. Bot login skipped.");
}
