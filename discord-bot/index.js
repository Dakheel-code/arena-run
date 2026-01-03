const dns = require('dns');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

const BOT_VERSION = '2025-12-25-use-db-title-v7';

// Set DNS to use Google's DNS servers to avoid network issues
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

// Normalize guild id from either DISCORD_GUILD_ID or DISCORD_GUILD_IDS (comma-separated)
if (!process.env.DISCORD_GUILD_ID && process.env.DISCORD_GUILD_IDS) {
  const firstGuild = String(process.env.DISCORD_GUILD_IDS)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)[0];
  if (firstGuild) process.env.DISCORD_GUILD_ID = firstGuild;
}

const requiredEnvVars = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function resolveGuildIdFromSettings() {
  if (process.env.DISCORD_GUILD_ID) return process.env.DISCORD_GUILD_ID;
  try {
    const { data } = await supabase
      .from('settings')
      .select('discord_guild_ids')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const first = String(data?.discord_guild_ids || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)[0];
    if (first) {
      process.env.DISCORD_GUILD_ID = first;
      return first;
    }
  } catch {
    // ignore
  }
  return null;
}

console.log('🔧 Supabase Configuration:');
console.log('   URL:', process.env.SUPABASE_URL);
console.log('   Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 4)}...${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(process.env.SUPABASE_SERVICE_ROLE_KEY.length - 4)}` : 'MISSING');
console.log('🤖 Bot Version:', BOT_VERSION);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const notificationChannels = {
  uploads: process.env.CHANNEL_UPLOADS || null,
  security: process.env.CHANNEL_SECURITY || null,
  sessions: process.env.CHANNEL_SESSIONS || null
};

let notificationSettings = {
  notify_new_upload: true,
  notify_new_publish: true,
  notify_new_session: true,
  notify_country_change: true,
  notify_ip_change: true,
  notify_excessive_views: true,
  notify_suspicious_activity: true,
  notify_vpn_proxy: true,
  notify_multiple_devices: true,
  notify_odd_hours: false,
  excessive_views_threshold: 5,
  excessive_views_interval: 10,
  odd_hours_start: 2,
  odd_hours_end: 6
};

const videoPublishState = new Map();
let subscriptionsStarted = false;

async function loadNotificationSettings() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!error && data) {
      notificationSettings = { ...notificationSettings, ...data };
      console.log('✅ Notification settings loaded from database');
    }
  } catch (error) {
    console.warn('⚠️ Could not load notification settings, using defaults');
  }
}

async function sendNotification(channelType, embed) {
  try {
    const channelId = notificationChannels[channelType];
    if (!channelId) {
      console.log(`⏭️ Skipping notification - ${channelType} channel not configured`);
      return;
    }

    const channel = await client.channels.fetch(channelId);
    if (channel) {
      await channel.send({ embeds: [embed] });
      console.log(`✅ Notification sent to ${channelType} channel`);
    }
  } catch (error) {
    console.error(`❌ Error sending notification to ${channelType}:`, error.message);
  }
}

async function safeAutocompleteRespond(interaction, choices) {
  if (interaction.responded) return;
  try {
    await interaction.respond(choices);
  } catch (error) {
    const isAlreadyAck = error?.code === 40060 || /already been acknowledged/i.test(String(error?.message || ''));
    if (isAlreadyAck) return;
    console.error('Autocomplete respond error:', error);
  }
}

async function handleNewUpload(payload) {
  if (!notificationSettings.notify_new_upload) return;

  const video = payload.new;

  if (video?.id) {
    videoPublishState.set(video.id, !!video.is_published);
  }

  const embed = new EmbedBuilder()
    .setColor(0x3B82F6)
    .setTitle('📤 New Video Uploaded')
    .setDescription(`**${video.title}**`)
    .addFields(
      { name: 'Uploader', value: video.uploader_name || 'Unknown', inline: true },
      { name: 'Season', value: video.season || 'N/A', inline: true },
      { name: 'Day', value: video.day || 'N/A', inline: true },
      { name: 'Status', value: video.is_published ? '✅ Published' : '📦 Unpublished', inline: true },
      { name: 'Video ID', value: `\`${video.id}\``, inline: false }
    )
    .setTimestamp();

  await sendNotification('uploads', embed);
}

