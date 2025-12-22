require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

// Helper function to format duration
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper function to get last 10 videos
async function getRecentVideos() {
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, is_published, created_at, season, day')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
  
  return videos || [];
}

// Helper function to convert overtime_type code to full text
function getOvertimeText(overtimeType) {
  switch (overtimeType) {
    case 'last_hit':
      return 'went overtime from last day';
    case 'previous_day':
      return 'from previous day';
    default:
      return overtimeType;
  }
}

// Command: Publish Video
async function publishVideo(interaction) {
  const videoId = interaction.options.getString('video_id');
  
  try {
    // Get video details
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      return interaction.reply({ 
        content: '❌ Video not found!', 
        ephemeral: true 
      });
    }

    if (video.is_published) {
      return interaction.reply({ 
        content: '⚠️ This video is already published!', 
        ephemeral: true 
      });
    }

    // Publish the video
    const { error: updateError } = await supabase
      .from('videos')
      .update({ is_published: true })
      .eq('id', videoId);

    if (updateError) {
      throw updateError;
    }

    // Create success embed
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Video Published Successfully')
      .setDescription(`**${video.title}**`)
      .addFields(
        { name: 'Video ID', value: videoId, inline: true },
        { name: 'Uploader', value: video.uploader_name || 'Unknown', inline: true },
        { name: 'Season', value: video.season || 'N/A', inline: true },
        { name: 'Day', value: video.day || 'N/A', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error publishing video:', error);
    await interaction.reply({ 
      content: '❌ Failed to publish video. Please try again.', 
      ephemeral: true 
    });
  }
}

// Command: Unpublish Video
async function unpublishVideo(interaction) {
  const videoId = interaction.options.getString('video_id');
  
  try {
    // Get video details
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      return interaction.reply({ 
        content: '❌ Video not found!', 
        ephemeral: true 
      });
    }

    if (!video.is_published) {
      return interaction.reply({ 
        content: '⚠️ This video is already unpublished!', 
        ephemeral: true 
      });
    }

    // Unpublish the video
    const { error: updateError } = await supabase
      .from('videos')
      .update({ is_published: false })
      .eq('id', videoId);

    if (updateError) {
      throw updateError;
    }

    // Create success embed
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('📦 Video Unpublished Successfully')
      .setDescription(`**${video.title}**`)
      .addFields(
        { name: 'Video ID', value: videoId, inline: true },
        { name: 'Uploader', value: video.uploader_name || 'Unknown', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error unpublishing video:', error);
    await interaction.reply({ 
      content: '❌ Failed to unpublish video. Please try again.', 
      ephemeral: true 
    });
  }
}

// Command: Delete Video
async function deleteVideo(interaction) {
  const videoId = interaction.options.getString('video_id');
  
  try {
    // Get video details before deletion
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      return interaction.reply({ 
        content: '❌ Video not found!', 
        ephemeral: true 
      });
    }

    // Reply immediately to avoid timeout
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('⏳ Deleting Video...')
      .setDescription(`**${video.title}**\n\nPlease wait while the video is being deleted from Cloudflare Stream and database...`)
      .addFields(
        { name: 'Video ID', value: videoId, inline: true },
        { name: 'Uploader', value: video.uploader_name || 'Unknown', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Delete from database only
    // Note: Cloudflare Stream deletion is handled by the website
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (deleteError) {
      throw deleteError;
    }

    // Update with success message
    const successEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Video Deleted Successfully')
      .setDescription(`**${video.title}**`)
      .addFields(
        { name: 'Video ID', value: videoId, inline: true },
        { name: 'Uploader', value: video.uploader_name || 'Unknown', inline: true },
        { name: 'Status', value: video.is_published ? 'Was Published' : 'Was Unpublished', inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });

  } catch (error) {
    console.error('Error deleting video:', error);
    
    // Try to edit the reply if already replied
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ 
        content: '❌ Failed to delete video. Please try again.',
        embeds: []
      });
    } else {
      await interaction.reply({ 
        content: '❌ Failed to delete video. Please try again.', 
        ephemeral: true 
      });
    }
  }
}

