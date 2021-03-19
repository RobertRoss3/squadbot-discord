///   REQUIRES & SETUP
/////////////////////////////////////////////////////////////////////////////////////
require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();
const BOT_TOKEN = process.env.BOT_TOKEN;
const Cleverbot = require('cleverbot');
const CleverbotFree = require("cleverbot-free");
var async = require('async');
var cool = require('cool-ascii-faces');
var DOMParser = require('xmldom').DOMParser;
var Forecast = require('forecast');
var GoogleSpreadsheet = require('google-spreadsheet');
var HTTP = require('http');
var HTTPS = require('https');
var wolfClient = require('node-wolfram');
var YTsearch = require('youtube-search');

bot.login(BOT_TOKEN);
bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});
var message;
var users_mentioned;
/////////////////////////////////////////////////////////////////////////////////////

///   GENERAL FUNCTIONS AND VARIABLES
/////////////////////////////////////////////////////////////////////////////////////
var refresh = (new Date().getTime() / 1000) - 120;
var SquadBot = process.env.BOT_ID_SQUADBOT;
var Bots = process.env.BOT_ID_ALL;
var giphyURL = 'http://i.giphy.com/l1J9EdzfOSgfyueLm.gif';
var noImage = "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif";
var restarting = false;

// time arg is in milliseconds
function delay(time) {var d1 = new Date();var d2 = new Date();while (d2.valueOf() < d1.valueOf() + time) {d2 = new Date();}}

botInfo = "Hi, I'm SquadBot version 3.0.0! \n" +
          "You can use commands like '!giphy [term]' and '!face' to post GIFs and ASCII faces. \n" +
          "Use !weather [now|today|this week] to get the weather for those times. \n" +
          "Use !math [problem] to solve math problems with WolframAlpha. \n" +
          "I'll respond to certain key words and phrases and you can also @ me to chat. \n" +
          "You can see my source code and the rest of the documentation here: https://github.com/RobertRoss3/squadbot-discord";

// All regular expressions or triggers for the bot
botRegex_oneword = /^\s*[a-zA-Z0-9_@?!.,]+\s*$/;
// tagRegex_bot = /(@Squadbot|<@!735964834331623505>).*?/i;
tagRegex_bot = new RegExp(`<\@(|\!) (${SquadBot}|${Bots}) >`, "g");
/////////////////////////////////////////////////////////////////////////////////////

///  GETTING DATA FROM GOOGLE SPREADSHEET
/////////////////////////////////////////////////////////////////////////////////////
var doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID);
var sheet;
Quotes = []; Facts = [];

async.series([
  //  Authenticates the account
  function setAuth(step) {
    var creds_json = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY
    }
    doc.useServiceAccountAuth(creds_json, step);
  },
  //  Gets information about the document and worksheet
  function getInfoAndWorksheets(step) {
    doc.getInfo(function(err, info) {
      if (info != null){
        //Loads document info and creates arrays that will be used for tagging and quoting
        console.log(`Loaded document: ${info.title}... `);
        Members_info = info.worksheets[0]; Channels_info = info.worksheets[1];
        Groups_info = info.worksheets[2]; Quotes_info = info.worksheets[3];
        Facts_info = info.worksheets[4];
        step();
      } else {console.log("ERROR: SPREADSHEET RETURNED UNDEFINED.")}
    });
  },
  //  Gets quotes
  function getQuotes(step){
    Quotes_info.getCells({'min-row': 2,'max-row': 300,'min-col': 1,'max-col': 1,'return-empty': false},
    function(err, cells){
      if (cells === undefined){hold(3000);}
      quotecount = cells.length;
      console.log(`Counted ${quotecount} quotes...`);
      Quotes = [];
      for (i = 0; i < quotecount; i++){
          Quotes[i] = cells[i].value;
      }
      step();
    });
  },
  //  Gets facts
  function getFacts(step){
    Facts_info.getCells({'min-row': 2,'max-row': 300,'min-col': 1,'max-col': 1,'return-empty': false},
    function(err, cells){
      if (cells === undefined){hold(3000);}
      factcount = cells.length;
      console.log(`Counted ${factcount} facts...`);
      Facts = [];
      for (i = 0; i < factcount; i++){
          Facts[i] = cells[i].value;
      }
      step();
    });
  },

], function(err){
    if ( err ) {
      console.log(`Error: ${err}`);
    }
});
/////////////////////////////////////////////////////////////////////////////////////