async function handlePublishChange(payload) {
  if (!notificationSettings.notify_new_publish) return;

  const video = payload.new;
  const isPublished = !!video.is_published;
  const prev = video?.id ? videoPublishState.get(video.id) : undefined;

  // If we don't know previous state (common if replica identity is not FULL),
  // prime cache and skip to avoid false publish/unpublish notifications.
  if (prev === undefined) {
    if (video?.id) videoPublishState.set(video.id, isPublished);
    return;
  }

  if (prev === isPublished) return;
  if (video?.id) videoPublishState.set(video.id, isPublished);

  const embed = new EmbedBuilder()
    .setColor(isPublished ? 0x10B981 : 0xF59E0B)
    .setTitle(isPublished ? '✅ Video Published' : '📦 Video Unpublished')
    .setDescription(`**${video.title}**`)
    .addFields(
      { name: 'Uploader', value: video.uploader_name || 'Unknown', inline: true },
      { name: 'Season', value: video.season || 'N/A', inline: true },
      { name: 'Day', value: video.day || 'N/A', inline: true },
      { name: 'Video ID', value: `\`${video.id}\``, inline: false }
    )
    .setTimestamp();

  if (isPublished) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('➜ Watch Video')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://arena.regulators.us/app/watch/${video.id}`)
      );
    
    if (!notificationChannels.uploads) {
      await sendNotification('uploads', embed);
      return;
    }

    const channel = await client.channels.fetch(notificationChannels.uploads);
    if (channel) {
      await channel.send({ embeds: [embed], components: [row] });
    } else {
      await sendNotification('uploads', embed);
    }
  } else {
    await sendNotification('uploads', embed);
  }
}

async function handleNewSession(payload) {
  if (!notificationSettings.notify_new_session) return;

  const session = payload.new;
  
  try {
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('discord_id', session.discord_id)
      .single();

    const { data: video } = await supabase
      .from('videos')
      .select('title')
      .eq('id', session.video_id)
      .single();

    const memberName = member?.discord_username || member?.game_id || 'Unknown';
    const videoTitle = video?.title || 'Unknown Video';

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('👁️ New Watch Session')
      .addFields(
        { name: 'Member', value: memberName, inline: true },
        { name: 'Video', value: videoTitle, inline: true },
        { name: 'Country', value: session.country || 'Unknown', inline: true },
        { name: 'Started At', value: new Date(session.started_at).toLocaleString('en-US'), inline: false }
      )
      .setTimestamp();

    await sendNotification('sessions', embed);
  } catch (error) {
    console.error('Error handling new session:', error);
  }
}

async function handleSecurityAlert(payload) {
  const alert = payload.new;
  
  const alertSettings = {
    'country_change': notificationSettings.notify_country_change,
    'ip_change': notificationSettings.notify_ip_change,
    'excessive_views': notificationSettings.notify_excessive_views,
    'suspicious_activity': notificationSettings.notify_suspicious_activity,
    'vpn_proxy': notificationSettings.notify_vpn_proxy,
    'multiple_devices': notificationSettings.notify_multiple_devices,
    'odd_hours': notificationSettings.notify_odd_hours
  };

  if (!alertSettings[alert.type]) return;

  try {
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('discord_id', alert.discord_id)
      .single();

    const memberName = member?.discord_username || member?.game_id || 'Unknown';

    const alertTitles = {
      'country_change': '🌍 Country Change Detected',
      'ip_change': '🔄 IP Address Changed',
      'excessive_views': '⚠️ Excessive Views Detected',
      'suspicious_activity': '🚨 Suspicious Activity',
      'vpn_proxy': '🔒 VPN/Proxy Detected',
      'multiple_devices': '📱 Multiple Devices',
      'odd_hours': '🌙 Odd Hours Activity'
    };

    const embed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle(alertTitles[alert.type] || '⚠️ Security Alert')
      .addFields(
        { name: 'Member', value: memberName, inline: true },
        { name: 'Discord ID', value: alert.discord_id, inline: true },
        { name: 'Severity', value: alert.severity || 'medium', inline: true }
      )
      .setTimestamp();

    if (alert.details) {
      const detailsText = typeof alert.details === 'string'
        ? alert.details
        : JSON.stringify(alert.details);
      embed.setDescription(`**Details:** ${detailsText}`.substring(0, 4096));
    }

    await sendNotification('security', embed);
  } catch (error) {
    console.error('Error handling security alert:', error);
  }
}

