///   REQUIRES & SETUP
/////////////////////////////////////////////////////////////////////////////////////
require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();
const BOT_TOKEN = process.env.BOT_TOKEN;
var GoogleSpreadsheet = require('google-spreadsheet');
var cool = require('cool-ascii-faces');
var async = require('async');
var YTsearch = require('youtube-search');
// var cleverbot = require('cleverbot.io');
// const Cleverbot = require('cleverbot');
var Forecast = require('forecast');
var DOMParser = require('xmldom').DOMParser;
var wolfClient = require('node-wolfram');
bot.login(BOT_TOKEN);
bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});
var message;
/////////////////////////////////////////////////////////////////////////////////////

///   GENERAL FUNCTIONS AND VARIABLES
/////////////////////////////////////////////////////////////////////////////////////
var refresh = (new Date().getTime() / 1000) - 120;
var SquadBot = '735964834331623505';
var giphyURL = 'http://i.giphy.com/l1J9EdzfOSgfyueLm.gif';
noImage = "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif";
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
botRegex_oneword = /\s\b/;
tagRegex_bot = /@Squadbot.*?/i;
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
        console.log('Loaded document: '+info.title+'... ');
        Members_info = info.worksheets[0]; Groups_info = info.worksheets[1]; Quotes_info = info.worksheets[2];
        Facts_info = info.worksheets[3];
        step();
      } else {console.log("ERROR: SPREADSHEET RETURNED UNDEFINED.")}
    });
  },
  // Gets information about the groups
  function getGroupInfo(step) {
    Groups_info.getCells({'min-row': 1,'max-row': 3,'min-col': 1,'max-col': 25,'return-empty': false},
    function(err, cells) {
      if(cells === undefined){hold(3000);}
      groupcount = cells.length/3;
      console.log("Counted "+groupcount+" groups...");
      Group = []; Group_name = []; Group_regex = []; Group_response = [];
      for (i = 0; i < groupcount; i++){
        Group_name[i] = cells[i].value;
        tempRegEx = cells[i+groupcount].value;
        tempRegEx = tempRegEx.replace(/\;/ig,'|').replace(/\s/ig,'');
        Group_regex[i] = new RegExp('@('+tempRegEx+')', 'i');
        tempResponse = cells[i+groupcount*2].value;
        Group_response[i] = tempResponse.split(';');
        Group[i] = [Group_name[i],Group_regex[i],Group_response[i], new Array()];
      }
      step();
    });
  },
  //  Gets information about the members
  function getMemberInfo(step) {
    Members_info.getCells({'min-row': 2,'max-row': 100,'min-col': 1,'max-col': 2,'return-empty': false},
    function(err, cells) {
      if(cells === undefined){hold(3000);}
      membercount = cells.length/2;
      console.log("Counted "+membercount+" members...");
      Member = []; Member_name = []; Member_id = [];
      for (i = 0; i < membercount; i++){
          Member_id[i] = cells[(i*2)].value;
          Member_name[i] = cells[(i*2)+1].value;
          Member[i] = [Member_id[i], Member_name[i]];
      }
      Member_id.push(SquadBot); Member_name.push('SquadBot'); Member.push([SquadBot,'Squadbot']);
      step();
    });
  },
  //  Gets information about the members in a group
  function getGroupMembers(step){
    Groups_info.getCells({'min-row': 4,'max-row': (4+membercount),'min-col': 1,'max-col': groupcount,'return-empty': true},
    function(err, cells){
      if(cells === undefined){hold(3000);}
      subGroup = new Array(groupcount);
      for (j=0;j<groupcount;j++){
        subGroup[j] = new Array()
        for (i=0;i<membercount;i++){
          if (cells[(groupcount*i)+j].value != ''){subGroup[j].push(cells[(groupcount*i)+j].value);}
        }
        Group[j][3] = subGroup[j];
        for(k=0;k<Group[j][3].length;k++){
          if(Member_name.includes(Group[j][3][k])){
            Group[j][3][k] = Member_id[Member_name.indexOf(Group[j][3][k])];
          }
        }
      }
      step();
    });
  },
  //  Gets quotes
  function getQuotes(step){
    Quotes_info.getCells({'min-row': 2,'max-row': 300,'min-col': 1,'max-col': 1,'return-empty': false},
    function(err, cells){
      if(cells === undefined){hold(3000);}
      quotecount = cells.length;
      console.log("Counted "+quotecount+" quotes...");
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
      if(cells === undefined){hold(3000);}
      factcount = cells.length;
      console.log("Counted "+factcount+" facts...");
      Facts = [];
      for (i = 0; i < factcount; i++){
          Facts[i] = cells[i].value;
      }
      step();
    });
  },

], function(err){
    if( err ) {
      console.log('Error: '+err);
    }
});
/////////////////////////////////////////////////////////////////////////////////////

