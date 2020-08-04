# MtheBot_ API Documentation
Here you can find detailed API documentation for all of the public and private endpoints served by MtheBot_

# Contents
- [Public](#public-endpoints)
  - [Users](#users)
  - [Contact](#contact)
- [Private](#private-endpoints)
  - [Auth](#auth)
  - [Chats](#chats)
  - [Commands](#commands)
  - [Events](#events)
  - [Init](#init)
  - [Timers](#timers)
  
# Public Endpoints
Public endpoints are accessible from any source, without authentication.

## Users
Retrieve the number of users being serviced by MtheBot_
### GET /users
#### Query Parameters
`json` Pass this if a JSON response is desired (used for the README badges)
#### Response
##### Basic `/users`
```json
3
```
##### With `/users?json`
```json
{
    "schemaVersion": 1,
    "label": "users",
    "message": 3,
    "color": "blue"
}
```

## Contact
Submit a contact ticket for MtheBot_
### POST /contact
#### Request Parameters
```json
{
  "type": "Feedback",
  "subject": "Awesome Bot!",
  "email": "mitch@mtheb.tv",
  "name": "Mitch",
  "message": "This is a really cool project!"
}
```
**type** - *string* - the type of contact being made `['General', 'Help', 'Bug Report', 'Suggestion', 'Feedback']`  
**subject** - *string* - the subject of the message  
**email** - *string* - the email for responses to be sent to  
**name** - *string* - the name of the person sending the message  
**message** - *string* - the content of the contact message  
#### Response
*200 OK*
```
contact sent sucessfully
```

# Private Endpoints
Private endpoints require the caller to be authenticated with Twitch

## Auth
Used to update auth tokens on user authentication with Twitch.  This is how API requests are verified.
### POST /auth/{channelID}
#### Request Parameters
```json
{
  "token": "0123456789abcdefghijABCDEFGHIJ"
}
```
**token** - *string* - the user access token returned from Twitch authentication
#### Response
*200 OK*  
*400 Bad Request*  
*500 Internal Server Error*  

## Chats
Get or update the status of MtheBot_ for a given channel id
### GET /chats/{channelID}
Get the status of MtheBot_ for the channel
#### Response
*200 OK*  
MtheBot_ is enabled
```
1
```
MtheBot_ is disabled
```
0
```
### POST /chats/{channelID}
Enable MtheBot_ in the channel
#### Response
*200 OK*  
```
Bot set to enabled for channel channelID
```
### DELETE /chats/{channelID}
Disable MtheBot_ in the channel
#### Response
*200 OK*  
```
Bot set to disabled for channel channelID
```

## Commands
Get or update commands for a given channel id
### The Command Object
All request and response bodies will come in the form of the command object
```json
{
  "alias": "myCommand",
  "message": "this is a command message",
  "cooldown": 5,
  "user_level": 0
}
```
**alias** - *string* - the alias of the command (automatically prefixed by `!` for use in chat)  
**message** - *string* - the message to be sent by the bot when the command is used  
**cooldown** - *int* - the cooldown time between uses in seconds  
**user_level** - *int* - the enumerated user level at which the command can be used `{user: 0, vip: 1, subscriber: 2, moderator: 3, global_mod: 3, broadcaster: 3}`  
### GET /commands/{channelID}
Get a list of all commands for the channel
#### Response
*200 OK*  
```json
[
  {
    "alias": "myCommand",
    "message": "this is a command message",
    "cooldown": 5,
    "user_level": 0
  },
  {
    "alias": "subs",
    "message": "I currently have {{subcount}} subs",
    "cooldown": 5,
    "user_level": 0
  }
]
```
### GET /commands/{channelID}/{alias}
Gets the command with the given alias for the channel
#### Response
*200 OK*  
```json
{
  "alias": "myCommand",
  "message": "this is a command message",
  "cooldown": 5,
  "user_level": 0
}
```
*404 Not Found*  
```
Command alias not found for channel channelID
```
### POST /commands/{channelID}
Creates a new command for the channel
#### Request Body
```json
{
  "alias": "myCommand",
  "message": "this is a command message",
  "cooldown": 5,
  "user_level": 0
}
```
#### Response
The server will respond with the created command, which should be the same as the data provided
*200 OK*  
```json
{
  "alias": "myCommand",
  "message": "this is a command message",
  "cooldown": 5,
  "user_level": 0
}
```
### PUT /commands/{channelID}/{alias}
Update an existing command for the channel
#### Request Body
```json
{
  "alias": "myCommand",
  "message": "this is an updated command message",
  "cooldown": 5,
  "user_level": 0
}
```
#### Response
The server will respond with the updated command, which should be the same as the data provided
*200 OK*  
```json
{
  "alias": "myCommand",
  "message": "this is an updated command message",
  "cooldown": 5,
  "user_level": 0
}
```
*404 Not Found*  
```
Command alias not found for channel channelID
```
### DELETE /commands/{channelID}/{alias}
Removes the command from the channel
#### Response
*200 OK*  
*404 Not Found*  

## Events
Get or update events for a given channel id
### The Event Object
All request and response bodies will come in the form of the event object
```json
{
  "name": "sub",
  "message": "{{user}} just subbed with a {{type}} sub!",
  "enabled": true,
}
```
**name** - *string* - the name of the event
**message** - *string* - the message to be sent by the bot when the event happens  
**enabled** - *boolean* - whether or not the event is being handled by MtheBot_
### GET /events/{channelID}
Get a list of all events for the channel
#### Response
*200 OK*  
```json
[
  {
      "name": "sub",
      "message": "{{user}} just subbed with a {{type}} sub!",
      "enabled": true
  },
  {
      "name": "host",
      "message": "{{user}} hosted for {{viewers}} viewers!",
      "enabled": true
  },
  {
      "name": "raid",
      "message": "{{user}} raided for {{viewers}} viewers!",
      "enabled": true
  },
  {
      "name": "cheer",
      "message": "{{user}} just cheered {{amount}} bits!",
      "enabled": true
  },
  {
      "name": "resub",
      "message": "{{user}} resubbed for {{months}} months!",
      "enabled": true
  },
  {
      "name": "subgift",
      "message": "{{user}} gifted {{recipient}} a sub!",
      "enabled": true
  },
  {
      "name": "giftupgrade",
      "message": "{{user}} upgraded their gifted sub from {{gifter}}!",
      "enabled": true
  },
  {
      "name": "mysterygift",
      "message": "{{user}} gifted {{count}} subs!",
      "enabled": true
  },
  {
      "name": "anongiftupgrade",
      "message": "{{user}} upgraded their gifted sub!",
      "enabled": true
  }
]
```
### GET /events/{channelID}/{name}
Gets the event with the given name for the channel
#### Response
*200 OK*  
```json
{
  "name": "sub",
  "message": "{{user}} just subbed with a {{type}} sub!",
  "enabled": true
}
```
*404 Not Found*  
```
Event name not found for channel channelID
```
### PUT /events/{channelID}/{name}
Update an event for the channel
#### Request Body
```json
{
  "enabled": false,
  "message": "{{user}} just subbed with a {{type}} sub!",
}
```
#### Response
The server will respond with the updated event data, which should be the same as the data provided
*200 OK*  
```json
{
  "name": "sub",
  "message": "{{user}} just subbed with a {{type}} sub!",
  "enabled": false
}
```
*404 Not Found*  
```
Event name not found for channel channelID
```

## Init

## Timers
