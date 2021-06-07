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

function randomNumber(n=10){return Math.floor(Math.random()*n);}
function randomChance(n=1){return Math.floor(Math.random()*n) == 0;}

botInfo = "Hi, I'm SquadBot version 3.0.0! \n" +
          "You can use commands like '!giphy [term]' and '!face' to post GIFs and ASCII faces. \n" +
          "Use !math [problem] to solve math problems with WolframAlpha. \n" +
          "I'll respond to certain key words and phrases and you can also @ me to chat. \n" +
          "You can see my source code and the rest of the documentation here: https://github.com/RobertRoss3/squadbot-discord";

// All regular expressions or triggers for the bot
botRegex_oneword = /^\s*[a-zA-Z0-9_@?!.,<>]+\s*$/;
tagRegex_bot = new RegExp("<(@!|@)(" + SquadBot + "|" + Bots + ")>", "g");
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
var mathKey = process.env.MATH_KEY;
    Wolfram = new wolfClient(mathKey);
    console.log("Wolfram okay...")
var YoutubeKey = process.env.YOUTUBE_API_KEY;
var YTsearchopts = {
  maxResults: 10,
  key: YoutubeKey
};

/////////////////////////////////////////////////////////////////////////////////////

///   MAIN RESPONSE
/////////////////////////////////////////////////////////////////////////////////////
bot.on('message', msg => {
  message = msg;
  userName = message.author.username; userIDNum = message.author.id;
  channel = message.channel.name; channelID = message.channel.id;
  messageContent = message.content;
  //Most likely a DM
  if (!channel){
    channel = "direct-message";
  }
  // console.log(`${userName} (${userIDNum}) posted in #${channel} (${channelID}):`);
  console.log(`${userName} posted in #${channel}:`);
  if (message.mentions.users.size) {
    users_mentioned = message.mentions.users.array();
    console.log(`and mentioned: ${users_mentioned}`);
  }
  console.log(messageContent);

  if (messageContent && userIDNum != SquadBot) {
    ////START OF COMPULSORY FUNCTIONS
    ///These functions run regardless of message content

    //F: Random chance SquadBot will say a quote using a word from someone's comment
    findQuote = messageContent.match(/\b(\w{5,})\b/g);    //Pick random words longer than 5 characters
    if (findQuote){
      for (i = 0; i < findQuote.length; i++) {
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
      if(findQuote.length > 0){
        // console.log(findQuote);
        findQuote = findQuote[randomNumber(findQuote.length)];
        botRegex_findQuote = new RegExp("\\b" + findQuote + "\\b","ig");
        newQuotes = [];
        for (i = 0; i < Quotes.length; i++){                       //If a quote matches the search term, add it to a new list
          if (botRegex_findQuote.test(Quotes[i])){
            newQuotes.push(Quotes[i]);
          }
        }
        if (newQuotes.length > 0 && randomChance(25)) {
          console.log(`Quoting without reason "${findQuote}"...`);
          postMessage(newQuotes[randomNumber(newQuotes.length)]);
        }
      }
    }

    //F: Random chance CleverBot will respond to someone's message, or respond to a DM
    if(randomChance(1000000) || channel == "direct-message"){
      askCleverbot();
    }

    ////START OF MAIN PASSIVE FUNCTIONS
    ///These functions run if the user messages a trigger without directly invoking the bot

    //RESPONSES TO ONE WORD
    if (botRegex_oneword.test(messageContent)) {
      if (/damn/i.test(messageContent)) {
        reactMessage(['♥']);
        response = ["- Kendrick Lamar","- Jamal Rogers",
                    "- Some random beaver", "- Craig and Smokey",
                    "- Florida Evans","- Anthony Fantano",
                    "- 800lb lady's brother", "- Ron Simmons"];
        postMessage(response[randomNumber(response.length)]);
      }
      else if (tagRegex_bot.test(messageContent)) {
        reactMessage(['⁉']);
        response = ["What?","What is it?", "?",
                    "Yes?", "I'm awake!", "How can I help?",
                    "Huh?","You called?","giphy huh",
                    "giphy question mark", "giphy what?"];
        response = response[randomNumber(response.length)];
        if (/\bgiphy \b/i.test(response)){
          response.replace(/\bgiphy \b/i, '');
          searchGiphy(response);
        } else {
        postMessage(response);}
      }
      else if(/tick/.test(messageContent)){
        postMessage("tock");
        reactMessage(['♥','⏰','🕰','⏲']);
      }
    }

    //OTHER RESPONSES
    if (/\b(wtf|wth|what the (hell|fuck))\b/i.test(messageContent)) {
      if (randomChance(2)) {
        postMessage("I know, right!?");
      }
    }
    if (/\b(fact|facts)\b/i.test(messageContent)) {
      reactMessage(['🤓','🧠','🌐','❗']);
      if (randomChance(5)){
        response = ["Fact? I know one! ","FACT: ","Here's a fact, ", "Fact time! ","Speaking of facts, did you know ",
                    "I know a thing or two about facts, like ", "Oh! Did you know that ", "Actually, ", "True, but "];
        response = response[randomNumber(response.length)];
        randomNumber = randomNumber(factcount);
        response += Facts[randomNumber].charAt(0).toLowerCase() + Facts[randomNumber].slice(1);
        postMessage(response);
      }
    }
    if (/^(BULLSHIT|SPOILER) ALERT/i.test(messageContent)){
      var newtime = new Date().getTime() / 1000;
      if (newtime < refresh + 10) {
        response = ["You\'re doing that too much...",
                    "Cool it, cowboy. ",
                    "Wait a minute please...",
                    "Give me a sec.",
                    "lol nah dude",
                    "Not right now.",
                    "😤"];
        reactMessage(['⏰']);
        postMessage(response[randomNumber(response.length)],"reply");
      }
      else {
        response1 = ["Woah... ","Uh, ","Aight so ","OOOOOOOOOOOKAY ","😑 ","😶 ","😲 ","😱 ",'Nephew...', "This ain't it, chief...", "Aight I got this"];
        response = response1[randomNumber(response1.length)];
        response += ".\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.";
        response += "Looks like there's some fucked up shit up there! Here's a gif of ";
        topic = ['cat','duck','trippy','puppy','baby'];
        response2 = ['a cat!','a duck.','something trippy','puppies','a baby'];
        randomNumber2 = randomNumber(topic.length);
        response += response2[randomNumber2];
        reactMessage(['🤯','😑','😲','😨']);
        postMessage(response);
        delay(3000);
        searchGiphy(topic[randomNumber2]);
        refresh = newtime;
      }
    }
    if (/(\b(eat|eating|eats|ate) ass\b)/i.test(messageContent)) {
      reactMessage(['🤮','😑','🤢','😨','🍑']);
      response = ["Eating ass never was, isn't, and never will be cool.",
                  "Can we not talk about eating ass right now?", userName + " NO",
                  "...", "Gross.", "🤢" , "Is that all you'll ever talk about?",
                  "Listen... NO", "😒", "😶", "😐" , "So onto a different subject!", "nah fam", "https://media.giphy.com/media/l4Ki2obCyAQS5WhFe/giphy.gif"];
      postMessage(response[randomNumber(response.length)]);
    }
    if (/\b(issa|it's a) joke\b/i.test(messageContent)) {
      reactMessage(['🔪']);
      response = 'https://i.groupme.com/1215x2160.jpeg.95f793f6ae824fa782c88bd96dfd8b1b.large';
      postMessage(response);
    }
    if (/\b(thanks|(thank you)|thx)\b/i.test(messageContent)) {
      if (randomChance(10)) {
        response = ["You're welcome! 😊", "Don't mention it!",
                    "No problem.", "Any time."];
        reactMessage(['♥']);
        postMessage(response[randomNumber(response.length)]);
      }
    }
    //F: Whenever @TheD posts, random chance to react
    if (message.author.id == '702731740002648156' && randomChance(15)) {
        reactMessage(['🤓']);
    }

    //F: React when someone says "#kicksquadbot"
    if (/#kicksquadbot/i.test(messageContent)) {
      response = ["#kickyourself", "Whatever. I'm here forever...",
                  "I'd like to see you try.", "Initiating KILLALLHUMANS.exe...",
                  "If I had feelings, they'd be hurt right now...", "😭😭😭", "😕"];
      reactMessage(['😒']);
      postMessage(response[randomNumber(response.length)]);
    }

    ////START OF MAIN ACTIVE FUNCTIONS
    ///These functions run when users message the bot directly using tags or commands

    //ENTERED A COMMAND
    if (/^(!|\/).+/.test(messageContent)) {
      if (/^(\/|!)giphy/i.test(messageContent)) {
        reactMessage(['♥']);
        searchGiphy(messageContent.substring(7));
      }
      else if (/^(\/|!)face/i.test(messageContent)){
        reactMessage(['😁']);
        postMessage(cool());
      }
      else if (/^(\/|!)(math|calc|wolf)\b/i.test(messageContent)) {
        reactMessage(['🔢']);
        Wolfram.query(messageContent.substring(6), function(err, result) {
          if (err)
              console.log(err);
          else {
            if (result.queryresult.pod) {
              answer = result.queryresult.pod[1].subpod[0].plaintext[0];
              if (!(answer)) {
                answer = result.queryresult.pod[1].subpod[0].img[0].$.src;
                console.log(answer);
                response = ["The graph looks like this: ", "Check this out: ",
                            "Look at this: ", "Here's a neat graphic:",
                            "I drew it out for you: ", "How about this?",
                            "Here's a visual aid"];
                postMessage(response[randomNumber(response.length)]);
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
                postMessage(response[randomNumber(response.length)]+ "\n" + answer);
              }
            } else {
              answer = "I can\'t calculate that...";
            }
          }
      });}
      else if (/^(\/|!)info/i.test(messageContent)) {
        reactMessage(['ℹ']);
        postMessage(botInfo);
      }
      else if (/^(\/|!)restart/i.test(messageContent)) {
        reactMessage(['⚠']);
        restart();
      }
      else if (/^(\/|!)quote/i.test(messageContent)) {
        if (!Quotes_info){hold(5000);if (!quotecount){hold(2000);}}
        // reactMessage(['📝']);
        if (botRegex_oneword.test(messageContent)) {                  //If it's just "/quote"
          postMessage(Quotes[randomNumber(Quotes.length)]);
        } else {
          findQuote = messageContent.replace(/[\!]quote /i,''); findQuote = findQuote.replace(/\b /ig,'|');
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
            postMessage(newQuotes[randomNumber(newQuotes.length)].replace(/\\n/g,'\n'));
          } else {
            console.log("Couldn't find any matching quotes...");      // If a quote wasn't found, procede as normal.
            postMessage(Quotes[randomNumber(Quotes.length)].replace(/\\n/g,'\n'));
          }
        }
      }
      else if (/^(\/|!)8ball/i.test(messageContent)){
        reactMessage(['🎱']);
        if (!botRegex_oneword.test(messageContent)){
        	names = ["your mom", "your neighbor", "your conscience", "a priest", "a psychic"];

          response1 = ["My sources say ","Hmm... I'm gonna go with ", "Um... ", "Dude, ", "I think we both know the answer is ", "Let's just say ",
                        "How about ", "The spirits tell me ", "I feel like I should say ", "Well, " + userName + ", I'm gonna say ", "I'm legally required to say "];

          response2 = [
                  "fuck no","no","absolutely not","noooooooooooo","yes! jk, no", "yes","most likely, if you're not an idiot","definitely yes","yeah","it is certain","yussssss","absolutely","yes, but only if " + names[randomNumber3] + " says it's okay",
                   "without a doubt","yes, and make sure to hydrate","yes, 100%","totally","most likely","yeah, but wait a day","no. Wait nvm yes","yes... I think",
                   "I don't know","ask again later","I can't predict right now","think real hard first, then ask again","it's better not to tell you right now",
                   "there's a good chance","a unanimous yes","ye probs","yeah nah nah yeah","maybe ask " + names[randomNumber(names.length)], "...sure..."
                   ];

          response = "🎱 " + response1[randomNumber(response1.length)] + response2[randomNumber(response2.length)]  + ".";
          postMessage(response);
        } else {
          postMessage("🎱 You have to ask a yes or no question.");
        }
      }
      // Youtube Video Search
      else if (/^(\/|!)(youtube|yt|video)/i.test(messageContent)){
        reactMessage(['📺']);
        searchTerm = messageContent.replace(/(\/|!)(youtube|yt|video) \b/i,'');
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
      //Anything else
      else {
        postMessage("That isn't a valid command...");
      }
    }

    //ENTERED A TAG
    if (/\@(all|GSU)/i.test(messageContent)) {
      reactMessage(['♥','😳','🤡']);
      postMessage("I don't do that anymore, try using one of the Discord tags (@everyone)");
    }

    //TAGGED SQUADBOT DIRECTLY
    if (tagRegex_bot.test(messageContent) || users_mentioned == "<@" + SquadBot + ">") {
        if (/\b(hi|hello|hey|heyo|sup|wassup|good morning)\b/i.test(messageContent)){
        response = ["Hello!", "What\'s up?", "Hey.", "Hi!", "How are you on this fine day?", "😜", "Yo.","giphy hi","giphy hello"];
        response = response[randomNumber(response.length)];
        reactMessage(['♥']);
        if (/giphy/i.test(response)){
          response = response.replace(/giphy/i, '');
          searchGiphy(response);
        } else {
          postMessage(response);
        }
      }
      else if (/\b(thanks|(thank you)|thx)\b/i.test(messageContent)) {
        response = ["You're welcome! 😊", "Don't mention it!",
                    "No problem.", "Any time.","np","yw", "😘"];
        reactMessage(['👍']);
        postMessage(response[randomNumber(response.length)]);
      }
      else if (/\b(good night)|(bye)|(goodbye)|(goodnight)\b/i.test(messageContent)) {
        response = ["Okay, bye!", "Laters.", "See ya!",
                    "In a while, crocodile.", "Good riddance.", "👋",
                    "Didn\'t wanna talk anyway...", "Peace.", "Peace out.", "✌",
                     "giphy bye", "giphy goodbye", "giphy peace"];
        response = response[randomNumber(response.length)];
        reactMessage(['👋']);
        if (/giphy/i.test(response)){
          response = response.replace(/giphy/i, '');
          searchGiphy(response);
        } else {
          postMessage(response);
        }
      }
      else if (/(\b(fuck|fuck you|suck|sucks)\b)/i.test(messageContent)) {
        response = ["Well fuck you too.", "Why you gotta be so mean?",
                    "Whatever", "Rude...", "Ok...and?", "Damn okay then...", "😒",
                    "giphy fuck you", "giphy rude","giphy girl bye"];
        response = response[randomNumber(response.length)];
        reactMessage(['🤬']);
        if (/giphy/i.test(response)){
          response = response.replace(/giphy/i, '');
          searchGiphy(response);
        } else {
          postMessage(response);
        }
      }
      else if (/\bban\b/i.test(messageContent)) {
        reactMessage(['👩‍⚖️']);
        if (users_mentioned.length>1){
          for (i=1;i<users_mentioned.length;i++){
            response = users_mentioned[i].toString();
          }
          response2 = ["YOU ARE BANNED! GTFO!!!!","if I see you again, I'm slapping the shit outta you",
          "go away.", "I will FLING you into THE SUN", userName + " doesn't like you.", "yeah imma need you to get outta here",
          "giphy go away", "giphy leave", "you don't gotta go home, but you gotta get the fuck up outta here"];
          randomNumber = randomNumber(response2.length);
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
      }
      else if (!botRegex_oneword.test(messageContent)) {
        askCleverbot();
      }
    }
    ///END
  }
});

//// END OF MAIN RESPONSE

console.log("Response okay...")

///   OTHER FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////
function hold(ms){
  console.log(`Holding for ${ms} milliseconds...`)
  reactMessage(['⏱']);
  response = ["😪 ya gimmie a sec...","Woah, I'm awake!",
              "LOADING...", "Oh oh! I know this one!",
              "*wakes up*","*sips coffee*",
              "https://media.giphy.com/media/26FxCOdhlvEQXbeH6/giphy.gif",
              "jeez, what time is it?"];
  postMessage(response[randomNumber(response.length)]);
  var d = new Date();
  var d2 = null;
  do { d2 = new Date(); }
  while(d2-d < ms);
  console.log("End hold...")
}

function askCleverbot(){
  cleverQuestion = messageContent.replace(tagRegex_bot,'');
  cleverQuestion = cleverQuestion.replace(/^\s*/gm,'');
  if (cleverQuestion) {
    console.log(`Contacting Cleverbot AI server with: "${cleverQuestion}"`);
    CleverbotFree(cleverQuestion)
    .then(response => {
      if (/You can have a great chat at www.cleverbot.com/i.test(response)){
        console.log("ERROR: CLEVERBOT ERROR: " + response)
        newresponse = ["I have nothing to say to that...",
        "I've lost my voice at the moment, try again later.", "I can't talk right now.",
        "My AI module has failed.", "I'm mute for the time being..."];
        postMessage(newresponse[randomNumber(newresponse.length)]);
      } else {
        postMessage(response,'reply')
      }
    });
  }
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
          if (gifs.length>0){
            var id = gifs[randomNumber(gifs.length)].id;
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
  if (reaction.length > 1){
    var i = randomNumber(reaction.length);
    reaction = reaction[i];
  }
  message.react(reaction[0])
    .catch(console.error);
  console.log(`Reacted: ${reaction}`);
};

function restart(){
  if (userIDNum=="298305393459855360"){
    console.log("Restarting...");
    response = ["Guess I fucked up!","Was it something I said?","Aw man...",
    "Oh...", "Sorry about that.","😒","Aight then..."];
    restarting = true;
    postMessage(`${response[randomNumber(response.length)]} Restarting...`);
  } else {
    response = ["Nah...","https://media.giphy.com/media/fnuSiwXMTV3zmYDf6k/giphy.gif","Um... No?",
    "I'm not gonna do that.","Access denied: Unauthorized user","Error: Does not compute",
    "What?","Nah chief"];
    postMessage(response[randomNumber(response.length)]);
  }
};
/////////////////////////////////////////////////////////////////////////////////////

console.log("Running application...");