function setupRealtimeSubscriptions() {
  if (subscriptionsStarted) return;
  subscriptionsStarted = true;

  supabase
    .channel('videos-changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'videos' },
      handleNewUpload
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'videos' },
      handlePublishChange
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to videos changes');
      }
    });

  supabase
    .channel('sessions-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'view_sessions' },
      handleNewSession
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to view sessions changes');
      }
    });

  supabase
    .channel('alerts-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'alerts' },
      handleSecurityAlert
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to security alerts');
      }
    });
}

client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

// Helper function to get recent videos for autocomplete
async function getRecentVideos() {
  try {
    console.log('🔍 Fetching videos from Supabase...');
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, title, is_published, season, day')
      .order('created_at', { ascending: false })
      .limit(25);
    
    if (error) {
      console.error('❌ Error fetching videos:', error);
      return [];
    }
    
    console.log(`✅ Fetched ${videos?.length || 0} videos`);
    return videos || [];
  } catch (error) {
    console.error('❌ Exception fetching videos:', error);
    return [];
  }
}

// Command handlers
async function handlePostCommand(interaction) {
  const videoId = interaction.options.getString('video_id');
  const channel = interaction.options.getChannel('channel') || interaction.channel;
  
  try {
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error || !video) {
      return interaction.reply({ content: '❌ Video not found!', ephemeral: true });
    }

    if (!video.is_published) {
      return interaction.reply({ content: '⚠️ This video is not published!', ephemeral: true });
    }

    let uploaderDiscordId = video.uploaded_by ? String(video.uploaded_by) : null;
    const titleMentionMatch = String(video.title || '').match(/<@!?(\d+)>/);
    if (titleMentionMatch?.[1]) {
      uploaderDiscordId = String(titleMentionMatch[1]);
    }
    let uploaderMention = uploaderDiscordId ? `<@${uploaderDiscordId}>` : null;
    let uploaderName = video.uploader_name ? String(video.uploader_name) : 'Unknown';
    let uploaderAvatar = video.uploader_avatar ? String(video.uploader_avatar) : null;

    // Fetch member data to get discord_global_name (server nickname)
    if (uploaderDiscordId) {
      try {
        const { data: member } = await supabase
          .from('members')
          .select('discord_global_name, discord_username, discord_avatar')
          .eq('discord_id', uploaderDiscordId)
          .limit(1)
          .maybeSingle();

        if (member) {
          // Use server nickname if available, otherwise use username
          uploaderName = member.discord_global_name || member.discord_username || uploaderName;
          if (!uploaderAvatar && member.discord_avatar) {
            uploaderAvatar = String(member.discord_avatar);
          }
        }
      } catch {
        // ignore
      }
    } else if (uploaderName && uploaderName !== 'Unknown') {
      try {
        const { data: memberByGameId } = await supabase
          .from('members')
          .select('discord_id, discord_global_name, discord_username, discord_avatar')
          .ilike('game_id', uploaderName)
          .limit(1)
          .maybeSingle();

        const member = memberByGameId || (await supabase
          .from('members')
          .select('discord_id, discord_global_name, discord_username, discord_avatar')
          .ilike('discord_username', uploaderName)
          .limit(1)
          .maybeSingle()).data;

        if (member?.discord_id) {
          uploaderDiscordId = String(member.discord_id);
          uploaderMention = `<@${uploaderDiscordId}>`;
          uploaderName = member.discord_global_name || member.discord_username || uploaderName;
          if (!uploaderAvatar && member.discord_avatar) {
            uploaderAvatar = String(member.discord_avatar);
          }
        }
      } catch {
        // ignore
      }
    }

    // Try to get guild member avatar (server-specific avatar)
    if (!uploaderAvatar && uploaderDiscordId) {
      try {
        const guild = interaction.guild;
        if (guild) {
          const guildMember = await guild.members.fetch(uploaderDiscordId);
          // Use guild avatar if available, otherwise use user avatar
          uploaderAvatar = guildMember?.displayAvatarURL?.({ size: 256 }) || null;
        }
        
        // Fallback to user avatar if no guild avatar
        if (!uploaderAvatar) {
          const user = await client.users.fetch(uploaderDiscordId);
          uploaderAvatar = user?.displayAvatarURL?.({ size: 256 }) || null;
        }
      } catch {
        // ignore
      }
    }

    const overtimeNote = String(video.overtime_type || '').trim() === 'last_hit'
      ? ' (Last hit went overtime)'
      : '';
    const shieldHitsRaw = String(video.shield_hits || '').trim();
    const shieldHitsNum = Number.parseInt(shieldHitsRaw.replace(/\D+/g, ''), 10);
    const shieldHitsValue = Number.isFinite(shieldHitsNum) && shieldHitsNum > 0
      ? String(shieldHitsNum)
      : shieldHitsRaw.replace(/^\+/, '').trim();

    // Use title from database as-is
    const embedTitle = String(video.title || 'Untitled').trim();
    console.log('[post] embedTitle:', embedTitle);

    const detailsLines = []

    if (video.wins_attacks && video.arena_time) {
      detailsLines.push(`**${video.wins_attacks}** within **${video.arena_time} minutes**${overtimeNote}`);
      if (shieldHitsValue && shieldHitsValue !== '0') {
        detailsLines.push(`+${shieldHitsValue} hits beforehand for shield`);
      }
      detailsLines.push('');
    }

    if (video.start_rank && video.end_rank) {
      detailsLines.push(`Started at **${video.start_rank}** and ended up at **${video.end_rank}**.`);
      detailsLines.push('');
    }

    detailsLines.push(video.has_commentary ? '• **with** commentary' : '• **without** commentary');

    const detailsText = detailsLines.join('\n').trim();

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle(embedTitle)
      .setDescription(detailsText || 'New video available!')
      .setFooter({ text: 'Click the button below - Discord login required' })
      .setTimestamp();

    if (uploaderAvatar) {
      embed.setThumbnail(uploaderAvatar);
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('➜ Click Here')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://arena.regulators.us/app/watch/${videoId}`)
      );

    await channel.send({
      embeds: [embed],
      components: [row]
    });

    try {
      if (uploaderDiscordId) {
        const user = await client.users.fetch(uploaderDiscordId);
        const dmEmbed = new EmbedBuilder()
          .setColor(0x10B981)
          .setTitle('Thank you!')
          .setDescription(
            `Your video has been posted successfully ✅\n\n` +
            `**${String(embedTitle || '').trim()}**\n\n` +
            `We truly appreciate your time and effort—your contribution makes a real difference.`
          )
          .addFields(
            { name: 'Posted in', value: `<#${channel.id}>`, inline: true }
          )
          .setTimestamp();

        if (uploaderAvatar) {
          dmEmbed.setThumbnail(uploaderAvatar);
        }

        await user.send({ embeds: [dmEmbed] });
      }
    } catch (e) {
      console.warn('⚠️ Failed to send DM to uploader:', e?.message || e);
    }

    await interaction.reply({ content: `✅ Video posted to ${channel.name}!`, ephemeral: true });
  } catch (error) {
    console.error('Error posting video:', error);
    await interaction.reply({ content: '❌ Failed to post video.', ephemeral: true });
  }
}