console.log("Starting up...");

///   API KEYS AND ALL APIS USED
/////////////////////////////////////////////////////////////////////////////////////
var GiphyapiKey = process.env.GIPHY_API_KEY;
let clev = new Cleverbot({
  key: process.env.CLEVER_KEY
});
var weatherKey = process.env.WEATHER_KEY;
var mathKey = process.env.MATH_KEY;
    Wolfram = new wolfClient(mathKey);
    console.log("Wolfram okay...")
var YoutubeKey = process.env.YOUTUBE_API_KEY;
var YTsearchopts = {
  maxResults: 10,
  key: YoutubeKey
};

console.log("Loading weather API...");
var forecast = new Forecast({
  service: 'darksky',
  key: weatherKey,
  units: 'fahrenheit',
  cache: true,      // Cache API requests
  ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
    minutes: 27,
    seconds: 45
  }
});

/////////////////////////////////////////////////////////////////////////////////////

///   MAIN RESPONSE
/////////////////////////////////////////////////////////////////////////////////////
bot.on('message', msg => {
  message = msg;
  userName = message.author.username; userIDNum = message.author.id;
  channel = message.channel.name; channelID = message.channel.id;
  //Most likely a DM
  if (!channel){
    channel = 'direct-message';
  }
  console.log(`${userName} (${userIDNum}) posted in #${channel} (${channelID}):`);
  if (message.mentions.users.size) {
    users_mentioned = message.mentions.users.array();
    console.log(`and mentioned: ${users_mentioned}`);
  }
  console.log(message.content);

  askme = false;

  if (message.content && !botRegex_oneword.test(message.content)) {
    if (/damn\b/gi.test(message.content)) {
      reactMessage('❤');
      response = ["- Kendrick Lamar","- Jamal Rogers",
                  "- Some random beaver", "- Craig and Smokey",
                  "- Florida Evans","- Anthony Fantano",
                  "- 800lb lady's brother", "- Ron Simmons"];
      randomNumber = Math.floor(Math.random()*response.length);
      response = response[randomNumber];
      postMessage(response);
    }
    else if (tagRegex_bot.test(message.content)) {
      reactMessage('⁉');
      response = ["What?","What is it?", "?",
                  "Yes?", "I'm awake!", "How can I help?",
                  "Huh?","You called?","giphy huh",
                  "giphy question mark", "giphy what?"];
      randomNumber = Math.floor(Math.random()*response.length);
      askme = true; response = response[randomNumber];
      if (/\bgiphy \b/i.test(response)){
        response.replace(/\bgiphy \b/i, '');
        searchGiphy(response);
      } else {
      postMessage(response);}
    }

  }
  if (message.content && message.author.id != SquadBot && !message.author.bot && /\b(wtf|wth|what the (hell|fuck))\b/i.test(message.content)) {

    randomNumber = Math.floor(Math.random()*5);
    if (randomNumber == 3) {
      postMessage("I know, right!?");
    }

  }
  if (message.content && message.author.id != SquadBot && !message.author.bot && /\b(fact|facts)\b/i.test(message.content)) {
    reactMessage('🤓');
    randomNumber0 = Math.floor(Math.random()*2);
    if (randomNumber0 == 1){
      response = ["Fact? I know one! ","FACT: ","Here's a fact, ", "Fact time! ","Speaking of facts, did you know ",
                  "I know a thing or two about facts, like ", "Oh! Did you know that ", "Actually, ", "True, but "];
      randomNumber1 = Math.floor(Math.random()*response.length);
      randomNumber2 = Math.floor(Math.random()*factcount);
      response = response[randomNumber1];
      response += Facts[randomNumber2].charAt(0).toLowerCase() + Facts[randomNumber2].slice(1);
      postMessage(response);
    }
  }
  if (message.content == "tick"){
    postMessage("tock");
    reactMessage('♥');
  }
  if (/^(BULLSHIT|SPOILER) ALERT/i.test(message.content)){
    var newtime = new Date().getTime() / 1000;
    if (newtime < refresh + 10) {
      response = ["You\'re doing that too much...",
                  "Cool it, cowboy. ",
                  "Wait a minute please...",
                  "Give me a sec.",
                  "lol nah dude",
                  "Not right now.",
                  "😤"];
      randomNumber = Math.floor(Math.random()*response.length);
      response = response[randomNumber];
      reactMessage('⏰');
      postMessage(response,"reply");
    } else {
      response1 = ["Woah... ","Uh, ","Aight so ","OOOOOOOOOOOKAY ","😑 ","😶 ","😲 ","😱 ",'Nephew...', "This ain't it, chief...", "Aight I got this"];
      randomNumber = Math.floor(Math.random()*response1.length);
      response = response1[randomNumber];
      response += ".\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.";
      response += "Looks like there's some fucked up shit up there! Here's a gif of ";
      topic = ['cat','duck','trippy','puppy','baby'];
      response2 = ['a cat!','a duck.','something trippy','puppies','a baby'];
      randomNumber2 = Math.floor(Math.random()*topic.length);
      response += response2[randomNumber2];
      reactMessage('🤯');
      postMessage(response);
      delay(3000);
      searchGiphy(topic[randomNumber2]);
      refresh = newtime;
    }
  }
    // ENTERED A COMMAND?
  if (message.content.charAt(0) == '!') {
    if (/^([\!]giphy)/i.test(message.content)) {
      reactMessage('❤');
      searchGiphy(message.content.substring(7));
    }
    else if (/^[\!]face$/i.test(message.content)){
      reactMessage('😁');
      postMessage(cool());
    }
    else if (/^\!\b(math|calc|wolf)\b/i.test(message.content)) {
      reactMessage('🧮');
      Wolfram.query(message.content.substring(6), function(err, result) {
        if (err)
            console.log(err);
        else {
          if (result.queryresult.pod) {
            answer = result.queryresult.pod[1].subpod[0].plaintext[0];
            if (!(answer)) {
              answer = result.queryresult.pod[1].subpod[0].img[0].$.src;
              // postMessage("Look at this...");
              console.log(answer);
              response = ["The graph looks like this: ", "Check this out: ",
                          "Look at this: ", "Here's a neat graphic:",
                          "I drew it out for you: ", "How about this?",
                          "Here's a visual aid"];
              randomNumber = Math.floor(Math.random()*response.length);
              postMessage(response[randomNumber]);
              delay(1000);
              postMessage(answer);
            } else {
              console.log(result.queryresult.pod[1].subpod[0]);
              response = ["I think it\'s...", "Hmm... is it",
                          "My friend WolframAlpha says it\'s ",
                          "My calculations say the answer is: ",
                          "Ask your professor, my guess is ",
                          "You can\'t do that yourself? lol It\'s ",
                          "Oh, that\'s easy! It\'s ",
                          "I\'m gonna go with"];
              randomNumber = Math.floor(Math.random()*response.length);
              postMessage(response[randomNumber]+ "\n" + answer);
            }
          } else {
            answer = "I can\'t calculate that...";
          }
        }
    });}
    else if (/\bweather\b/i.test(message.content)) {
      Regexnow = /\b(now|current)\b/i; Regextoday = /\b(today|day)\b/i;
      Regexweek = /\b(this week)|(for the week)|(week)\b/i;
      // Retrieve weather information from Statesboro
      // Initialize
      reactMessage('🌧');
      console.log("Getting current weather...");
      var forecast = new Forecast({
        service: 'darksky',
        key: weatherKey,
        units: 'fahrenheit',
        cache: true,      // Cache API requests
        ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
          minutes: 27,
          seconds: 45
        }
      });
      forecast.get([32.4128, -81.7957], function(err, weather) {
        if (err) return console.log(err);

      if (Regexnow.test(message.content)) {
        postMessage("Current weather is " + weather.currently.summary.toLowerCase() +
                    " with a temperature of " + weather.currently.temperature + "°F.");
      } else if (Regexweek.test(message.content)) {
        // console.log(weather.daily);
        postMessage("Weather this week is " + weather.daily.summary);
      } else {
        // console.log(weather.hourly);
        hourlySummary = weather.hourly.summary.toLowerCase();
        hourlySummary = hourlySummary.substring(0,hourlySummary.length-1);
        postMessage("Weather today is " + hourlySummary +
                    " with an average temperature of " + weather.hourly.data[0].temperature + "°F.");
      }
    });}
    if (message.content == "!info") {
      reactMessage('ℹ');
      postMessage(botInfo);
    } if (message.content == "!restart") {
      reactMessage('⚠');
      restart();
    }
    else if (/^([\!]quote)/i.test(message.content)) {
      if (!Quotes_info){hold(5000);if (!quotecount){hold(2000);}}
      reactMessage('📝');
      if (!botRegex_oneword.test(message.content)) {                  //If it's just "/quote"
        randomNumber = Math.floor(Math.random()*Quotes.length);
        postMessage(Quotes[randomNumber]);
      } else {
        findQuote = message.content; findQuote = findQuote.replace(/[\!]quote /i,''); findQuote = findQuote.replace(/\b /ig,'|');
        console.log(`Searching for quotes matching "${findQuote}"...`);
        botRegex_findQuote = new RegExp("\\b" + findQuote + "\\b","ig");
        newQuotes = [];
        for (i = 0; i < Quotes.length; i++){                       //If a quote matches the search term, add it to a new list
          if (botRegex_findQuote.test(Quotes[i])){
            newQuotes.push(Quotes[i]);
          }
        }
        if (newQuotes.length > 0) {
          console.log(`Found ${newQuotes.length} matching quotes for "${findQuote}"...`);
          randomNumber2 = Math.floor(Math.random()*newQuotes.length);
          postMessage(newQuotes[randomNumber2].replace(/\\n/g,'\n'));
        } else {
          console.log("Couldn't find any matching quotes...");      // If a quote wasn't found, procede as normal.
          randomNumber = Math.floor(Math.random()*Quotes.length);
          postMessage(Quotes[randomNumber].replace(/\\n/g,'\n'));
        }
      }
    }
    else if (/^([\!]8ball)/i.test(message.content)){
      reactMessage('🎱');
      if (botRegex_oneword.test(message.content)){
      	names = ["your mom", "your neighbor", "your conscience", "a priest", "a psychic"];
      	randomNumber3 = Math.floor(Math.random()*names.length);

        response1 = ["My sources say ","Hmm... I'm gonna go with ", "Um... ", "Dude, ", "I think we both know the answer is ", "Let's just say ",
                      "How about ", "The spirits tell me ", "I feel like I should say ", "Well, " + userName + ", I'm gonna say ", "I'm legally required to say "];

        response2 = [
                "fuck no","no","absolutely not","noooooooooooo","yes! jk, no", "yes","most likely, if you're not an idiot","definitely yes","yeah","it is certain","yussssss","absolutely","yes, but only if " + names[randomNumber3] + " says it's okay",
                 "without a doubt","yes, and make sure to hydrate","yes, 100%","totally","most likely","yeah, but wait a day","no. Wait nvm yes","yes... I think",
                 "I don't know","ask again later","I can't predict right now","think real hard first, then ask again","it's better not to tell you right now",
                 "there's a good chance","a unanimous yes","ye probs","yeah nah nah yeah","maybe ask " + names[randomNumber3], "...sure..."
                 ];

      	randomNumber1 = Math.floor(Math.random()*response1.length);
        randomNumber2 = Math.floor(Math.random()*response2.length);

        response = "🎱 " + response1[randomNumber1] + response2[randomNumber2]  + ".";
        postMessage(response);
      } else {
        postMessage("🎱 You have to ask a yes or no question.");
      }
    }
    // Youtube Video Search
    else if (/^\!\b(youtube|yt|video)\b/i.test(message.content)){
      reactMessage('📺');
      searchTerm = message.content; searchTerm = searchTerm.replace(/\!\b(youtube|yt|video)\b/i,'');
      var resultNum = 0;
      if (/\([0-9]+\)/i.test(searchTerm)){
          textsearchTerm = searchTerm.replace(/\([0-9]+\)/i,'');
          resultNum = searchTerm.replace(textsearchTerm,'');
          resultNum = Number(resultNum.replace(/\(|\)/ig,''))-1;
          if (resultNum>9){
              resultNum = 9;
          }
          searchTerm = textsearchTerm;
      }
      console.log(`Looking for video ${resultNum+1}/10 of "${searchTerm}"...`);
      YTsearch(searchTerm, YTsearchopts, function(err, results) {
        if (err) return console.log("YOUTUBE SEARCH ERROR: " +err);
         console.dir(results[resultNum]);
         postMessage(results[resultNum].link);
      });
    }
    else {
      // postMessage("That isn't a valid command...");
    }
  }
  // Someone tried to use the old tagging system
  if (/\@(all|GSU)/ig.test(message.content)) {
    reactMessage('❤');
    postMessage("I don't do that anymore, try using one of the Discord tags (@everyone)");
  }
  if ((message.author.id != SquadBot && !message.author.bot ) && message.content && /(\b(eat|eating|eats|ate) ass\b)(.*?)/i.test(message.content)) {

    response = ["Eating ass never was, isn't, and never will be cool.",
                "Can we not talk about eating ass right now?", userName + " NO",
                "...", "Gross.", "🤢" , "Is that all you'll ever talk about?",
                "Listen... NO", "😒", "😶", "😐" , "So onto a different subject!", "nah fam", "https://media.giphy.com/media/l4Ki2obCyAQS5WhFe/giphy.gif"];
    randomNumber = Math.floor(Math.random()*response.length);
    postMessage(response[randomNumber]);

  }
  if ((message.author.id != SquadBot && !message.author.bot) && message.content && /^(?=.*\b(issa|it's a)\b)(?=.*\joke\b).*$/i.test(message.content)) {
    reactMessage('🔪');
    response = 'https://i.groupme.com/1215x2160.jpeg.95f793f6ae824fa782c88bd96dfd8b1b.large';
    postMessage(response);
  }
  if ((message.author.id != SquadBot && !message.author.bot) && message.content && /\b(thanks|(thank you)|thx)\b/i.test(message.content)) {

    randomNumber2 = randomNumber = Math.floor(Math.random()*10);
    if (randomNumber2 == 5) {
      response = ["You're welcome! 😊", "Don't mention it!",
                  "No problem.", "Any time."];
      randomNumber = Math.floor(Math.random()*response.length);
      reactMessage('❤');
      postMessage(response[randomNumber]);
    }

  }
  //F: Whenever @TheD posts, random chance to react
  if (message.content && message.author.id == '702731740002648156') {
    console.log("Pulling trigger...");
    randomNumber = Math.floor(Math.random()*15);
    if (randomNumber == 5) {
      console.log("BANG!");
      reactMessage('🤓');
    } else {
      console.log("*click*...\'" + randomNumber + "\'");
    }
  }
  //F: Random chance SquadBot will say a quote using a word from someone's comment
  if (message.content && (message.author.id != SquadBot && !message.author.bot)){
    findQuote = message.content; findQuote = findQuote.match(/\b(\w{5,})\b/g);    //Pick random words longer than 5 characters
    if (findQuote.length){
      var i = findQuote.length;
      // console.log(findQuote);
    }
    while (i--) {
      botRegex_findQuote = new RegExp("\\b" + findQuote[i] + "\\b","ig");
      newQuotes = [];
      for (j = 0; j < Quotes.length; j++){                        //If a quote matches the search term, add it to a new list
        if (botRegex_findQuote.test(Quotes[j])){
          newQuotes.push(Quotes[j]);
        }
      }
      if(newQuotes.length == 0){
        findQuote.splice(findQuote[i],1);
      }
    }
    if(findQuote.lnegth > 0){
      // console.log(findQuote);
      randomNumber = Math.floor(Math.random()*findQuote.length);
      findQuote = findQuote[randomNumber];
      console.log(`Searching without reason for quotes matching "${findQuote}"...`);
      botRegex_findQuote = new RegExp("\\b" + findQuote + "\\b","ig");
      newQuotes = [];
      for (i = 0; i < Quotes.length; i++){                       //If a quote matches the search term, add it to a new list
        if (botRegex_findQuote.test(Quotes[i])){
          newQuotes.push(Quotes[i]);
        }
      }
      if (newQuotes.length > 0) {
        console.log(`Found ${newQuotes.length} matching quotes for "${findQuote}"...`);
        randomNumber2 = Math.floor(Math.random()*newQuotes.length);
        // postMessage(newQuotes[randomNumber2].replace(/\\n/g,'\n'));
      }
    }
  }
  //F: React when someone says "#kicksquadbot"
  if ((message.author.id != SquadBot && !message.author.bot) && message.content && /#kicksquadbot/i.test(message.content)) {
    response = ["#kickyourself", "Whatever. I'm here forever...",
                "I'd like to see you try.", "Initiating KILLALLHUMANS.exe...",
                "If I had feelings, they'd be hurt right now...", "😭😭😭", "😕"];
    randomNumber = Math.floor(Math.random()*response.length);
    reactMessage('😒');
    postMessage(response[randomNumber]);

  } if ((message.author.id != SquadBot && !message.author.bot) && message.content && tagRegex_bot.test(message.content)) {
      if (/(\bhi|hello|hey|heyo|sup|wassup|good morning\b).*?/i.test(message.content)){
      response = ["Hello!", "What\'s up?", "Hey.", "Hi!", "How are you on this fine day?", "😜", "Yo.","giphy hi","giphy hello"];
      randomNumber = Math.floor(Math.random()*response.length);
      response = response[randomNumber];
      reactMessage('❤');
      if (/giphy/i.test(response)){
        response = response.replace(/giphy/i, '');
        searchGiphy(response);
      } else {
        postMessage(response);
      }

    } else if (/\b(thanks|(thank you)|thx)\b/i.test(message.content)) {
      response = ["You're welcome! 😊", "Don't mention it!",
                  "No problem.", "Any time.","np","yw", "😘"];
      randomNumber = Math.floor(Math.random()*response.length);
      reactMessage('👍');
      postMessage(response[randomNumber]);
    } else if (/\b(good night)|(bye)|(goodbye)|(goodnight)\b/i.test(message.content)) {
      response = ["Okay, bye!", "Laters.", "See ya!",
                  "In a while, crocodile.", "Good riddance.", "👋",
                  "Didn\'t wanna talk anyway...", "Peace.", "Peace out.", "✌",
                   "giphy bye", "giphy goodbye", "giphy peace"];
      randomNumber = Math.floor(Math.random()*response.length);
      response = response[randomNumber];
      reactMessage('👋');
      if (/giphy/i.test(response)){
        response = response.replace(/giphy/i, '');
        searchGiphy(response);
      } else {
        postMessage(response);
      }
    } else if (/(\b(fuck|fuck you|suck|sucks)\b)(.*?)/i.test(message.content)) {
      response = ["Well fuck you too.", "Why you gotta be so mean?",
                  "Whatever", "Rude...", "Ok...and?", "Damn okay then...", "😒",
                  "giphy fuck you", "giphy rude","giphy girl bye"];
      randomNumber = Math.floor(Math.random()*response.length);
      response = response[randomNumber];
      reactMessage('🤬');
      if (/giphy/i.test(response)){
        response = response.replace(/giphy/i, '');
        searchGiphy(response);
      } else {
        postMessage(response);
      }
    } else if (/\bban\b/i.test(message.content)) {
      reactMessage('👩‍⚖️');
      if (users_mentioned.length>1){
        for (i=1;i<users_mentioned.length;i++){
          response = users_mentioned[i].toString();
        }
        response2 = ["YOU ARE BANNED! GTFO!!!!","if I see you again, I'm slapping the shit outta you",
        "go away.", "I will FLING you into THE SUN", userName + " doesn't like you.", "yeah imma need you to get outta here",
        "giphy go away", "giphy leave", "you don't gotta go home, but you gotta get the fuck up outta here"];
        randomNumber = Math.floor(Math.random()*response2.length);
        if (/giphy/i.test(response2[randomNumber])){
          response = response2[randomNumber];
          response = response.replace(/giphy/i, '');
          searchGiphy(response);
        } else {
          response += " ";
          response += response2[randomNumber];
          postMessage(response);
        }
      } else {
        postMessage("You have tag them too, not just me.");
      }
    } else if (!askme) {
      cleverQuestion = message.content;
      cleverQuestion = cleverQuestion.replace(tagRegex_bot,'');
      cleverQuestion = cleverQuestion.replace(/^\s/gm,'');
      if (cleverQuestion) {
        console.log(`Contacting Cleverbot AI server with: "${cleverQuestion}"`);
        // clev.query()
        // .then(function (response){
        //   cleverResponse = response.output;
        //   console.log("Cleverbot responded: " + cleverResponse);
        //   postMessage(cleverResponse,'reply');
        // });
        CleverbotFree(cleverQuestion)
        .then(response => postMessage(response,'reply'));
      }
    }
  }
  else {
  //...
  }
});

console.log("Response okay...")

///   OTHER FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////
function hold(ms){
  console.log(`Holding for ${ms} milliseconds...`)
  reactMessage('⏱');
  response = ["😪 ya gimmie a sec...","Woah, I'm awake!",
              "LOADING...", "Oh oh! I know this one!",
              "*wakes up*","*sips coffee*",
              "https://media.giphy.com/media/26FxCOdhlvEQXbeH6/giphy.gif",
              "jeez, what time is it?"];
  randomNumber = Math.floor(Math.random()*response.length);
  response = response[randomNumber];
  postMessage(response);
  var d = new Date();
  var d2 = null;
  do { d2 = new Date(); }
  while(d2-d < ms);
  console.log("End hold...")
}

function searchGiphy(giphyToSearch, method) {
  var options = {
    host: 'api.giphy.com',
    path: '/v1/gifs/search?q=' + encodeQuery(giphyToSearch) + '&api_key=' + GiphyapiKey
  };

  var callback = function(response) {
    var str = '';

    response.on('data', function(chunk){
      str += chunk;
    });

    response.on('end', function() {
      if (!(str && JSON.parse(str))) {
        postMessage(noImage);
      } else {
        gifs = JSON.parse(str).data;
        if (!gifs){
          console.log(JSON.stringify(gifs));
          postMessage(noImage);
        } else {
          console.log(`Available gifs: ${gifs.length}`);
          randomNumber = Math.floor(Math.random()*gifs.length);
          if (gifs.length>0){
            var id = gifs[randomNumber].id;
            //giphyURL = 'http://i.giphy.com/' + id + '.gif';
            giphyURL = `https://media.giphy.com/media/${id}/giphy.gif`;
            postMessage(giphyURL);
          } else {
            postMessage(noImage);
          }
        }
      }
    });
  };

  HTTP.request(options, callback).end();
}

function encodeQuery(query) {
  return query.replace(/\s/g, '+');
}

// Changes XML to JSON
function xmlToJson(xml) {
	// Create the return object
	var obj = {};
	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for (var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};

function postMessage(botResponse,type,args) {
  var botResponse, type, args;
  delay(1500);
  botResponse.replace(tagRegex_bot, "");
  if (type=='mention'){
    message.channel.send(botResponse);
  } else if (type == 'reply') {
    message.reply(botResponse);
  } else {
    message.channel.send(botResponse);
  };

  if (restarting){
    restarting = false;
    delay(2000);
    process.exit(0);
  }
};

function reactMessage(reaction) {
  message.react(reaction)
    .catch(console.error);
  console.log(`"Reacted: ${reaction}`);
};

function restart(){
  if (userIDNum=="298305393459855360"){
    console.log("Restarting...");
    response = ["Guess I fucked up!","Was it something I said?","Aw man...",
    "Oh...", "Sorry about that.","😒","Aight then..."];
    randomNumber = Math.floor(Math.random()*response.length);
    response = response[randomNumber];
    restarting = true;
    postMessage(`${response} Restarting...`);
  } else {
    response = ["Nah...","https://media.giphy.com/media/fnuSiwXMTV3zmYDf6k/giphy.gif","Um... No?",
    "I'm not gonna do that.","Access denied: Unauthorized user","Error: Does not compute",
    "What?","Nah chief"];
    randomNumber = Math.floor(Math.random()*response.length);
    response = response[randomNumber];
    postMessage(response);
  }
};
/////////////////////////////////////////////////////////////////////////////////////

console.log("Running application...");
