// TODO: Support !explore 1d8

var EXPLORATION = EXPLORATION || (function() {
    'use strict';

    var version = '0.1.2',
        lastUpdate = '2020-04-22',
        Exploration,
        store,

        // Creates the Exploration character that holds the dice totalled up so far
        initializeStore = function() {
            store = findObjs({
                type: "character",
                name: "Exploration"
            })[0];

            if (!store) {
                store = createObj("character", {
                    name: "Exploration"
                });
                createObj('attribute', {
                    name: "d4",
                    current: "0",
                    characterid: store.id
                });
                createObj('attribute', {
                    name: "d6",
                    current: "0",
                    characterid: store.id
                });
                createObj('attribute', {
                    name: "d8",
                    current: "0",
                    characterid: store.id
                });
                createObj('attribute', {
                    name: "d10",
                    current: "0",
                    characterid: store.id
                });
                createObj('attribute', {
                    name: "d12",
                    current: "0",
                    characterid: store.id
                });
            }

            return store;
        },

        showHelp = function() {
            sendChat('', '/w gm '
                + '<div style="border: 1px solid black; backgorund-color: white; padding: 3px 3px;">'
                + '<div style="font-weight: bold; border-bottom: 1px solid black; font-size: 130%;">'
                + 'Exploration version: ' + version
                + '</div>'
                + '<div style="padding-left: 10px; margin-bottom: 3px;">'
                + '<p>Manage more engaging encounters while exploring the wilderness and dungeons</p>'
                + '<div style="font-weight: bold; border-bottom; 1px solid black;">'
                + 'Usage'
                + '</div>'
                + '<ul>'
                + '<li> !explore number-of-dice dice-type <i>(Example: !explore 3 6)</i>'
                + '</ul>'
                + '</div>'
                + '</div>'
            );
        },

        addDice = function(quantity, dice) {
            if (dice !== '4' && dice !== '6' && dice !== '8' && dice !== '10' && dice !== '12') {
                sendChat('Explore', 'Dice argument must be 4|6|8|10|12');
                return false;
            }

            let attr_name = 'd' + dice;
            let attr = findObjs({
                type: 'attribute',
                name: attr_name,
                characterid: store.id
            })[0];

            attr.set('current', parseInt(attr.get('current')) + quantity);
            sendChat('',
                '<div style="float:right; width:100%; border:1px solid #000000; border-radius: 5px; margin-bottom:5px">'
                + '<div style="background-color:#0000FF;color:#FFFFFF;font-weight:bold;text-align:center; border-radius-top-left:4px; border-radius-top-right:4px">Explore</div>'
                + `<div style="padding: 0px 5px 5px 5px">Added ${quantity}d${dice} to explorer pool`
                + '</div>'
                + '<div style="clear:both"></div>'
            )
            //sendChat('Explore', 'Added ' + quantity + 'd' + dice + ' to explorer pool')

            return true;
        },

        sumQuantity = function() {
            return ['4', '6', '8', '10', '12'].map(function(val){
                let obj = findObjs({
                    type: 'attribute',
                    name: 'd'+val,
                    characterid: store.id
                })[0];
                return parseInt(obj.get("current"));
            }).reduce((a,b) => a + b, 0);
        },

        clearQuantities = function() {
            ['4', '6', '8', '10', '12'].forEach(function(val){
                let obj = findObjs({
                    type: 'attribute',
                    name: 'd'+val,
                    characterid: store.id
                })[0];
                obj.set("current", 0);
            });
        },

        rollDice = function(quantity, sides) {
            var r = [];
            for (var i = 0; i < quantity; i++) {
                r.push(Math.ceil(Math.random() * sides));
            }
            return r;
        },

        rollAllDice = function() {
            var r = [];
            ['4', '6', '8', '10', '12'].forEach(function(val){
                let obj = findObjs({
                    type: 'attribute',
                    name: 'd'+val,
                    characterid: store.id
                })[0];
                if (parseInt(obj.get('current')) > 0) {
                    let dice = rollDice(parseInt(obj.get('current')), parseInt(val));
                    r = r.concat(dice);
                }
            });

            let rFormat = r.map(function(val) {
                if (val == 1)  {
                    return '<span style="color:#FFFFFF;background-color:#FF0000;display:inline-block;border-radius:5px;padding:0px 2px">'+val+'</span>'
                } else {
                    return val
                }
            });
            let cmd = '/w gm <div style="border:1px solid #000000;border-radius:10px;background-color:#FFFFFF;">'
                + '<div style="background-color:#0000FF;text-align:center;color:#FFFFFF;padding:3px">Random Encounter</div>'
                + '<div style="margin:5px">'
                + rFormat.join(', ')
                + '</div>'
                + '<div style="margin:0px 5px"><b>Hostility</b>: ' + rollDice(1, 100)[0] + '</div>'
                + '<div style="margin:0px 5px"><b>Story Tie-In</b>: ' + rollDice(1, 100)[0] + '</div>'
                + '</div>'
            sendChat('Explore', cmd)
            sendChat('Explore', '!rtm saltmarsh-costal-encounters-0-4 Explore')
        },

        showDice = function() {
            let r = '/w gm &{template:default} ';
            ['4', '6', '8', '10', '12'].forEach(function(val){
                let obj = findObjs({
                    type: 'attribute',
                    name: 'd'+val,
                    characterid: store.id
                })[0];
                let current = obj.get('current');
                r += `{{d${val}=${current}}} `;
            });
            sendChat('Explore', r);
        },

        HandleInput = function(msg_orig) {
            var msg = _.clone(msg_orig),
                args,
                dice;

            if (msg.type !== 'api' || !playerIsGM(msg.playerid)){
                return;
            }

            args = msg.content.split(/\s+/);
            switch (args[0]) {
                case '!explore':
                    if (args[1] == 'show') {
                        showDice();
                        return;
                    } else if (!Number.isInteger(parseInt(args[1])) || !Number.isInteger(parseInt(args[2]))) {
                        sendChat('Explore', 'Usage: !explore quantity dice');
                        return false;
                    }

                    if (!addDice(parseInt(args[1]), args[2])) {
                        return false;
                    }

                    let sum = sumQuantity();
                    if (sum >= 6) {
                        rollAllDice();
                        clearQuantities();
                    }

                    break;
            }
        },

        RegisterEventHandlers = function() {
            on('chat:message', HandleInput);
        };

    return {
        initializeStore: initializeStore,
        RegisterEventHandlers: RegisterEventHandlers
    };
}());

on("ready", function() {
    'use strict'

    EXPLORATION.initializeStore();
    EXPLORATION.RegisterEventHandlers();
    log('Exploration started...')
})

