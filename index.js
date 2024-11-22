import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { SwitchboardProgram, AggregatorAccount } from '@switchboard-xyz/solana.js';
import notifier from 'node-notifier';

const feeds = [
  {
    name: 'mangoSOL',
    address: new PublicKey('HGUNiSELMtGPCqF24RyWESYk5G8e1EDzKizWNcjWixYr'),
  },
  {
    name: 'hubSOL',
    address: new PublicKey('8PiaGPHUm6Qprivc2e1cUq4Y1bMsjfVLjmKdyQkErp7s'),
  },
];

const connection = new Connection(clusterApiUrl('mainnet-beta'));

async function main() {
  const program = await SwitchboardProgram.load(connection);

  async function getFeedLastUpdateDate(feedAddress) {
    // Load the aggregator account
    const aggregatorAccount = new AggregatorAccount(program, feedAddress);

    const aggregatorState = await aggregatorAccount.loadData();

    // Get the last update timestamp
    const lastUpdateTimestamp = aggregatorState.latestConfirmedRound.roundOpenTimestamp.toNumber();

    // Convert timestamp to human-readable date
    return new Date(lastUpdateTimestamp * 1000);
  }

  // Function to check feeds
  async function checkFeeds() {
    console.log(new Date().toISOString() + ' - Checking feeds...');

    for (const feed of feeds) {
      try {
        const dateNow = Date.now()
        const lastUpdateDate = await getFeedLastUpdateDate(feed.address);
        console.log(`${feed.name} last updated at ${lastUpdateDate.toISOString()}`);

        const twoMinutesAgo = new Date(dateNow - 1000 * 60 * 2);
        // We only need it to peep once (or twice) at the start of the 2 minute window
        const twoMinutesAgoPlus25seconds = new Date(dateNow - 1000 * 60 * 2 + 1000 * 25);

        if (lastUpdateDate > twoMinutesAgo && lastUpdateDate < twoMinutesAgoPlus25seconds) {
          const timeElapsed = Math.floor((dateNow - lastUpdateDate.getTime()) / 1000);
          const timeRemaining = 120 - timeElapsed;

          // Send a notification
          notifier.notify({
            title: 'Switchboard Notification',
            message: `${feed.name} has been updated! You have ${timeRemaining} seconds to act.`,
            sound: true, // Play system sound with notification
          });
        }
      } catch (error) {
        console.error(`Error checking feed ${feed.name}:`, error.message);
      }
    }

    console.log()
  }

  // Run the checkFeeds function every 10 seconds
  setInterval(checkFeeds, 10000);
}

main().catch(console.error);
