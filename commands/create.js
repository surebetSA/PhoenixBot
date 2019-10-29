

exports.permissions = (client) => {
    return perms = {
        botChannel: false,
        adminBotChannel: false,
        role: client.perms.user
    }
}

exports.run = (client, message, args) => {

    /*if (!client.channelConfig.recruitChannels.includes(message.channel.id)) {
        message.channel.send("This command is only for recruiting channels, sorry");
        return;
    }*/

    let memberName = message.guild.member(message.author).displayName;

    let sendMessage =`-----\n - **${memberName}:**\n`;
    //avoids duplicates
    let relicList = new Set();
    let errorMessage = "";

    let inString = args.join(" ");
    let lowerString = inString.toLowerCase();

    let currentCharacter = 0;
    let relicName = "";
    let spaceIndex = 0;

    //search for relics
    let searchString = lowerString;
    let regex = /((Lith)|(Meso)|(Neo)|(Axi)){1} ?[a-z]{1}[0-9]+/gi;
    let currentMatch;
    let result = {};
    let matches = [];

    while((currentMatch = regex.exec(searchString)) !== null) {
        result = {};
        result.name = currentMatch[0];
        result.index = currentMatch.index;
        result.lastIndex = regex.lastIndex;
        matches.push(result);
    }

    //iterate through all characters of the message
    for (let index = 0; index < lowerString.length; index++) {
        
        currentCharacter = index;

        //check if any results start here
        result = null;
        for (let i = 0; i < matches.length; i++) {
            if (matches[i].index == index) {
                
                result = matches[i];
            }
        }

        if (result != null) {
            //a result starts here
            //check if the result has a space in the name or not, add it if it's missing
            if (result.name.startsWith('lith') || result.name.startsWith('meso')) {
                spaceIndex = 4;
            } else {
                spaceIndex = 3;
            }

            if (result.name[spaceIndex] == ' ') {
                relicName = result.name;
            } else {
                relicName = result.name.substring(0,spaceIndex) + " " + result.name.substring(spaceIndex, result.name.length);
            }
            
            //capitalise properly
            relicName = relicName
                .toLowerCase()
                .split(' ')
                .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
                .join(' ');

            //check if relic in DB
            if (client.DBEnmap.indexes.includes(relicName)) {

                //add to list of relics
                relicList.add(relicName);

                //format it into the message
                sendMessage += "__";
                sendMessage += relicName;
                sendMessage += "__";

                //skip to the end of the result (so we don't print it out twice)
                index = result.lastIndex - 1;
            }
        }
        
        
        //if we haven't found anything, just print the current character
        if (currentCharacter == index) {
            sendMessage += inString[index];
        }
    }

    //-----TEMP-----
    let roleString = "";
    //-----
    
    //if message has some vaulted relics
    let playerList = new Set();
    if (relicList.size > 0) {
        //get the player list for each relic
        let currentUsers = [];
        for (let relic of relicList) {

            
            //-----TEMP-----if role exists for the relic, ping that as well (OLD SYSTEM)
            let role = message.guild.roles.find(role => role.name == relic)
            if (role) {
                roleString += `<@&${role.id}>`;
            }
            //-----



            currentUsers = client.DBEnmap.get(relic);
            for (let user of currentUsers) {
                if (user != message.author.id) {
                    playerList.add(user);
                }
            }
        }

        //-----TEMP-----(OLD SYSTEM)
        if (roleString.length < 2000 && roleString.length > 0) {
            message.channel.send(roleString)
            .then(msg => {
                msg.delete();
            })
            .catch();
            
        } else {
            if (roleString.length > 0) errorMessage += "Too many relics to use old system. New system should function as normal.\n";
        }
        //-----

    } else {
        //send error message about no relics found
        errorMessage += "No vaulted relics found in this message - nobody will be tagged.\n";
    }

    //search for squad capacity markers
    searchString = sendMessage;
    regex = /\b[1-3]\/4/g;
    currentMatch;
    result = {};
    matches = [];

    while((currentMatch = regex.exec(searchString)) !== null) {
        result = {};
        result.name = currentMatch[0];
        result.index = currentMatch.index;
        result.lastIndex = regex.lastIndex;
        matches.push(result);
    }

    //create squads
    let squadObject = {};
    let newSendMessage = "";
    let lastCut = 0;

    let keys = [];

    //for each squad found
    for (let i = 0; i < matches.length; i++) {
        //reset squad object
        squadObject = {};

        //get a lobby number for it
        let lobbyIndex = client.lobbyDB.get('nextLobby');

        //set to next index to avoid race conditions
        if (lobbyIndex == 99) {
            client.lobbyDB.set('nextLobby', 0);
        } else {
            client.lobbyDB.set('nextLobby', lobbyIndex + 1);
        }

        //put information into new squad object
        squadObject.lobbyID = lobbyIndex;
        //do this later
        squadObject.messageID = "";

        //grab everything from the last squad ID to this marker
        newSendMessage += sendMessage.substring(lastCut, matches[i].lastIndex);

        //save the location of the number to edit later
        squadObject.countIndex = newSendMessage.length-3;

        //insert ID for this new squad
        newSendMessage += ` {**${lobbyIndex}**}`;

        //update the cut location for next loop
        lastCut = matches[i].lastIndex;
        
        //get the starting player count
        squadObject.playerCount = parseInt(matches[i].name.substring(0));
        squadObject.open = true;
        squadObject.hostID = message.author.id;
        squadObject.joinedIDs = [];

        //save the key for this squad to add message ID later
        keys.push(lobbyIndex);

        //save to DB
        client.lobbyDB.set(lobbyIndex, squadObject);
    }

    //add everything after the last squad marker
    newSendMessage += sendMessage.substring(lastCut, sendMessage.length);

    //if we've had non-fatal errors say so
    if (errorMessage != "") {
        message.reply(`**Some errors occured**: \n${errorMessage}`)
        .then((msg) => {
            msg.delete(10000);
        });;
    }

    //post the message
    message.channel.send(newSendMessage + "\n-----")
    //once we've sent the message, add its ID to each of the squads that have been created
    .then((message) => {
        for (key of keys) {
            client.lobbyDB.setProp(key, "messageID",message.id);
        }
    });

    let channel = message.channel;
    //get rid of the original command
    message.delete();


    let userArray = Array.from(playerList);

    //mass ping
    let pingMessage = "";
    let newPingMessage = "";
    let currentMention = "";

    //until array of users is empty
    while (userArray.length > 0) {
        //create a mention for the current user
        currentMention = "<@" + userArray.shift() + ">";
        //create a hypothetical new ping message
        newPingMessage = pingMessage + currentMention;

        //if we could send it
        if (newPingMessage.length < 2000) {
            //save it, loop again
            pingMessage = newPingMessage;
        } else {
            //would be too long to send, so send the old version and delete immediately
            channel.send(pingMessage)
            .then(msg => {
                msg.delete();
            })
            .catch();
            //start another one from the missed mention
            pingMessage = currentMention;
        }
    }
    //if there's anyone left
    if (pingMessage.length > 0) {
        //ping and delete
        channel.send(pingMessage)
        .then(msg => {
            msg.delete();
        })
        .catch();
    }
};

exports.help = (client, message) => {
    message.channel.send(`Help for create:
Creates a hosting message using all text supplied after the command. 

Relic names will be found and highlighted, and people subscribed to those relics will be pinged. 

Squad identifiers (1/4, 2/4, 3/4) will have lobby ID's inserted after them. Use ${client.baseConfig.prefix}join on one of these to join a squad.

Get a full user's guide by using ${client.baseConfig.prefix}guide

Example usage: ${client.baseConfig.prefix}create h axi a1 1/4 and stuff`);
};