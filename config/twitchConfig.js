var twitchConfig = {
    'validateToken': 'https://id.twitch.tv/oauth2/validate',
    'getTokenForChannel': 'https://id.twitch.tv/oauth2/token?client_id=',
    'getAppAccessToken': 'https://id.twitch.tv/oauth2/token?client_id=',
    'getUser': 'https://api.twitch.tv/helix/users?login=',
    'getBatchUsersByID': 'https://api.twitch.tv/helix/users?',
    'getFollow': 'https://api.twitch.tv/helix/users/follows?from_id=',
    'getSubCount': 'https://api.twitch.tv/helix/subscriptions?broadcaster_id=',
    'getStreamData': 'https://api.twitch.tv/helix/streams?user_login=',
    'getGameName': 'https://api.twitch.tv/helix/games?id='
}

module.exports = [twitchConfig]