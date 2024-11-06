import dotenv from 'dotenv';

import { Client, GatewayIntentBits, Poll } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { SlashCommandBuilder } from '@discordjs/builders';

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
    new SlashCommandBuilder()
        .setName('guess')
        .setDescription('Guess the result of the game!')
        .addStringOption(
            option => option
                .setName('choice')
                .setDescription('Your guess (en or jp)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('create-poll')
        .setDescription('Create a poll for users to vote.')
        .addIntegerOption(
            option => option
                .setName('duration')
                .setDescription('Duration of the poll in seconds')
                .setRequired(true)
        ),
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
        const duration = interaction.options.getInteger('duration');  // Get poll duration in seconds
        const pollDuration = Math.max(duration, 10) * 1000;  // Ensure it's at least 10 seconds (in milliseconds)

        const question = "en or jp";  // Fixed question for the guessing game
        const options = ['en', 'jp'];  // Set the options as 'en' and 'jp'

        // Build the poll message content
        let pollMessage = `**${question}**\n\n`;
        options.forEach((option, index) => {
            pollMessage += `${index + 1}. ${option}\n`;
        });

        // Send the poll message using the Create Message API
        try {
            const channel = interaction.channel;  // Get the channel where the command was used

            // Reply to the interaction immediately
            await interaction.reply({ content: 'Creating the poll...', ephemeral: true });

            const msg = await channel.send({ content: pollMessage });  // Send the message to the channel

            // Add reactions for 'en' and 'jp' options
            const emojiArray = ['🇬🇧', '🇯🇵']; // Emojis for 'en' and 'jp'
            await msg.react(emojiArray[0]);  // Reaction for 'en'
            await msg.react(emojiArray[1]);  // Reaction for 'jp'

            // Set a timeout to close the poll after the user-specified time
            setTimeout(async () => {
                const enVotes = msg.reactions.cache.get(emojiArray[0])?.count - 1 || 0;  // Subtract 1 for the bot's own reaction
                const jpVotes = msg.reactions.cache.get(emojiArray[1])?.count - 1 || 0;  // Subtract 1 for the bot's own reaction

                // Randomly select the result for the guessing game
                const randomChoice = Math.random() < 0.5 ? 'en' : 'jp';

                // Send the result message (poll closure)
                await interaction.followUp(
                    `Poll closed! The correct answer was **${randomChoice}**.\n` +
                    `Results:\n` +
                    `🇬🇧 **en**: ${enVotes} votes\n` +
                    `🇯🇵 **jp**: ${jpVotes} votes`
                );
            }, pollDuration);
        } catch (error) {
            console.error('Error sending poll message:', error);
            await interaction.reply('There was an error creating the poll!');
        }
    }
});

client.login(process.env.TOKEN);
