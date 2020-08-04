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
**type** - *string* - the type of contact being made one of: `['General', 'Help', 'Bug Report', 'Suggestion', 'Feedback']`  
**subject** - *string* - the subject of the message  
**email** - *string* - the email for responses to be sent to  
**name** - *string* - the name of the person sending the message  
**message** - *string* - the content of the contact message  
#### Reponse
*200 OK*
```
contact sent sucessfully
```

# Private Endpoints
Private endpoints require the caller to be authenticated with Twitch

## Auth

## Chats

## Commands

## Events

## Init

## Timers
