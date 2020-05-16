<p align="center">
    <a href="https://bot.mtheb.tv">
        <img src='./assets/logo_text.png' width='300px' height='360px'/>
    </a>
    </br></br>
    <a href="LICENSE"><img src='https://img.shields.io/apm/l/atomic-design-ui.svg' alt="license"></a>
    <a href="https://github.com/mitchwadair/mthebot/pulls"><img src='https://img.shields.io/badge/PRs-welcome-brightgreen.svg' alt="contribute"></a>
    <a href="https://github.com/mitchwadair/mthebot/releases">
        <img src='https://img.shields.io/github/release/mitchwadair/mthebot.svg' alt="release">
    </a>
    <a href="https://api.bot.mtheb.tv/users"><img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fapi.bot.mtheb.tv%2Fusers%3Fjson" alt="users"/></a>
</p>

# Contents
- [What is MtheBot_?](#what-is-mthebot_)
- [How Can I Support MtheBot_?](#how-can-i-support-mthebot_)
- [MtheBot_'s Tech Stack](#mthebot_s-tech-stack)
  - [The Bot Itself](#the-bot-itself)
  - [The Web Application](#the-web-application)
- [Contribute](#contribute)
  - [Setup](#setup)
    - [Project Environment](#project-environment)
    - [Database](#database)

# What is MtheBot_?
MtheBot_ is an open-source project by [Mitchell Adair](https://github.com/mitchwadair), aiming to build an easy-to-use chat bot for Twitch.  Chat bots on Twitch help to provide a rewarding and engaging experience for a broadcaster's viewers. In order to provide such an experience, often times a broadcaster must do a lot of additional work and research to allow for complicated commands to work in their chat. The goal of MtheBot_ is to minimize the amount of extra work a broadcaster must to in order to provide their chat with an enjoyable experience.  The project started as a way to make a uniquely customizable bot for my own [Twitch channel](https://www.twitch.tv/mtheb). I quickly realized that I could generalize the bot and make it available for other people to use as well.

# How can I support MtheBot_?
MtheBot_ is currently a one-man operation.  Because of this, I incur numerous monthly costs associated with keeping the bot running, which I currently pay out of pocket.  These costs include domain registration and maintenance, server architechture, and more.  If you would like to help keep MtheBot_ running, you could consider supporting the project on [Patreon](https://www.patreon.com/mitchdev). Anything is appreciated and will directly help the efforts being made not only to maintain MtheBot_, but also to allow me to dedicate more time to improving the bot and it's features.

# MtheBot_'s Tech Stack
## The Bot Itself
<p align="center">
    <a href="https://tmijs.com/">
        <img src="https://avatars0.githubusercontent.com/u/17866914?s=200&v=4" height="100px"/>
    </a>
    &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp
    <a href="https://aws.amazon.com/elasticbeanstalk/">
        <img src="https://d1.awsstatic.com/icons/console_elasticbeanstalk_icon.0f7eb0140e1ef6c718d3f806beb7183d06756901.png" height="100px"/>
    </a>
    &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp
    <a href="https://www.mysql.com/">
        <img src="https://www.mysql.com/common/logos/powered-by-mysql-167x86.png" height="100px"/>
    </a>
    &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp
    <img src="./assets/logo.png" height="100px"/>
</p>

MtheBot_ is built using [tmi.js](https://github.com/tmijs/tmi.js).  The back-end is built using a custom API server which hosts both a private API used by the front-end as well as a public API for general data (used in the "users" tag on this repo for example).  The bot's back end is run through [AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/) and uses a [MySQL](https://www.mysql.com/) database attached to the EB environment.
## The Web Application
<p align="center">
    <a href="https://vuejs.org/">
        <img src="https://vuejs.org/images/logo.png" height="100px"/>
    </a>
    &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp
    <a href="https://vuetifyjs.com/">
        <img src="https://cdn.vuetifyjs.com/images/logos/vuetify-logo-light.png" height="100px"/>
    </a>
</p>

MtheBot_ was a learning opportunity for me. At work, I use React so I took this opportunity to learn a new front-end framework. So, as a result, I went with [Vue](https://vuejs.org/).  In addition to Vue, I utilized the [Vuetify](https://vuetifyjs.com/) design library to make the application pretty.

# Contribute
MtheBot_ is an open-source project.  I welcome contributions to the project!  I will do my best to review pull requests in a timely manner.
## Setup
### Project Environment
In order to get the bot up and running, you must set up the environment.  Fork/clone the repo to your system to get started.  
First, make sure you have installed all of the required modules:
```sh
npm install
```
Next, you need to create a `.env` file in the root directory.  The file should have the following properties:
```
BOT_USERNAME=<the username associated with your bot>
OAUTH_TOKEN=<the OAuth token for your account https://twitchapps.com/tmi/>
CLIENT_ID=<your Twitch app id (get from https://dev.twitch.tv/console)>
RDS_HOSTNAME=<the database host>
RDS_USERNAME=<the db username>
RDS_PASSWORD=<the db password>
RDS_PORT=<the db port>
RDS_DB_NAME=<the db name>
GMAIL_USERNAME=<the gmail account you wish to recieve contact emails at>
GMAIL_PASSWORD=<gmail application password generated from gmail settings>
```
### Database
First, you must set up a [MySQL](https://www.mysql.com/) database for MtheBot_ to retrieve data from.  There is a specific structure needed for your database to work correctly.  In order to initialize your DB with the correct structure, run this SQL query:
```sql
CREATE TABLE channels (
    name varchar(51),
    enabled tinyint(1),
    commands json,
    events json,
    timers json
);
```
To create a new table entry to test with, you can make a call to the `init` API when running the bot.  To do this, I recommend using the [Postman](https://www.postman.com/) collections which can be found in the [API Server/Postman Collections](API%20Server/Postman%20Collections) folder of this repository.  If you'd rather not use Postman, you can run the following curl command:
```sh
curl -X POST localhost:8080/init/<desiredChannelName>
```
Both of these methods will generate a new entry in the database for you to work with.
