const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';

const PERMISSION_INTEGER = 3148800;

const INVITE_URL = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${PERMISSION_INTEGER}&scope=bot%20applications.commands`;

console.log('Bot Invitation URL:');
console.log(INVITE_URL);
console.log('\nReplace YOUR_CLIENT_ID_HERE with your actual Discord application client ID');
console.log('Then share this URL with server owners to add your bot to their servers');
