// chatworkbot.js
// PhantomJS script for automatically sending chat messages to ChatWork.
//
// 


// preconditions -----------------------------------------------------------

options = {
    email: { idx: 0, value: "", optional: false },
    password: { idx: 1, value: "", optional: false },
    roomname: { idx: 2, value: "", optional: false },
    message:  { idx: 3, value: "", optional: false },
    label:    { idx: 4, value: "", optional: true },
};

for (var o in options) {
    options[o].value = phantom.args[options[o].idx];
}

function checkArgs() {
    if (phantom.args.length < options.message.idx + 1) {
        printHelp();
        phantom.exit();
        return false;
    }
    return true;
}

function printHelp() {
    var sorted = [];
    for (var o in options) {
        sorted[options[o].idx] = o;
        if (options[o].optional) {
            sorted[options[o].idx] = "[" + sorted[options[o].idx] + "]";
        }
    }
    var help = "Usage: phantomjs %prog ";
    for (var i in sorted) {
        help += sorted[i] + " ";
    }
    console.log(help);
}


// login -------------------------------------------------------------------


function openLoginScreen() {
    console.log("Getting the login screen");
    phantom.userAgent = 'SpecialAgent';
    phantom.open('https://member.ecstudio.jp/ecdesk/login.php?act=logout&redirect=login&package=chatwork&subpackage=&args=');
}

function postLoginCredentials() {
    console.log("Logging in");
    $('input[name="email"]').attr("value", options.email.value);
    $('input[name="password"]').attr("value", options.password.value);
    $('input[name="login"]').click();
}

// warmup ------------------------------------------------------------------

function waitFirstLoad() {
    if (!checkLoaded()) {
        console.log("Waiting for first load to end");
        setTimeout(function() {
            waitFirstLoad()
        }, 1000);
    } else {
        sendMessage();
    }
}

function checkLoaded() {
    return (CW.last_timeline_buildkey != "");
}

// sending -----------------------------------------------------------------

function sendMessage() {
    var roomLink = findRoomLink(options.roomname.value);
    roomLink.click();

    var $chattext = $("#cw_chattext");
    $chattext.focus();
    $chattext.val(composeMessage(options.message.value, options.label.value));

    var keydownEvent = $.Event("keydown");
    keydownEvent.keyCode = 13;
    $chattext.trigger(keydownEvent);

    var keyupEvent = $.Event("keyup");
    keyupEvent.keyCode = 13;
    $chattext.trigger(keyupEvent);

    setTimeout(waitChatSent, 1000);
}

function findRoomLink(roomName) {
    var link;
    $(".cw_room_link").each(function(i){
        if ($(this).text() == roomName) {
            console.log("Found room: " + roomName);
            link = $(this);
        }
    });
    return link;
}

function composeMessage(message, label) {
    if (typeof label == "undefined") {
        label = "";
    }
    var sep = label.length === 0 ? "" : ": ";
    return label + sep + message;
}

// cooldown ----------------------------------------------------------------

function waitChatSent() {
    if (isSending()) {
        console.log("Waiting for the message to be sent");
        setTimeout(function() {
            waitChatSent()
        }, 1000);
    } else {
        console.log("The Message should have been sent");
        bye();
    }
}

function isSending() {
    if ($("#cw_chattext").val() != "") {
        return true;
    }
    for (var m in RL.rooms) {
        var sending_chat_list = RL.rooms[m].sending_chat_list;
        for (var c in sending_chat_list) {
            if (typeof sending_chat_list[c] != "undefined") {
                return true;
            }
        }
    }
    return false;
}

function bye() {
    //phantom.render("chatwork.png");
    phantom.exit();
}

// main -------------------------------------------------------

if (phantom.state.length === 0) {
    phantom.state = 'getLogin';
    if (checkArgs()) {
        openLoginScreen();
    }
} else if (phantom.state == 'getLogin') {
    phantom.state = 'postLogin';
    postLoginCredentials();
} else if (phantom.state == 'postLogin') {
    phantom.state = 'sendMessage';
    waitFirstLoad();
}