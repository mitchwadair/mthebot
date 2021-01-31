<p align="center">
    <a href="https://bot.mtheb.tv">
        <img src='./assets/logo_text.png' width='200px' alt="MtheBot_ Logo"/>
    </a>
    </br></br>
    <a href="LICENSE"><img src='https://img.shields.io/apm/l/atomic-design-ui.svg' alt="license"></a>
    <a href="https://github.com/mitchwadair/mthebot/pulls"><img src='https://img.shields.io/badge/PRs-welcome-brightgreen.svg' alt="contribute"></a>
    <img src="https://github.com/mitchwadair/mthebot/workflows/CodeQL/badge.svg?branch=master" alt="codeql"/>
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

# What is MtheBot_?
MtheBot_ is an open-source project by [Mitchell Adair](https://github.com/mitchwadair), aiming to build an easy-to-use chat bot for Twitch.  Chat bots on Twitch help to provide a rewarding and engaging experience for a broadcaster's viewers. In order to provide such an experience, often times a broadcaster must do a lot of additional work and research to allow for complicated commands to work in their chat. The goal of MtheBot_ is to minimize the amount of extra work a broadcaster must to in order to provide their chat with an enjoyable experience.  The project started as a way to make a uniquely customizable bot for my own [Twitch channel](https://www.twitch.tv/mtheb). I quickly realized that I could generalize the bot and make it available for other people to use as well.

# How can I support MtheBot_?
MtheBot_ is currently a one-man operation.  Because of this, I incur numerous monthly costs associated with keeping the bot running, which I currently pay out of pocket.  These costs include domain registration and maintenance, server architechture, and more.  If you would like to help keep MtheBot_ running, you could consider supporting the project on [GitHub Sponsors](https://github.com/sponsors/mitchwadair) or giving a one-time donation through [PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=9WS3KJPAV8JDJ&currency_code=USD). Anything is appreciated and will directly help the efforts being made not only to maintain MtheBot_, but also to allow me to dedicate more time to improving the bot and it's features.

<p align="center">
    <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=9WS3KJPAV8JDJ&currency_code=USD">
        <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" height="75px" alt="PayPal Logo">
    </a>
    &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp
    <a href="https://github.com/sponsors/mitchwadair">
        <img src="https://github.githubassets.com/images/modules/site/sponsors/logo-mona-2.svg" height="75px" alt="GH Sponsors">
    </a>
</p>

# MtheBot_'s Tech Stack
## The Bot Itself
<p align="center">
    <a href="https://tmijs.com/">
        <img src="https://avatars0.githubusercontent.com/u/17866914?s=200&v=4" height="75px" alt="tmi Logo"/>
    </a>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://tesjs.net/">
        <img src="https://github.com/mitchwadair/tesjs/raw/main/assets/tesjs_logo_stroke.png?raw=true" height="75px" alt="TES Logo"/>
    </a>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://www.mysql.com/">
        <img src="https://www.mysql.com/common/logos/powered-by-mysql-167x86.png" height="75px" alt="MySQL Logo"/>
    </a>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    <a href="https://expressjs.com/">
        <img src="https://expressjs.com/images/express-facebook-share.png" height="75px" alt="Express Logo"/>
    </a>
</p>

MtheBot_ is built using [tmi.js](https://tmijs.com/) and [TESjs](https://tesjs.net/).  The back-end is built using a [MySQL](https://www.mysql.com/) database and [Express](https://expressjs.com/) to host an API which serves the [MtheBot_ user portal](https://bot.mtheb.tv).

# Contribute
MtheBot_ is an open-source project and I welcome contributions to it!  I will do my best to review pull requests in a timely manner.  Documentation on getting started with developing for MtheBot_ as well as API reference can be found in the [doc](docs) section of this repository.
