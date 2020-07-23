///   REQUIRES & SETUP
/////////////////////////////////////////////////////////////////////////////////////
require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();
const BOT_TOKEN = process.env.BOT_TOKEN;
bot.login(BOT_TOKEN);
bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});
/////////////////////////////////////////////////////////////////////////////////////

///   GENERAL FUNCTIONS AND VARIABLES
/////////////////////////////////////////////////////////////////////////////////////
var refresh = (new Date().getTime() / 1000) - 120;
var SquadBot = '43525551';
var giphyURL = 'http://i.giphy.com/l1J9EdzfOSgfyueLm.gif';
noImage = "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif";
var restarting = false;

// time arg is in milliseconds
function delay(time) {var d1 = new Date();var d2 = new Date();while (d2.valueOf() < d1.valueOf() + time) {d2 = new Date();}}

botInfo = "Hi, I'm SquadBot version 3.0.0! \n" +
          "You can use commands like '/giphy [term]' and '/face' to post GIFs and ASCII faces. \n" +
          "Use /weather [now|today|this week] to get the weather for those times. \n" +
          "Use /math [problem] to solve math problems with WolframAlpha. \n" +
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

bot.on('message', msg => {
  if (msg.content === 'ping') {
    msg.reply('pong');
    msg.channel.send('pong');

  } else if (msg.content.startsWith('!kick')) {
    if (msg.mentions.users.size) {
      const taggedUser = msg.mentions.users.first();
      msg.channel.send(`You wanted to kick: ${taggedUser.username}`);
    } else {
      msg.reply('Please tag a valid user!');
    }
  }
});
