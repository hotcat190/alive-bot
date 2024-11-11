import { enLink, jpLink, ANSWER_ID } from './constants.js';

async function createPoll(channel, pollDuration, rest) {
    try {
        // TODO: send lead-in video
        // await channel.send({

        // });

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

        setTimeout(async () => {
            await rest.post(`/channels/${channel.id}/polls/${message.id}/expire`);

            const botChoice = Math.random() < 0.5 ? 'en' : 'jp';
            const choiceId = botChoice === 'en' ? ANSWER_ID.EN : ANSWER_ID.JP;

            let users = [];
            try {
                const response = await rest.get(`/channels/${channel.id}/polls/${message.id}/answers/${choiceId}`);
                users = response.users;
            } catch (error) {
                console.error('Error retrieving users list:', error);
            }

            var correctGuessers = ""; 
                
            if (users !== undefined) {
                for (var i = 0; i < users.length; i++) {
                    if (i === users.length-1) {
                        correctGuessers += `${users[i].username}.`;
                    }
                    else correctGuessers += `${users[i].username}, `;
                }                   
                console.log(correctGuessers);
            }

            await channel.send({
                content: `The result was: **${botChoice}**.\n`
                    + ((correctGuessers === "") ? `No one got it right :jellycry:` : `Correct guessers: ${correctGuessers}`) + '\n'
                    + ((botChoice === 'en') ? enLink : jpLink),
            });

        }, pollDuration);

        return message;

    } catch (error) {
        console.error('Error sending poll message:', error);
    }
}

export default createPoll;