console.log("Starting up...");

///   API KEYS AND ALL APIS USED
/////////////////////////////////////////////////////////////////////////////////////
var GiphyapiKey = process.env.GIPHY_API_KEY;
// var cleverUser = process.env.CLEVER_USER;
// var cleverKey = process.env.CLEVER_KEY;
// // Old way of creating Cleverbot instance
//     // cleverBot = new cleverbot(cleverUser,cleverKey);
//     let cleverBot = new cleverbot(cleverUser, cleverKey);
//     randomNumber = randomNumber = Math.floor(Math.random()*999);
//     session = 'Squadbot1'+randomNumber;
//     console.log("Loading Cleverbot AI session: " + session + "...")
//     cleverBot.setNick(session);
//     cleverBot.create(function (err, session) {
//     });
//     console.log("Cleverbot loading completed...")

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

// bot.on('message', msg => {
//   if (message.content === 'ping') {
//     message.reply('pong');
//     message.channel.send('pong');
//
//   } else if (message.content.startsWith('!kick')) {
//     if (message.mentions.users.size) {
//       const taggedUser = message.mentions.users.first();
//       message.channel.send(`You wanted to kick: ${taggedUser.username}`);
//     } else {
//       message.reply('Please tag a valid user!');
//     }
//   }
// });

