import { enLink, jpLink, ANSWER_ID } from './constants.js';

async function createPoll(channel, pollDuration, rest) {
    try {
        const message = await channel.send({
            poll: {
                question: { text: "en or jp" },
                answers: [
                    { text: "en" },
                    { text: "jp" },
                ],
                allow_multiselect: false,
            },
        });

        const HOUR_TO_MS = 60 * 60 * 1000;

        setTimeout(async () => {
            rest.post(`/channels/${channel.id}/polls/${message.id}/expire`);

            const botChoice = Math.random() < 0.5 ? 'en' : 'jp';
            const choiceId = botChoice === 'en' ? ANSWER_ID.EN : ANSWER_ID.JP;

            let users = [];
            try {
                const response = await rest.get(`/channels/${channel.id}/polls/${message.id}/answers/${choiceId}`);
                users = response.users;
            } catch (error) {
                console.error('Error retrieving users list:', error);
            }

            const correctGuessers = users.map(user => user.username).join(', ') || 'No one got it right :jellycry:';

            await channel.send({
                content: `The result was: **${botChoice}**.\nCorrect guessers :jellythumbsup:: ${correctGuessers}\n${botChoice === 'en' ? enLink : jpLink}`,
            });

        }, pollDuration * HOUR_TO_MS);

    } catch (error) {
        console.error('Error sending poll message:', error);
    }
}

export default createPoll;
