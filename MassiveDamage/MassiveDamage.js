/*
 * TODO: Let gm choose status icons to set for various conditions
 */
var MASSIVEDAMAGE = MASSIVEDAMAGE || (function() {
    'use strict';
    
    var version = '0.1.1',
        lastUpdate = '2020-04-17',
        MassiveDamage,

        HandleGraphic = function(obj, prev) {
            let characterid = obj.get('represents');
            let character = getObj('character', characterid);
            if (!character)
                return;
            let pc = (character.get('controlledby').length > 0) ? true : false;

            let attr = null;
            let cur_hp = 0;
            let prev_hp = 0;
            let max_hp = 0;
            if (pc) {
                ['bar1', 'bar2', 'bar3'].forEach((cur)=> {
                    if (obj && obj.get(cur+'_link').length > 0) {
                        let cur_attr = getObj('attribute', obj.get(cur+'_link'));
                        if (cur_attr && cur_attr.get('name') == 'hp') {
                            cur_hp = obj.get(cur+'_value');
                            prev_hp = prev[cur+'_value'];
                            max_hp = prev[cur+'_max'];
                        }
                    }
                })
            } else {
                cur_hp = obj.get('bar1_value');
                prev_hp = prev['bar1_value']
                max_hp = prev['bar1_max']
            }
            
            if (!max_hp || !prev_hp || !cur_hp)
                return;
            
            log("Prev HP: " + prev_hp);
            log("Cur_HP: " + cur_hp);
            log("Max_HP: " + max_hp);

            if (prev_hp - cur_hp < max_hp/2)
                return;
                
            let mod = findObjs({
                type: 'attribute',
                name: 'constitution_save_bonus',
                characterid: characterid
            })[0];
            let con_save = randomInteger(20) + parseInt(mod.get('current'));
            let r = `<div>Constitution Save: [[${con_save}]]</div>`;
            if (con_save < 10) {
                r += '<div>Constitution save <span style="color:red">failed</span>!</div>';
                let md = randomInteger(10);
                let currentMarkers = obj.get("statusmarkers").split(',');
                switch (md) {
                    case 1:
                        r += '<div>You drop to 0 hp</div>';
                        obj.set('current', 0);
                        break;
                    case 2:
                    case 3:
                        r += '<div>You drop to 0 hp, and are stable</div>';
                        obj.set('current', 0);
                        break;
                    case 4:
                    case 5:
                        r += '<div>You are stunned until the end of your next turn</div>';
                        currentMarkers.push('fist');
                        obj.set("statusmarkers", currentMarkers.join(','))
                        break;
                    case 6:
                    case 7:
                        r += '<div>You cannot take reactions and have disadvantage on attack rolls and ability checks until the end of your next turn</div>'
                        currentMarkers.push('half-haze', 'interdiction');
                        obj.set("statusmarkers", currentMarkers.join(','))
                        break;
                    case 8:
                    case 9:
                    case 10:
                        r += '<div>You cannot take reactions until the end of your next turn</div>';
                        currentMarkers.push('half-haze');
                        obj.set("statusmarkers", currentMarkers.join(','))
                        break;
                }
            } else {
                r += '<div>Constitution save passed!';
            }
            
            let character_name = character.get('name');
            r = `<div style="font-weight:bold">${character_name}</div>` + r;
            if (character.get('controlledby')) {
                sendChat('Massive Damage', `/w ${character_name} ${r}`, null, {noarchive:true});
            }
            sendChat('Massive Damage', `/w gm ${r}`, null, {noarchive:true});
        },
        
        RegisterEventHandlers = function() {
            on('change:token', HandleGraphic);
        };
        
        
        return {
          RegisterEventHandlers: RegisterEventHandlers
        };
}());

on("ready", function() {
    'use strict'
    
    MASSIVEDAMAGE.RegisterEventHandlers();
    log('MassiveDamage started...')
})