bot.on('message', msg => {
  message = msg;
  userName = message.author.username; userIDNum = message.author.id;
  channel = message.channel; channelID = message.channel.id;
  console.log(userName + " (" + userIDNum + ") posted in " + channel + ": \n" + msg);
  askme = false;

  if(message.content && !botRegex_oneword.test(message.content)) {

    if (/damn\b/gi.test(message.content)) {
      //likeMessage();
      response = ["- Kendrick Lamar","- Jamal Rogers",
                  "- Some random beaver", "- Craig and Smokey",
                  "- Florida Evans","- Anthony Fantano",
                  "- 800lb lady's brother"];
      randomNumber = Math.floor(Math.random()*response.length);
      response = response[randomNumber];
      postMessage(response);
    }
    else if (tagRegex_bot.test(message.content)) {
      //likeMessage();
      response = ["What?","What is it?", "?",
                  "Yes?", "I'm awake!", "How can I help?",
                  "Huh?","You called?","giphy huh",
                  "giphy question mark", "giphy what?"];
      randomNumber = Math.floor(Math.random()*response.length);
      askme = true; response = response[randomNumber];
      if(/\bgiphy \b/i.test(response)){
        response.replace(/\bgiphy \b/i, '');
        searchGiphy(response);
      } else {
      postMessage(response);}
    }

  }
  if(message.content && message.author.id != SquadBot && message.author.id != SquadBot && /\b(wtf|wth|what the (hell|fuck))\b/i.test(message.content)) {

    randomNumber = Math.floor(Math.random()*5);
    if(randomNumber == 3) {
      postMessage("I know, right!?");
    }

  }
  if(message.content && message.author.id != SquadBot && message.author.id != SquadBot && /\b(fact|facts)\b/i.test(message.content)) {

    //likeMessage();
    response = ["Fact? I know one! ","FACT: ","Here's a fact, ", "Fact time! ","Speaking of facts, did you know ",
                "I know a thing or two about facts, like ", "Oh! Did you know that ", "Actually, ", "True, but "];
    randomNumber1 = Math.floor(Math.random()*response.length);
    randomNumber2 = Math.floor(Math.random()*factcount);
    response = response[randomNumber1];
    response += Facts[randomNumber2].charAt(0).toLowerCase() + Facts[randomNumber2].slice(1);
    postMessage(response);

  }
  if(message.content == "tick"){

    postMessage("tock");
    //likeMessage();

  }
  if(/^(BULLSHIT|SPOILER) ALERT/i.test(message.content)){
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
      postMessage(response);
    } else {
      response1 = ["Woah... ","Uh, ","Aight so ","OOOOOOOOOOOKAY ","😑 ","😶 ","😲 ","😱 ",'Nephew...', "This ain't it, chief...", "Aight I got this"];
      randomNumber = Math.floor(Math.random()*response1.length);
      response = response1[randomNumber];
      response += "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
      response += "Looks like there's some fucked up shit up there! Here's a gif of ";
      topic = ['cat','duck','trippy','puppy','baby'];
      response2 = ['a cat!','a duck.','something trippy','puppies','a baby'];
      randomNumber2 = Math.floor(Math.random()*topic.length);
      response += response2[randomNumber2];
      postMessage(response);
      delay(3000);
      searchGiphy(topic[randomNumber2]);
      refresh = newtime;
    }
  }
  tagtest = false;
  if (!Groups_info){delay(5000);if (!groupcount){delay(2000);}}
  for (i=0;i<groupcount;i++){
    if(Group_regex[i].test(message.content)){tagtest=true;}
  }
  if(message.content && message.author.id != SquadBot && message.author.id != SquadBot && tagtest) {

    //likeMessage();
    API.Groups.show(accessToken, groupID, function(err,ret) {
      if (!err) {
        members = ret.members;
        console.log(members.length + "people currently in the group...");
      } else {console.log("ERROR: FAILED GETTING GROUP INFO: " + err);}
    });

    if (message.author.id == '') {postMessage("???");}
    // If someone posts @all
    // else if (message.author.id == John) {
    //   postMessage("*crickets*");
    // }
    else {
      // When a group is tagged, generate a random response
      for(i=0;i<groupcount;i++){
        if(Group_regex[i].test(message.content)){
          response = Group_response[i];
          randomNumber = Math.floor(Math.random()*response.length);
          response = response[randomNumber];
          response = response.replace(/\"/ig,'');}
      }
      reslength = response.length;
      response += message.author.username;
      if ((botRegex_oneword.test(message.content))) {
        response += ' says: ' + message.content;
      }
      else if (userIDNum == last_userIDNum) {
        response += ' says: ' + last_response;
      }
      else {
        response += ' wants your attention.';
      }
      usersID = []; usersLoci = [];
      for (i=0; i < AllIDs.length; i++){
        if(message.author.id != SquadBot) {
          grouptagtest = false;
          if(Group_regex[0].test(message.content) && Group[0][3].indexOf(AllIDs[i]) == -1){
            grouptagtest = true;
          } else {
            for(j=1;j<groupcount;j++){
              if(Group_regex[j].test(message.content) && Group[j][3].indexOf(AllIDs[i]) > -1){
                grouptagtest = true;}
            }
          }
          if(grouptagtest){
            usersID[i] = AllIDs[i];
            usersLoci[i] = [0,reslength-2];
          }
        }
      }
      usersLoci = usersLoci.filter(function(n){ return n != undefined });
      usersID = usersID.filter(function(n){ return n != undefined });
      misfire = /\b(Squad (mother|father|ginger))\b/i;
      if (misfire.test(message.content)){
        //temp fix for tagging names with "squad" in it
      } else {
        var newtime = new Date().getTime() / 1000;
        if (newtime < refresh + 120) {
          response = ["You\'re doing that too much...",
                      "Cool it, cowboy. ",
                      "Wait a minute please...",
                      "Give me a sec.",
                      "lol nah dude",
                      "Not right now.",
                      "😤"];
          randomNumber = Math.floor(Math.random()*response.length);
          response = response[randomNumber];
          postMessage(response);
        } else {
          postMessage(response,'tag',[usersLoci,usersID]);
          refresh = newtime;
        }
      }
    }
  }
    // ENTERED A COMMAND?
  if(message.content.charAt(0) == '!') {

    if(/^([\!]giphy)/i.test(message.content)) {
      //likeMessage();
      searchGiphy(message.content.substring(7));
    }
    else if(/^[\!]face$/i.test(message.content)){
      //likeMessage();
      postMessage(cool());
    }
    // else if(/^([\/](whois|who is))/i.test(message.content)) {
    //   attachments = request.attachments[0];
    //   if(attachments){
    //     if(attachments.type == 'mentions'){
    //       response = "";
    //       UserIDs = attachments.user_ids;
    //       //likeMessage();
    //       for(id=0;id<UserIDs.length;id++){
    //         if(Member_id.includes(attachments.user_ids[id])){
    //           thisName = Member_name[Member_id.indexOf(attachments.user_ids[id])];
    //         } else {
    //           thisName = "";
    //         }
    //         stringstart = attachments.loci[id][0]+1; stringend = stringstart+attachments.loci[id][1]-1;
    //         response += message.content.substring(stringstart,stringend);
    //         response += " has the ID "+attachments.user_ids[id]+" and is ";
    //         if(thisName){
    //             response += "listed as \""+thisName+"\".";
    //         } else {
    //             response += "not listed."
    //         }
    //         response += '\n';
    //       }
    //       postMessage(response);
    //     } else {
    //       postMessage("You have to tag someone.");
    //     }
    //   } else {
    //     postMessage("You have to tag someone.");
    //   }
    // }
    else if (/^\!\b(math|calc|wolf)\b/i.test(message.content)) {
      // getMath(message.content.substring(5));
      //likeMessage();
      Wolfram.query(message.content.substring(6), function(err, result) {
        if(err)
            console.log(err);
        else {
          if (result.queryresult.pod) {
            answer = result.queryresult.pod[1].subpod[0].plaintext[0];
            if (!(answer)) {
              answer = result.queryresult.pod[1].subpod[0].img[0].$.src;
              // postMessage("Look at this...");
              console.log(answer);
              response = ["The graph looks like this: ",
                          "Look at this: ",
                          "I drew it out for you: ",
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
                          "Oh, that\'s easy! It\'s "];
              randomNumber = Math.floor(Math.random()*response.length);
              postMessage(response[randomNumber]+ "\n" + answer);
            }
          } else {
            answer = "I can't calculate that...";
          }
        }
    });}
    else if (/\bweather\b/i.test(message.content)) {
      Regexnow = /\b(now|current)\b/i; Regextoday = /\b(today|day)\b/i;
      Regexweek = /\b(this week)|(for the week)|(week)\b/i;
      // Retrieve weather information from Statesboro
      // Initialize
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
        if(err) return console.log(err);

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
      //likeMessage();
    });}
    if (message.content == "!info") {
      //likeMessage();
      postMessage(botInfo);
    } if (message.content == "!restart") {
      //likeMessage();
      restart();
    }
    else if (/^([\!]quote)/i.test(message.content)) {
      if (!Quotes_info){hold(5000);if (!quotecount){hold(2000);}}
      //likeMessage();
      if (!botRegex_oneword.test(message.content)) {                  //If it's just "/quote"
        randomNumber = Math.floor(Math.random()*Quotes.length);
        postMessage(Quotes[randomNumber]);
      } else {
        findQuote = message.content; findQuote = findQuote.replace(/[\!]quote /i,'');
        botRegex_findQuote = new RegExp("\\b" + findQuote + "\\b","i");
        newQuotes = [];
        for(i = 0; i < Quotes.length; i++){                       //If a quote matches the search term, add it to a new list
          if(botRegex_findQuote.test(Quotes[i])){
            newQuotes.push(Quotes[i]);
          }
        }
        if(newQuotes.length > 0) {
          console.log("Found " + newQuotes.length + " matching quotes for \"" + findQuote + "\"...");
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
      //likeMessage();
      if(botRegex_oneword.test(message.content)){
      	names = ["Sara", "Lauren", "Amy", "Elias", "your mom", "your neighbor", "your conscience"];
      	randomNumber3 = Math.floor(Math.random()*names.length);

        response1 = ["My sources say ","Hmm... I'm gonna go with ", "Um... ", "Dude, ", "I think we both know the answer is ", "Let's just say ",
                      "How about ", "The spirits tell me ", "I feel like I should say ", "Well, " + userName + ", I'm gonna say ", "I'm legally required to say "];

        response2 = [
                "fuck no","no","absolutely not","noooooooooooo","yes! jk, no", "yes","most likely, if you're not an idiot","definitely yes","yeah","it is certain","yussssss","absolutely","yes, but only if " + names[randomNumber3] + " says it's okay",
                 "without a doubt","yes, and make sure to hydrate","yes, 100%","totally","most likely","yeah, but wait a day","no. Wait nvm yes","yes... I think",
                 "I don't know","ask again later","I can't predict right now","think real hard first, then ask again","it's better not to tell you right now",
                 "there's a good chance","a unanimous yes","ye probs","yeah nah nah yeah"
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
    else if(/^\!\b(youtube|yt|video)\b/i.test(message.content)){
      //likeMessage();
      searchTerm = message.content; searchTerm = searchTerm.replace(/\!\b(youtube|yt|video)\b/i,'');
      var resultNum = 0;
      if (/\([0-9]+\)/i.test(searchTerm)){
          textsearchTerm = searchTerm.replace(/\([0-9]+\)/i,'');
          resultNum = searchTerm.replace(textsearchTerm,'');
          resultNum = Number(resultNum.replace(/\(|\)/ig,''))-1;
          if(resultNum>9){
              resultNum = 9;
          }
          searchTerm = textsearchTerm;
      }
      console.log("Looking for video "+(resultNum+1)+"/10 of\""+searchTerm+"\"...");
      YTsearch(searchTerm, YTsearchopts, function(err, results) {
        if(err) return console.log("YOUTUBE SEARCH ERROR: " +err);
         console.dir(results[resultNum]);
         postMessage(results[resultNum].link);
      });
    }
    else {
      // postMessage("That isn't a valid command...");
    }

  }

  if((message.author.id != SquadBot && message.author.id != SquadBot ) && message.content && /(\b(eat|eating|eats|ate) ass\b)(.*?)/i.test(message.content)) {

    response = ["Eating ass never was, isn't, and never will be cool.",
                "Can we not talk about eating ass right now?", userName + " NO",
                "...", "Gross.", "🤢" , "Is that all you'll ever talk about?",
                "Listen... NO", "😒", "😶", "😐" , "So onto a different subject!", "nah fam", "https://media.giphy.com/media/l4Ki2obCyAQS5WhFe/giphy.gif"];
    randomNumber = Math.floor(Math.random()*response.length);
    postMessage(response[randomNumber]);

  }
  if ((message.author.id != SquadBot && message.author.id != SquadBot) && message.content && /^(?=.*\b(issa|it's a)\b)(?=.*\joke\b).*$/i.test(message.content)) {
    //likeMessage();
    response = 'https://i.groupme.com/1215x2160.jpeg.95f793f6ae824fa782c88bd96dfd8b1b.large';
    postMessage(response);
  }
  if((message.author.id != SquadBot && message.author.id != SquadBot) && message.content && /\b(thanks|(thank you)|thx)\b/i.test(message.content)) {

    randomNumber2 = randomNumber = Math.floor(Math.random()*10);
    if (randomNumber2 == 5) {
      response = ["You're welcome! 😊", "Don't mention it!",
                  "No problem.", "Any time."];
      randomNumber = Math.floor(Math.random()*response.length);
      //likeMessage();
      postMessage(response[randomNumber]);
    }

  }
  if (message.content && message.author.id == '18252184') {

    console.log("Pulling trigger...");
    randomNumber = Math.floor(Math.random()*15);
    if (randomNumber == 5) {
      console.log("BANG!");
    } else {
      console.log("*click*...\'" + randomNumber + "\'");
    }

  }
  if((message.author.id != SquadBot && message.author.id != SquadBot) && message.content && /#kicksquadbot/i.test(message.content)) {

    response = ["#kickyourself", "Whatever. I'm here forever...",
                "I'd like to see you try.", "Initiating KILLALLHUMANS.exe...",
                "If I had feelings, they'd be hurt right now...", "😭😭😭", "😕"];
    randomNumber = Math.floor(Math.random()*response.length);
    postMessage(response[randomNumber]);

  } if((message.author.id != SquadBot && message.author.id != SquadBot) && message.content && tagRegex_bot.test(message.content)) {
      if(/(\bhi|hello|hey|heyo|sup|wassup\b).*?/i.test(message.content) || /\b(good morning)\b/i.test(message.content)) {

      response = ["Hello!", "What\'s up?", "Hey.", "Hi!", "How are you on this fine day?", "😜", "Yo.","giphy hi","giphy hello"];
      randomNumber = Math.floor(Math.random()*response.length);
      response = response[randomNumber];
      //likeMessage();
      if(/giphy/i.test(response)){
        response = response.replace(/giphy/i, '');
        searchGiphy(response);
      } else {
        postMessage(response);
      }

    } else if (/\b(thanks|(thank you)|thx)\b/i.test(message.content)) {
      response = ["You're welcome! 😊", "Don't mention it!",
                  "No problem.", "Any time.","np","yw", "😘"];
      randomNumber = Math.floor(Math.random()*response.length);
      //likeMessage();
      postMessage(response[randomNumber]);
    } else if (/\b(good night)|(bye)|(goodbye)|(goodnight)\b/i.test(message.content)) {
      response = ["Okay, bye!", "Laters.", "See ya!",
                  "In a while, crocodile.", "Good riddance.", "👋",
                  "Didn\'t wanna talk anyway...", "Peace.", "Peace out.", "✌",
                   "giphy bye", "giphy goodbye", "giphy peace"];
      randomNumber = Math.floor(Math.random()*response.length);
      response = response[randomNumber];
      //likeMessage();
      if(/giphy/i.test(response)){
        response = response.replace(/giphy/i, '');
        searchGiphy(response);
      } else {
        postMessage(response);
      }
    } else if(/(\b(fuck|fuck you|suck|sucks)\b)(.*?)/i.test(message.content)) {

      response = ["Well fuck you too.", "Why you gotta be so mean?",
                  "Whatever", "Rude...", "Ok...and?", "Damn okay then...", "😒",
                  "giphy fuck you", "giphy rude","giphy girl bye"];
      randomNumber = Math.floor(Math.random()*response.length);
      response = response[randomNumber];
      if(/giphy/i.test(response)){
        response = response.replace(/giphy/i, '');
        searchGiphy(response);
      } else {
        postMessage(response);
      }

    }
    // else if(/\bban\b/i.test(message.content)) {
    //
    //   attachments = request.attachments[0];
    //   response = "";
    //   UserIDs = attachments.user_ids;
    //   //likeMessage();
    //   if(UserIDs.length>1){
    //     for(id=1;id<UserIDs.length;id++){
    //       stringstart = attachments.loci[id][0]+1; stringend = stringstart+attachments.loci[id][1]-1;
    //       response += message.content.substring(stringstart,stringend);
    //       response += ", ";
    //     }
    //     response2 = ["YOU ARE BANNED! GTFO!!!!","if I see you again, I'm slapping the shit outta you",
    //     "go away.", "I will FLING you into THE SUN", userName + " doesn't like you.", "yeah imma need you to get outta here",
    //     "giphy go away", "giphy leave", "you don't gotta go home, but you gotta get the fuck up outta here"];
    //     randomNumber = Math.floor(Math.random()*response2.length);
    //     if(/giphy/i.test(response2[randomNumber])){
    //       response = response2[randomNumber];
    //       response = response.replace(/giphy/i, '');
    //       searchGiphy(response);
    //     } else {
    //       response += response2[randomNumber];
    //       postMessage(response);
    //     }
    //   } else {
    //     postMessage("You have tag them too, not just me.")
    //   }
    //
    // }
    else if (!askme) {

      cleverQuestion = message.content;
      cleverQuestion = cleverQuestion.replace(/@squadbot(dev|)/i,'');
      if (cleverQuestion) {
        console.log("Contacting Cleverbot AI server with: \"" + cleverQuestion + "\"");
        cleverBot.ask(cleverQuestion, function (err, response) {
          if (response == "Error, the reference \"\" does not exist" || response == 'Site error' || /(\b(Session not initialized)\b)(.*?)/i.test(response)) {
            console.log("ERROR: CLEVERBOT ERROR: " + response)
        		newresponse = ["I have nothing to say to that...",
        		"I've lost my voice at the moment, try again later.",
        		"I can't talk right now.",
        		"My AI module has failed.", "I'm mute for the time being..."];
        		randomNumber = Math.floor(Math.random()*newresponse.length);
        		newresponse = newresponse[randomNumber];
            postMessage(newresponse);
          } else {
            //likeMessage();
            if (userIDNum==SquadBot){
              if (last_userIDNum == SquadBot){
                userName = seclast_userName; userIDNum = seclast_userIDNum;
              } else {
                userName = last_userName; userIDNum = last_userIDNum;
              }
            }
            response = "@"+userName+" " + response;
            postMessage(response,'tag',[[[0,userName.length+1]],[userIDNum]]);
          }
        });
      }

    }
  } else {


  }
  // seclast_userName = last_userName; seclast_userIDNum = last_userIDNum;
  // seclast_response = last_response;
  // last_userName = message.author.username; last_userIDNum = message.author.id;
  // last_response = message.content;
});

console.log("Response okay...")

///   OTHER FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////
function hold(ms){
  console.log("Holding for " + ms + " milliseconds...")
  //likeMessage();
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

function getMath(equation) {
  var options = {
    host: 'api.wolframalpha.com',
    path: '/v2/query?input=' + equation + '&appid=' + mathKey
  };

  var callback = function(response) {
    var str = '';

    response.on('data', function(chunk){
      str += chunk;
    });

    response.on('end', function() {
      var parser = new DOMParser();
      str = parser.parseFromString(str, "text/xml");
      JSONstr = xmlToJson(str);
      if (!(JSONstr)) {
        postMessage('Can\'t calculate that...');
        console.log("ERROR: WOLFRAM DID NOT SEND AN APPROPRIATE RESPONSE")
      } else {
        var response = JSONstr;
        console.log("Wolfram response: ");
        console.log(response);
      }
    });
  };

  HTTP.request(options, callback).end();
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
        if(!gifs){
          console.log(JSON.stringify(gifs));
          postMessage(noImage);
        } else {
          console.log("Available gifs: " + gifs.length);
          randomNumber = Math.floor(Math.random()*gifs.length);
          if (gifs && gifs.length>0){
            var id = gifs[randomNumber].id;
            //giphyURL = 'http://i.giphy.com/' + id + '.gif';
            giphyURL = 'https://media.giphy.com/media/' + id + '/giphy.gif';
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
		for(var i = 0; i < xml.childNodes.length; i++) {
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
  var botResponse, type, args, options, body, botReq, guid;
  delay(1500);
  message.channel.send(botResponse);
  // if(type=='tag'){
  //   options = {
  //   'message':{
  //     'source_guid': guid,
  //     'text': botResponse,
  //     'attachments' : [{
  //       'loci' : args[0],
  //       'type' : 'mentions',
  //       'user_ids' : args[1]
  //     }]}
  //   };
  // }
  //  else {
  //   options = {
  //     'message':{
  //       'source_guid': guid,
  //       'text': botResponse }
  //     };
  // };
  // API.Messages.create(accessToken,groupID,options, function(err,res){
  //   if (!err) {
  //   } else {console.log('POSTING FAILED: ERROR ' + JSON.stringify(err));}
  // });
  // if(restarting){
  //   restarting = false;
  //   delay(2000);
  //   process.exit(0);
  // }
};

// function likeMessage(messageID) {
//   API.Likes.create(accessToken,groupID,messageID, function(err,res) {
//     if (!err) {
//     } else {console.log('LIKING FAILED: ERROR ' + JSON.stringify(err));}
//   });
// };

function restart(){
  if(userIDNum=="28758543"){
    console.log("Restarting...");
    response = ["Guess I fucked up!","Was it something I said?","Aw man...",
    "Oh...", "Sorry about that.","😒","Aight then..."];
    randomNumber = Math.floor(Math.random()*response.length);
    response = response[randomNumber] += " Restarting...";
    restarting = true;
    postMessage(response);
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
