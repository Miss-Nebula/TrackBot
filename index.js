const Discord = require('discord.js');

const config = require('./config.json');

const Client = new Discord.Client();

const invites = [];

const getInvites = async () => {
    const invites = [];
    for(const guild of Client.guilds.cache.array()){
        invites.push(
            ...(await guild.fetchInvites())
            .array()
            .map(invite => ({ code: invite.code, channelId: invite.channel.id, usageCount: invite.uses }))
        );
    }
    return invites;
};

Client.on('ready', async () => invites.splice(0, invites.length, ...await getInvites()));

Client.on('inviteCreate', invite => invites.push({
    code: invite.code,
    channelId: invite.channel.id,
    usageCount: 0
}));

Client.on('inviteDelete', invite => {
    const index = invites.findIndex(currentInvite => invite.code === currentInvite.code);
    if(index === -1) return;
    invites.splice(index, 1);
});

Client.on('guildMemberAdd', async member => {
    if(member.user.bot) return;
    const
        updatedInvites = await getInvites(),
        usedInvite = updatedInvites.find(updatedInvite =>
            invites.find(oldInvite => updatedInvite.code === oldInvite.code)
                .usageCount === updatedInvite.usageCount - 1);
    invites.splice(0, invites.length, ...updatedInvites);
    if(!usedInvite) return;
    await Client.channels.cache
        .get(usedInvite.channelId)
        .send(
            (config.messages[member.guild.id][usedInvite.channelId] || config.messages[member.guild.id].default)
                .replace('%member%', member)
                .replace('%usageCount%', usedInvite.usageCount)
        );
});

Client.login(config.token)
      .catch(console.error);