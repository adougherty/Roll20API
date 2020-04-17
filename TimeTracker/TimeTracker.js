/*
 * TODO: Add Starfinder Support
 * TODO: Add Greyhawk Support
 * TODO: Add Faerun Support
 * TODO: Add Moon Phases
 * TODO: Add repeating events
 * TODO: Print calendar
 */
var TIMETRACKER = TIMETRACKER || (function() {
    'use strict';

    var version = '0.1.1',
        lastUpdate = '2020-04-13',
        TimeTracker,
        store,

        // Creates the TimeTracker handout that holds the current time and date
        initializeStore = function() {
            store = findObjs({
                type: "handout",
                name: "Time And Date"
            })[0];

            if (!store) {
                store = createObj("handout", {
                    name: "Time And Date"
                });
                setVisual('0000', 'January', 1, '00','00')
                store.set("gmnotes", "months:January 31,February 28,March 31,April 30,May 31,June 30,July 31,August 31,September 30,October 31,November 30,December 31\n"
                    + "hours:24\n"
                    + "sunrise:700\n"
                    + "sunset:1900\n"
                    + "cur:0000-0-1-0-0"
                )
            }

            return store;
        },

        setVisual = function(year, month, dom, hour, minute) {
            let min = minute.toString();
            if (min.length==1)
                min="0"+min;
            store.set("notes",
                '<div style="font-weight:bold">Time of Day</div>'
                +`<div>${hour}:${min}</div>`
                +`<div>${month} ${dom}, ${year}</div>`
            );
        },

        showHelp = function() {
            sendChat('', '/w gm '
                + '<div style="border: 1px solid black; backgorund-color: white; padding: 3px 3px;">'
                + '<div style="font-weight: bold; border-bottom: 1px solid black; font-size: 130%;">'
                + 'TimeTracker version: ' + version
                + '</div>'
                + '<div style="padding-left: 10px; margin-bottom: 3px;">'
                + '<p>Track the time and date in your game, and let your players know when it is</p>'
                + '<div style="font-weight: bold; border-bottom; 1px solid black;">'
                + 'Usage'
                + '</div>'
                + '<ul>'
                + '<li> !tod config month [months days,...] <i>(Example: !tod config month January 31 February 28 March 30)</i></li>'
                + '<li> !tod config hours_per_day number </li>'
                + '<li> !tod config sunrise hour minute</li>'
                + '<li> !tod config sunset hour minute</li>'
                + '<li> !tod announce sunrise|sunset'
                + '<li> !tod default greyhawk</li>'
                + '<li> !tod addevent year month day hour minute name</li>'
                + '<li> !tod set year month day hours minutes </li>'
                + '<li> !tod add (days <i>optional</i>):(hours <i>optional</i>):(minutes)</li>'
                + '<li> !tod start</li>'
                + '<li> !tod stop</li>'
                + '<li> !tod now </li>'
                + '</ul>'
                + '</div>'
                + '</div>'
            );
        },

        parseGMNotes = function(gmnotes) {
            var tod = {};
            gmnotes.split(/\n/).forEach((line)=>{
                let aLine = line.split(':', 2);
                tod[aLine[0]]=aLine[1]
            });

            let months = [];
            tod['months'].split(',').forEach((month)=> {
                let a = month.split(' ');
                months.push({
                    name: a[0],
                    days: a[1]
                });
            });
            tod['hours'] = parseInt(tod['hours']);
            tod['months'] = months;

            return tod;
        },

        showNow = function() {
            store.get('gmnotes', (gmnotes)=>{
                let tod = parseGMNotes(gmnotes);

                let cur = tod['cur'].split('-');

                let curmonth = tod['months'][cur[1]]['name'];
                if (cur[4].length==1)
                    cur[4] = '0' + cur[4];

                sendChat('TimeTracker', '/w gm '
                    +`<div>${curmonth} ${cur[2]}, ${cur[0]} -- ${cur[3]}:${cur[4]}</div>`
                );
            });
        },

        getVal = function(key, callback) {
            store.get('gmnotes', (gmnotes)=> {
                var tod = {};
                gmnotes.split(/\n/).forEach((line)=>{
                    let aLine = line.split(':', 2);
                    tod[aLine[0]]=aLine[1]
                });
                callback(tod[key]);
            })
        },

        setVal = function(key, val, callback=()=>{}) {
            store.get('gmnotes', (gmnotes) => {
                var r = [];
                gmnotes.split(/\n/).forEach((line)=>{
                    let aLine = line.split(':', 2);
                    r.push(aLine[0]+':'+((aLine[0]==key) ? val : aLine[1]))
                    if (aLine[0]==key) {
                        log(`Updated ${key}=${val}`);
                    }
                });
                let joined = r.join("\n");
                setTimeout(function(){
                    store.set('gmnotes', joined);
                    callback();
                },100);
            });
        },

        setTime = function(year, month, dom, hour, minute, month_txt) {
            setVal('cur', `${year}-${month}-${dom}-${hour}-${minute}`, ()=>{
                setVisual(year, month_txt, dom, hour, minute);
                showNow();
            });
        },

        incrementMonths = function (tod, cur, months) {
            if (cur[1]+months > tod['months'].length-1) {
                while (cur[1]+months > tod['months'].length-1) { //Incrementing beyond year
                    months -= tod['months'].length-1 - cur[1];
                    cur[0]++; // Go to next year
                    cur[1] = 0; // Go to the first month of next year
                }
            } else {
                cur[1]+=months;
            }
            return cur;
        },

        incrementDays = function(tod, cur, days) {
            if (cur[2]+days > tod['months'][cur[1]]['days']) {
                while (cur[2]+days > tod['months'][cur[1]]['days']) {
                    days -= tod['months'][cur[1]]['days'] - cur[2];
                    cur = incrementMonths(tod, cur, 1); // Go to next month
                    cur[2] = 1; // Go to the first day of next month
                }
            } else {
                cur[2]+=days;
            }
            return cur;
        },

        incrementHours = function(tod, cur, hours) {
            let prevtime = (cur[3]*100)+cur[4];
            if (cur[3]+hours > tod['hours'] - 1) {
                while(cur[3]+hours > tod['hours'] - 1) { // Note: the last hour is actually the first hour of the next day
                    hours -= tod['hours'] - cur[3];
                    cur = incrementDays(tod, cur, 1); // Go to next day
                    cur[3] = 0; // Go to first hour of next day
                }
            } else {
                cur[3]+=hours;
            }
            let newtime = (cur[3]*100)+cur[4];

            if (prevtime < parseInt(tod['sunset']) && newtime >= parseInt(tod['sunset'])) {
                sendChat('Time Tracker', '<b>The sun has set</b>');
            } else if (prevtime < parseInt(tod['sunrise']) && newtime >= parseInt(tod['sunrise'])) {
                sendChat('Time Tracker', '<b>The sun has risen</b>');
            }
            return cur;
        },

        incrementMinutes = function(tod, cur, mins) {
            let prevtime = (cur[3]*100)+cur[4];
            if (cur[4]+mins >= 60) {
                while(cur[4]+mins >= 60) {
                    mins -= 60 - cur[4];
                    cur = incrementHours(tod, cur, 1); // Go to next hour
                    cur[4] = 0; // Go to first minute of next hour
                }
            } else {
                cur[4]+=mins;
            }
            let newtime = (cur[3]*100)+cur[4];

            if (prevtime < parseInt(tod['sunset']) && newtime >= parseInt(tod['sunset'])) {
                sendChat('Time Tracker', '<b>The sun has set</b>');
            } else if (prevtime < parseInt(tod['sunrise']) && newtime >= parseInt(tod['sunrise'])) {
                sendChat('Time Tracker', '<b>The sun has risen</b>');
            }

            return cur;
        },

        HandleInput = function(msg_orig) {
            var msg = _.clone(msg_orig),
                args;

            if (msg.type !== 'api' || !playerIsGM(msg.playerid)){
                return;
            }

            args = msg.content.split(/\s+/);
            switch (args[0]) {
                case '!tod':
                    switch (args[1]) {
                        case 'add':
                            let usage = '/w gm Usage: !tod add 0:0:0 <i>days(optional):hours(optional):minutes';
                            if (args.length < 3) {
                                sendChat('TimeTracker', usage);
                                return false;
                            }
                            let dhm = args[2].split(':');
                            var mins = parseInt(dhm[dhm.length-1]);
                            var hours = (dhm.length > 1) ? parseInt(dhm[dhm.length-2]) : 0;
                            var days = (dhm.length > 2) ? parseInt(dhm[dhm.length-3]) : 0;

                            if (!Number.isInteger(mins) || !Number.isInteger(hours) || !Number.isInteger(days)) {
                                sendChat('TimeTracker', usage);
                                return false;
                            }

                            store.get('gmnotes', (gmnotes)=> {
                                var tod = parseGMNotes(gmnotes);
                                var cur = tod['cur'].split('-').map((val)=>{return parseInt(val)});
                                cur = incrementDays(tod, cur, days);
                                cur = incrementHours(tod, cur, hours);
                                cur = incrementMinutes(tod, cur, mins);

                                setVal('cur', cur.join('-'), ()=> {
                                    setVisual(cur[0], tod['months'][cur[1]]['name'], cur[2], cur[3], cur[4]);
                                    showNow();
                                });
                            })
                            break;
                        case 'now':
                            showNow()
                            break;
                        case 'config':
                            switch (args[2]) {
                                case 'month':
                                    if (args.length%2 == 0) {
                                        sendChat('TimeTracker', '/w gm Usage: !tod config month [name days]...');
                                        return false;
                                    }
                                    var months = [];
                                    for (var i = 3; i < args.length; i+=2) {
                                        if (!Number.isInteger(parseInt(args[i+1]))) {
                                            sendChat('TimeTracker', '/w gm Usage: !tod config month [name days]...');
                                            return false;
                                        }
                                        months.push(args[i] + " " + args[i+1]);
                                    }
                                    setVal('months',months.join(','), ()=> {
                                        sendChat('TimeTracker', '/w gm Months configured successfuly');
                                    });

                                    break;
                                case 'hours_per_day':
                                    if (!Number.isInteger(parseInt(args[3]))) {
                                        sendChat('TimeTracker', '/w gm Usage: !tod config hours_per_day {number}');
                                        return false;
                                    }
                                    setVal('hours', args[3], ()=> {
                                        sendChat('TimeTracker', '/w gm Hours per day configured successfuly');
                                    })
                                    break;
                                case 'sunrise':
                                case 'sunset':
                                    if (!Number.isInteger(parseInt(args[3])) || !Number.isInteger(parseInt(args[4]))) {
                                        sendChat('TimeTracker', `/w gm Usage: !tod config ${args[2]} {number} {number}`);
                                        return false;
                                    }
                                    if (args[4].length==1)
                                        args[4] = '0' + args[4];
                                    setVal(args[2], args[3]+args[4], ()=> {
                                        sendChat('TimeTracker', `/w gm ${args[2]} configured successfuly`);
                                    })
                                    break;
                                default:
                                    sendChat('TimeTracker', '/w gm Usage: !tod config month|hours_per_day|sunrise|sunset {arguments}')
                                    log(`Bad argument: ${args[2]}`)
                            }
                            break;
                        case 'set':
                            [2,3,4,5,6].forEach((idx)=>{
                                if (!Number.isInteger(parseInt(args[idx]))) {
                                    sendChat('TimeTracker', '/w gm Usage: !tod year month(numeric) day hour minute')
                                }
                            });
                            getVal('months', (months)=> {
                                setTime(args[2], args[3], args[4], args[5], args[6], months.split(/[, ]/)[args[3]*2]);
                            })

                            break;
                        case 'default':
                            switch (args[2]) {
                                case 'greyhawk':
                                    setVal('months', 'Needfest 7,Fireseek 28,Readying 28,Coldeven 28,Growfest 7,Planting 28,Flocktime 28,Wealsun 28,Richfest 7,Reaping 28,Goodmonth 28,Harvester 28,Brewfest 7,Patchwall 28,Ready\'reat 28,Sunsebb 28', ()=> {
                                        sendChat("Time Tracker", "/w gm Calendar updated to Greyhawk")
                                    });
                                    break;
                                case 'faerun':
                                    setVal('months', 'Hammer 30,Alturiak 30,Ches 30,Tarsakh 30,Mirtul 30,Kythorn 30,Flamerule 30,Eleasis 30,Eleint 30,Marpenoth 30,Uktar 30,Nightal 30', ()=>{
                                        sendChat("Time Tracker", "/w gm Calendar updated to Faerûn")
                                    });
                                    break;
                            }
                            break;
                        case 'addevent':
                            sendChat('TimeTracker', '/w gm This command has not yet been implemented');
                            break;
                        case 'announce':
                            sendChat('TimeTracker', '/w gm This command has not yet been implemented');
                            break;
                        case 'start':
                            sendChat('TimeTracker', '/w gm This command has not yet been implemented');
                            break;
                        case 'stop':
                            sendChat('TimeTracker', '/w gm This command has not yet been implemented');
                            break;
                        case 'help':
                        default:
                            showHelp();
                    }
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

    TIMETRACKER.initializeStore();
    TIMETRACKER.RegisterEventHandlers();
    log('TimeTracker started...')
})