async function handlePublishCommand(interaction) {
  const videoId = interaction.options.getString('video_id');
  
  try {
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      return interaction.reply({ content: '❌ Video not found!', ephemeral: true });
    }

    if (video.is_published) {
      return interaction.reply({ content: '⚠️ Video is already published!', ephemeral: true });
    }

    const { error: updateError } = await supabase
      .from('videos')
      .update({ is_published: true })
      .eq('id', videoId);

    if (updateError) throw updateError;

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Video Published')
      .setDescription(`**${video.title}**`)
      .addFields(
        { name: 'Video ID', value: videoId, inline: true },
        { name: 'Uploader', value: video.uploader_name || 'Unknown', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error publishing video:', error);
    await interaction.reply({ content: '❌ Failed to publish video.', ephemeral: true });
  }
}

async function handleUnpublishCommand(interaction) {
  const videoId = interaction.options.getString('video_id');
  
  try {
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      return interaction.reply({ content: '❌ Video not found!', ephemeral: true });
    }

    if (!video.is_published) {
      return interaction.reply({ content: '⚠️ Video is already unpublished!', ephemeral: true });
    }

    const { error: updateError } = await supabase
      .from('videos')
      .update({ is_published: false })
      .eq('id', videoId);

    if (updateError) throw updateError;

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('📦 Video Unpublished')
      .setDescription(`**${video.title}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error unpublishing video:', error);
    await interaction.reply({ content: '❌ Failed to unpublish video.', ephemeral: true });
  }
}

async function handleDeleteCommand(interaction) {
  const videoId = interaction.options.getString('video_id');
  
  try {
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      return interaction.reply({ content: '❌ Video not found!', ephemeral: true });
    }

    await interaction.reply({ content: `⏳ Deleting **${video.title}**...` });

    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (deleteError) throw deleteError;

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Video Deleted')
      .setDescription(`**${video.title}**`)
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
  } catch (error) {
    console.error('Error deleting video:', error);
    await interaction.editReply({ content: '❌ Failed to delete video.' });
  }
}

async function handleToggleCommand(interaction) {
  const discordId = interaction.options.getString('discord_id');
  const action = interaction.options.getString('action');
  
  try {
    console.log('🔍 Fetching member:', discordId);
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('discord_id', discordId)
      .single();

    console.log('📊 Query result:', { member, error: memberError });

    if (memberError) {
      console.error('❌ Supabase error:', memberError);
      return interaction.reply({ content: `❌ Error: ${memberError.message}`, ephemeral: true });
    }

    if (!member) {
      return interaction.reply({ content: '❌ Member not found!', ephemeral: true });
    }

    const newStatus = action === 'ban' ? false : true;
    
    if (member.is_active === newStatus) {
      return interaction.reply({ content: `⚠️ Member is already ${newStatus ? 'active' : 'banned'}!`, ephemeral: true });
    }

    const { error: updateError } = await supabase
      .from('members')
      .update({ is_active: newStatus })
      .eq('discord_id', discordId);

    if (updateError) throw updateError;

    const embed = new EmbedBuilder()
      .setColor(newStatus ? 0x00FF00 : 0xFF0000)
      .setTitle(`${newStatus ? '✅ Member Activated' : '🚫 Member Banned'}`)
      .setDescription(`**${member.discord_username || member.game_id}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error toggling member:', error);
    await interaction.reply({ content: '❌ Failed to update member.', ephemeral: true });
  }
}

async function handleSessionsCommand(interaction) {
  const discordId = interaction.options.getString('discord_id');
  
  try {
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('discord_id', discordId)
      .single();

    if (memberError || !member) {
      return interaction.reply({ content: '❌ Member not found!', ephemeral: true });
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from('view_sessions')
      .select('*, videos(title)')
      .eq('discord_id', discordId)
      .order('started_at', { ascending: false })
      .limit(10);

    if (sessionsError) throw sessionsError;

    if (!sessions || sessions.length === 0) {
      return interaction.reply({ content: '⚠️ No sessions found.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 Last 10 Sessions - ${member.discord_username || member.game_id}`)
      .setThumbnail(member.discord_avatar)
      .setTimestamp();

    sessions.forEach((session, index) => {
      const duration = Math.floor(session.watch_seconds / 60);
      embed.addFields({
        name: `${index + 1}. ${session.videos?.title || 'Unknown'}`,
        value: `⏱️ ${duration}m | 🌍 ${session.country || 'Unknown'}`,
        inline: false
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    await interaction.reply({ content: '❌ Failed to fetch sessions.', ephemeral: true });
  }
}

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('post')
    .setDescription('Post a video announcement')
    .addStringOption(option =>
      option.setName('video_id')
        .setDescription('Select a video')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName('channel')
        .setDescription('Channel to post (optional)')
        .setRequired(false)
        .setAutocomplete(true)
    ),
  
  new SlashCommandBuilder()
    .setName('publish')
    .setDescription('Publish a video')
    .addStringOption(option =>
      option.setName('video_id')
        .setDescription('Select a video')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  
  new SlashCommandBuilder()
    .setName('unpublish')
    .setDescription('Unpublish a video')
    .addStringOption(option =>
      option.setName('video_id')
        .setDescription('Select a video')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  
  new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete a video permanently')
    .addStringOption(option =>
      option.setName('video_id')
        .setDescription('Select a video')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  
  new SlashCommandBuilder()
    .setName('toggle')
    .setDescription('Ban or activate a member')
    .addStringOption(option =>
      option.setName('discord_id')
        .setDescription('Discord ID of the member')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action to perform')
        .setRequired(true)
        .addChoices(
          { name: '🚫 Ban', value: 'ban' },
          { name: '✅ Activate', value: 'activate' }
        )
    ),
  
  new SlashCommandBuilder()
    .setName('sessions')
    .setDescription('Get last 10 sessions for a member')
    .addStringOption(option =>
      option.setName('discord_id')
        .setDescription('Discord ID of the member')
        .setRequired(true)
    )
].map(command => command.toJSON());

// Handle interactions
client.on('interactionCreate', async interaction => {
  if (interaction.isAutocomplete()) {
    const focusedOption = interaction.options.getFocused(true);
    
    // Handle channel autocomplete
    if (focusedOption.name === 'channel') {
      try {
        const ALLOWED_CATEGORY_ID = '931989735742775356';
        const guild = interaction.guild;
        const channels = guild.channels.cache
          .filter(channel => 
            channel.type === 0 && // Text channels only
            channel.parentId === ALLOWED_CATEGORY_ID
          )
          .map(channel => ({
            name: channel.name,
            value: channel.id
          }))
          .slice(0, 25); // Discord limit

        await safeAutocompleteRespond(interaction, channels);
      } catch (error) {
        console.error('Channel autocomplete error:', error);
        await safeAutocompleteRespond(interaction, []);
      }
      return;
    }
    
    // Handle video_id autocomplete
    if (interaction.commandName === 'post' || interaction.commandName === 'publish' || 
        interaction.commandName === 'unpublish' || interaction.commandName === 'delete') {
      try {
        const videos = await getRecentVideos();
        const filteredVideos = interaction.commandName === 'post' 
          ? videos.filter(v => v.is_published) 
          : videos;
        
        const choices = filteredVideos.map(video => {
          const status = video.is_published ? '✅' : '📦';
          const seasonDay = video.season && video.day ? `S${video.season}D${video.day}` : '';
          return {
            name: `${status} ${video.title} ${seasonDay}`.substring(0, 100),
            value: video.id
          };
        });

        await safeAutocompleteRespond(interaction, choices);
      } catch (error) {
        console.error('Autocomplete error:', error);
        await safeAutocompleteRespond(interaction, []);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  if (!interaction.inGuild()) {
    return interaction.reply({ content: '❌ Guild only!', ephemeral: true });
  }

  // Check if user has Administrator permission or "Under Sheriff" role
  const ALLOWED_ROLE_ID = '789747360351387648'; // Under Sheriff role
  const hasAdminPermission = interaction.member.permissions.has('Administrator');
  const hasAllowedRole = interaction.member.roles.cache.has(ALLOWED_ROLE_ID);
  
  if (!hasAdminPermission && !hasAllowedRole) {
    return interaction.reply({ content: '❌ Admin only!', ephemeral: true });
  }

  try {
    switch (interaction.commandName) {
      case 'post': await handlePostCommand(interaction); break;
      case 'publish': await handlePublishCommand(interaction); break;
      case 'unpublish': await handleUnpublishCommand(interaction); break;
      case 'delete': await handleDeleteCommand(interaction); break;
      case 'toggle': await handleToggleCommand(interaction); break;
      case 'sessions': await handleSessionsCommand(interaction); break;
      default:
        await interaction.reply({ content: '❌ Unknown command!', ephemeral: true });
    }
  } catch (error) {
    console.error('Command error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
    }
  }
});

client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log('📡 Setting up realtime subscriptions...');
  
  await loadNotificationSettings();
  
  // Prime publish-state cache to reduce false publish/unpublish notifications.
  try {
    const { data: videos } = await supabase
      .from('videos')
      .select('id, is_published')
      .order('created_at', { ascending: false })
      .limit(200);
    (videos || []).forEach(v => {
      if (v?.id) videoPublishState.set(v.id, !!v.is_published);
    });
  } catch (e) {
    // ignore
  }

  setupRealtimeSubscriptions();
  
  const guildId = await resolveGuildIdFromSettings();
  if (!guildId) {
    console.warn('⚠️ DISCORD_GUILD_ID is not set (and not found in settings.discord_guild_ids).');
    console.warn('⚠️ Bot will run for realtime notifications, but slash commands will NOT be registered.');
  } else {
    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    try {
      console.log('🔄 Registering slash commands...');
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
        { body: commands }
      );
      console.log('✅ Slash commands registered!');
    } catch (error) {
      console.error('❌ Error registering commands:', error);
    }
  }
  
  console.log('\n📋 Notification Channels:');
  console.log(`   Uploads: ${notificationChannels.uploads || '❌ Not configured'}`);
  console.log(`   Security: ${notificationChannels.security || '❌ Not configured'}`);
  console.log(`   Sessions: ${notificationChannels.sessions || '❌ Not configured'}`);
  console.log('\n✅ Bot is ready!\n');
});

client.login(process.env.DISCORD_BOT_TOKEN);
