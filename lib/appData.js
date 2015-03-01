var defaultServerOptions = {
  port: 5080,
  host: '127.0.0.1',
  path: '/',
  strict: true
};

var defaultClientOptions = {
  port: 80,
  host: '127.0.0.1',
  path: '/',
  strict: true
};

var rpcMethods = {
  'steam': [
    { method: 'getProperty' },
    { method: 'gamesPlayed' },
    { method: 'setPersonaName' },
    { method: 'setPersonaState' },
    { method: 'sendMessage' },
    { method: 'addFriend' },
    { method: 'removeFriend' },
    { method: 'joinChat' },
    { method: 'leaveChat' },
    { method: 'lockChat' },
    { method: 'unlockChat' },
    { method: 'setModerated' },
    { method: 'setUnmoderated' },
    { method: 'kick' },
    { method: 'ban' },
    { method: 'unban' },
    { method: 'chatInvite' },
    { method: 'getSteamLevel' },
    { method: 'requestFriendData' },
    { method: 'trade' },
    { method: 'respondToTrade' },
    { method: 'cancelTrade' },
    { method: 'toGC' }
  ],
  'trade': [
    { method: 'getProperty' },
    { method: 'loadInventory', callback: 2 },
    { method: 'getContexts', callback: 0 },
    { method: 'open', callback: 1 },
    { method: 'addItem', callback: 1 },
    { method: 'removeItem', callback: 1 },
    { method: 'ready', callback: 0 },
    { method: 'unready', callback: 0 },
    { method: 'confirm', callback: 0 },
    { method: 'cancel', callback: 0 },
    { method: 'chatMsg', callback: 1 }
  ],
  'tradeOffers': [
    { method: 'getProperty' },
    { method: 'loadMyInventory', callback: 1 },
    { method: 'loadPartnerInventory', callback: 1 },
    { method: 'makeOffer', callback: 1 },
    { method: 'getOffers', callback: 1 },
    { method: 'getOffer', callback: 1 },
    { method: 'declineOffer', callback: 1 },
    { method: 'acceptOffer', callback: 1 },
    { method: 'cancelOffer', callback: 1 },
    { method: 'getOfferToken', callback: 0 }
  ]
};
var rpcEvents = {
  'steam': [
    'chatInvite',
    'user',
    // 'richPresence',
    'relationships',
    'friend',
    'group',
    'friendMsg',
    'chatMsg',
    'chatStateChange',
    'tradeOffers',
    'tradeProposed',
    'tradeResult',
    'sessionStart',
    'announcement',
    'fromGC'
  ],
  'trade': [
    'end',
    'offerChanged',
    'ready',
    'unready',
    'chatMsg'
  ],
  'tradeOffers': []
};

module.exports = {
  rpcMethods: rpcMethods,
  rpcEvents: rpcEvents,
  defaultServerOptions: defaultServerOptions,
  defaultClientOptions: defaultClientOptions
};