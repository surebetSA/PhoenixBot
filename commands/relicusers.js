//If something needs to know the permissions for this command, it looks here
exports.permissions = (client) => {
    return perms = {
        botChannel: true,           //If true, bot only responds in bot channels
        adminBotChannel: true,     //If true, bot only responds in admin bot channels
        role: client.perms.admin     //Last word specifies permission level needed to use this command
    }
}

//This code is run when the command is executed
exports.run = (client, message, args) => {


    //find vaulted relics in the input string
    let searchString = args.join(" ");

    let regex = /((Lith)|(Meso)|(Neo)|(Axi)){1} ?[a-z]{1}[0-9]+/gi;
    let currentMatch;
    let result = "";
    let matches = [];

    while((currentMatch = regex.exec(searchString)) !== null) {
        result = currentMatch[0];

        if (result.startsWith('lith') || result.startsWith('meso')) {
            spaceIndex = 4;
        } else {
            spaceIndex = 3;
        }

        if (result[spaceIndex] != ' ') {
            result = result.substring(0,spaceIndex) + " " + result.substring(spaceIndex, result.length);
        }

        result = result
            .toLowerCase()
            .split(' ')
            .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');

        if (client.DBEnmap.indexes.includes(result)) {
            matches.push(result);
        }
    }
    //'matches' is now an array of correctly formatted, vaulted relics found in the input

    let sendMessage;

    if (matches.length > 0) {
        sendMessage = `Listing users subscribed to relics: ${matches.join(', ')}:\n`

        let userIDs = [];
        let userNames = [];
        let name;

        for (let i = 0; i < matches.length; i++) {
            userNames = [];

            sendMessage += matches[i] + ':\n';
            userIDs = client.DBEnmap.get(matches[i]);

            //convert user ID's to names
            for (let ID of userIDs) {
                try {
                    name = message.guild.members.find(({ id }) => id === ID ).displayName;
                } catch {
                    name = "";
                }
                
                if (name != "") {
                    userNames.push(name);
                }
            }
            if (userNames.length > 0) {
                sendMessage += userNames.join(', ');
            } else {
                sendMessage += "Nobody seems to be subscribed to this relic";
            }
            
            sendMessage += '\n\n';
        }
    } else {
        sendMessage = "Relic(s) not found."
    }
    
    message.channel.send(sendMessage);
};

//This code is run when the help command is used to get info about this command
exports.help = (client, message) => {
    message.channel.send(`Help for RelicUsers:
Lists the users subscribed to a relic, or list of relics.

Usage: ${client.baseConfig.prefix}RelicUsers <relic name(s)>`);
};