// Command: Post Video Announcement
async function postVideo(interaction) {
  const videoId = interaction.options.getString('video_id');
  const channel = interaction.options.getChannel('channel') || interaction.channel;
  
  try {
    // Get video details
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      return interaction.reply({ 
        content: '❌ Video not found!', 
        ephemeral: true 
      });
    }

    // Build video details text with bold formatting for variable data
    let detailsText = '';
    
    // Main line with wins/attacks and time
    if (video.wins_attacks && video.arena_time) {
      let mainLine = `**${video.wins_attacks}** within **${video.arena_time} minutes**`;
      
      // Add optional info in parentheses
      if (video.shield_hits && video.overtime_type && video.overtime_type !== 'none') {
        const overtimeText = getOvertimeText(video.overtime_type);
        mainLine += ` (**${video.shield_hits}** which **${overtimeText}**)`;
      } else if (video.shield_hits) {
        mainLine += ` (**${video.shield_hits}**)`;
      } else if (video.overtime_type && video.overtime_type !== 'none') {
        const overtimeText = getOvertimeText(video.overtime_type);
        mainLine += ` (**${overtimeText}**)`;
      }
      
      detailsText += mainLine + '\n\n';
    } else if (video.wins_attacks) {
      detailsText += `**${video.wins_attacks}**\n\n`;
    } else if (video.arena_time) {
      detailsText += `**${video.arena_time} minutes**\n\n`;
    }
    
    if (video.start_rank && video.end_rank) {
      detailsText += `Started at **${video.start_rank}** and ended up at **${video.end_rank}**.\n\n`;
    } else if (video.start_rank) {
      detailsText += `Started at **${video.start_rank}**.\n\n`;
    } else if (video.end_rank) {
      detailsText += `Ended at **${video.end_rank}**.\n\n`;
    }
    
    if (video.has_commentary) {
      detailsText += '• **with** commentary';
    } else {
      detailsText += '• **without** commentary';
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle(video.title.toUpperCase())
      .setDescription(detailsText || 'New video available!')
      .setFooter({ text: 'Click the button below - Discord login required' })
      .setTimestamp();

    // Create button with video link
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('➜ Click Here')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://arena.regulators.us/watch/${videoId}`)
      );

    // Send to selected channel
    await channel.send({ 
      embeds: [embed],
      components: [row]
    });
    
    // Reply to user privately that post was sent
    await interaction.reply({
      content: `✅ Video post sent successfully to ${channel.name}!`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Error posting video:', error);
    await interaction.reply({ 
      content: '❌ Failed to post video. Please try again.', 
      ephemeral: true 
    });
  }
}

// Command: Toggle Member Status (Ban/Unban)
async function toggleMember(interaction) {
  const discordId = interaction.options.getString('discord_id');
  const action = interaction.options.getString('action');
  
  try {
    // Get member info
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('discord_username, game_id, is_active')
      .eq('discord_id', discordId)
      .single();

    if (memberError || !member) {
      return interaction.reply({ 
        content: '❌ Member not found!', 
        ephemeral: true 
      });
    }

    const newStatus = action === 'ban' ? false : true;
    
    // Check if already in that state
    if (member.is_active === newStatus) {
      const statusText = newStatus ? 'already active' : 'already banned';
      return interaction.reply({ 
        content: `⚠️ Member is ${statusText}!`, 
        ephemeral: true 
      });
    }

    // Update member status
    const { error: updateError } = await supabase
      .from('members')
      .update({ is_active: newStatus })
      .eq('discord_id', discordId);

    if (updateError) {
      throw updateError;
    }

    // Create success embed
    const memberName = member.discord_username || member.game_id;
    const statusEmoji = newStatus ? '✅' : '🚫';
    const statusText = newStatus ? 'Activated' : 'Banned';
    const statusColor = newStatus ? 0x00FF00 : 0xFF0000;

    const embed = new EmbedBuilder()
      .setColor(statusColor)
      .setTitle(`${statusEmoji} Member ${statusText}`)
      .setDescription(`**${memberName}**`)
      .addFields(
        { name: 'Discord ID', value: discordId, inline: true },
        { name: 'New Status', value: newStatus ? 'Active' : 'Banned', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error toggling member:', error);
    await interaction.reply({ 
      content: '❌ Failed to update member status. Please try again.', 
      ephemeral: true 
    });
  }
}

// Command: Get Member Sessions
async function getMemberSessions(interaction) {
  const discordId = interaction.options.getString('discord_id');
  
  try {
    // Get member info
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('discord_username, game_id, discord_avatar')
      .eq('discord_id', discordId)
      .single();

    if (memberError || !member) {
      return interaction.reply({ 
        content: '❌ Member not found!', 
        ephemeral: true 
      });
    }

    // Get last 10 sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('view_sessions')
      .select('*, videos(title)')
      .eq('discord_id', discordId)
      .order('started_at', { ascending: false })
      .limit(10);

    if (sessionsError) {
      throw sessionsError;
    }

    if (!sessions || sessions.length === 0) {
      return interaction.reply({ 
        content: '⚠️ No sessions found for this member.', 
        ephemeral: true 
      });
    }

    // Create embed
    const memberName = member.discord_username || member.game_id;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 Last 10 Sessions - ${memberName}`)
      .setDescription(`Discord ID: \`${discordId}\``)
      .setThumbnail(member.discord_avatar || null)
      .setTimestamp();

    // Add sessions as fields
    sessions.forEach((session, index) => {
      const videoTitle = session.videos?.title || 'Unknown Video';
      const duration = formatDuration(session.watch_seconds);
      const date = formatDate(session.started_at);
      const country = session.country || 'Unknown';
      
      embed.addFields({
        name: `${index + 1}. ${videoTitle}`,
        value: `⏱️ ${duration} | 🌍 ${country} | 📅 ${date}`,
        inline: false
      });
    });

    // Add summary
    const totalWatchTime = sessions.reduce((sum, s) => sum + (s.watch_seconds || 0), 0);
    embed.addFields({
      name: '📈 Summary',
      value: `Total Sessions: ${sessions.length}\nTotal Watch Time: ${formatDuration(totalWatchTime)}`,
      inline: false
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    await interaction.reply({ 
      content: '❌ Failed to fetch sessions. Please try again.', 
      ephemeral: true 
    });
  }
}

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('publish')
    .setDescription('Publish a video')
    .addStringOption(option =>
      option.setName('video_id')
        .setDescription('Select a video to publish')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  
  new SlashCommandBuilder()
    .setName('unpublish')
    .setDescription('Unpublish a video')
    .addStringOption(option =>
      option.setName('video_id')
        .setDescription('Select a video to unpublish')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  
  new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete a video permanently')
    .addStringOption(option =>
      option.setName('video_id')
        .setDescription('Select a video to delete')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  
  new SlashCommandBuilder()
    .setName('post')
    .setDescription('Post a video announcement with details')
    .addStringOption(option =>
      option.setName('video_id')
        .setDescription('Select a video to post')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send post (optional, defaults to current channel)')
        .setRequired(false)
    ),
  
  new SlashCommandBuilder()
    .setName('toggle')
    .setDescription('Ban or activate a member')
    .addStringOption(option =>
      option.setName('discord_id')
        .setDescription('The Discord ID of the member')
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
    .setDescription('Get last 10 login sessions for a member')
    .addStringOption(option =>
      option.setName('discord_id')
        .setDescription('The Discord ID of the member')
        .setRequired(true)
    )
].map(command => command.toJSON());

// Handle autocomplete interactions
client.on('interactionCreate', async interaction => {
  if (interaction.isAutocomplete()) {
    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name === 'video_id') {
      try {
        const videos = await getRecentVideos();
        
        // Filter published videos only for 'post' command
        const filteredVideos = interaction.commandName === 'post' 
          ? videos.filter(video => video.is_published) 
          : videos;
        
        const choices = filteredVideos.map(video => {
          const status = video.is_published ? '✅' : '📦';
          const seasonDay = video.season && video.day ? `S${video.season}D${video.day}` : '';
          const label = `${status} ${video.title} ${seasonDay}`.substring(0, 100);
          
          return {
            name: label,
            value: video.id
          };
        });
        
        await interaction.respond(choices);
      } catch (error) {
        console.error('Error in autocomplete:', error);
        await interaction.respond([]);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  // Check if user has admin permissions
  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({ 
      content: '❌ You need Administrator permissions to use this command!', 
      ephemeral: true 
    });
  }

  try {
    switch (interaction.commandName) {
      case 'publish':
        await publishVideo(interaction);
        break;
      case 'unpublish':
        await unpublishVideo(interaction);
        break;
      case 'delete':
        await deleteVideo(interaction);
        break;
      case 'post':
        await postVideo(interaction);
        break;
      case 'toggle':
        await toggleMember(interaction);
        break;
      case 'sessions':
        await getMemberSessions(interaction);
        break;
      default:
        await interaction.reply({ 
          content: '❌ Unknown command!', 
          ephemeral: true 
        });
    }
  } catch (error) {
    console.error('Error handling command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: '❌ An error occurred while processing your command.', 
        ephemeral: true 
      });
    }
  }
});

// Bot ready event
client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  
  // Register commands
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  
  try {
    console.log('🔄 Registering slash commands...');
    
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );
    
    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);
