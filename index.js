import dotenv from 'dotenv';

import { Client, GatewayIntentBits, Poll } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

dotenv.config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages
    ] 
});

// Register the /guess command
const commands = [
    {
        name: 'guess',
        description: 'Guess either "en" or "jp".',
        options: [
            {
                name: 'choice',
                type: 3, // STRING input
                description: 'Your guess (en or jp)',
                required: true,
            },
        ],
    },
    {
        name: 'create-poll',
        description: 'Create a poll for people to guess "en" or "jp".',
        options: [
            {
                name: 'duration',
                type: 3,
                description: 'The poll duration',
                required: true,
            },
        ],
    },
];

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

console.log('Attempting to register slash commands...');
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.log(error)
        console.error(error);
    }
})();

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options, channelId } = interaction;

    // Handle the /guess command
    if (commandName === 'guess') {
        const userGuess = options.getString('choice').toLowerCase();

        // Check if the user's guess is valid
        if (userGuess !== 'en' && userGuess !== 'jp') {
            await interaction.reply('Invalid guess! Please choose either "en" or "jp".');
            return;
        }

        // Randomly pick 'en' or 'jp' as the bot's choice
        const botChoice = Math.random() < 0.5 ? 'en' : 'jp';

        // Compare the user's guess with the bot's choice
        if (userGuess === botChoice) {
            await interaction.reply(`You guessed correctly! The result was: **${botChoice}**.`);
        } else {
            await interaction.reply(`You guessed wrong! The result was: **${botChoice}**.`);
        }
    }
    
    // Handle the /create-poll (Guessing game) command
    if (commandName === 'create-poll') {
        const question = interaction.options.getString('question');  // Get poll question
        const options = ['en', 'jp'];  // Set the options as 'en' and 'jp'
    
        // Build the poll message content
        let pollMessage = `**${question}**\n\n`;
        options.forEach((option, index) => {
          pollMessage += `${index + 1}. ${option}\n`;
        });
    
        // Send the poll message using the Create Message API
        try {
          const channel = interaction.channel;  // Get the channel where the command was used
    
          const msg = await channel.send({ content: pollMessage });  // Send the message to the channel
    
          // Add reactions for 'en' and 'jp' options
          const emojiArray = ['🇬🇧', '🇯🇵']; // Emojis for 'en' and 'jp'
          await msg.react(emojiArray[0]);  // Reaction for 'en'
          await msg.react(emojiArray[1]);  // Reaction for 'jp'
    
          // Set a timeout to close the poll after a certain time (e.g., 1 minute)
          const pollDuration = 60000;  // 60,000 ms = 1 minute (adjust as needed)
          setTimeout(async () => {
            const enVotes = msg.reactions.cache.get(emojiArray[0])?.count - 1 || 0;  // Subtract 1 for the bot's own reaction
            const jpVotes = msg.reactions.cache.get(emojiArray[1])?.count - 1 || 0;  // Subtract 1 for the bot's own reaction
    
            // Randomly select the result for the guessing game
            const randomChoice = Math.random() < 0.5 ? 'en' : 'jp';
    
            // Send the result message (poll closure)
            await interaction.followUp(`Poll closed! The correct answer was **${randomChoice}**.\n` +
              `Results:\n` +
              `🇬🇧 **en**: ${enVotes} votes\n` +
              `🇯🇵 **jp**: ${jpVotes} votes`);
    
            // Optionally delete the poll message after sending results
            await msg.delete();
          }, pollDuration);
    
        } catch (error) {
          console.error('Error sending poll message:', error);
          await interaction.reply('There was an error creating the poll!');
        }
      }
});

client.login(process.env.TOKEN);
