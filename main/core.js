await game.settings.register('elt-toolkit', 'last_day_num', {
  name: 'Last Day (daystamp)', // can also be an i18n key
  hint: 'Identifies last day processed by tracker. ', // can also be an i18n key
  scope: 'world',     // "world" = sync to db, "client" = local storage
  config: false,       // false if you dont want it to show in module config
  type: Number,       // Number, Boolean, String, or even a custom class or DataModel
  default: -1,
  onChange: value => { // value is the new value of the setting
    console.log(value)
  },
  filePicker: false,  // set true with a String `type` to use a file picker input,
  requiresReload: false, // when changing the setting, prompt the user to reload
});

let elt = {
        getCurDate: function (){
                let l_cur_date = SimpleCalendar.api.currentDateTime()
                return {year:l_cur_date.year ,month:l_cur_date.month ,          day:l_cur_date.day}
                },
        trackers: {
        innRooms: {
        AddNights:function (seller_id, player_actor_id, item) {
                let l_cur_date = elt.getCurDate();
                let game_actor = game.actors.get(player_actor_id);
                let l_cur_inns = game_actor.getFlag('elt-toolkit','inns')
                let l_cur_nights = 0
                console.log('PARAMS::',game_actor,item,seller_id);
                console.log('ROOMS::',l_cur_inns );
                if (typeof l_cur_inns  === "undefined") {
                console.log('>>>Init');
                        l_cur_inns= []
                        }

                let inn = l_cur_inns.find( i => i.iid === item.item._id)
                if (typeof inn  === "undefined") {
                        console.log('>>>add_new');
                                l_cur_inns.push({
                                        id:item.item._id,
                                        room: item.item,
                                        quantity:item.quantity,
                                        seller_id:seller_id})
                        }
                else {
                        console.log('>>>to_updat');
                        inn.quantity += item.quantity
                        }
                game_actor.setFlag('elt-toolkit','inns',l_cur_inns)
                console.log('CURR ROOMS::',l_cur_inns);
        },
   resetall: function(){
        for (actor of game.actors){
                actor.unsetFlag('elt-toolkit','inns')
                }
        },
   expire: function (date){
                let game_actors= game.actors.filter(actor => actor.hasPlayerOwner);
        let inns = [];
                for (let actor of game_actors){
                        let l_cur_inns = actor.getFlag('elt-toolkit','inns')
                        if (!(typeof l_cur_inns  === "undefined")) {
                                for (inn of l_cur_inns ){
                                        if (inn.quantity > 0) {
                                                inn.quantity--;
                        inns.push(inn)
                                                }
                                        }
                                elt.trackers.innRooms.notify(actor, inns,date);
                                actor.setFlag('elt-toolkit','inns',l_cur_inns)
                                }
                        }
        },
        notify: function(actor, inns, date){
        let seller = 'NoOne';
        let msg='<p style="line-height: 1.8;">Spent the following Inn Reservations <br></p>';
        if (!(typeof date  === "undefined")){msg+=`<p>${date.year}-${date.month}-${date.day}</p>`}
        let send_to = Object.keys(game.actors.get("nKHlbAb2HjZ2y0Q7").ownership).slice(1);
        send_to.push(game.users.getName("Gamemaster"))
        for ( inn of inns) {
                 seller = game.actors.get(inn.seller_id)
                 msg += `
<div style="gap: 10px;display: flex; align-items: center;">
  <img src="${inn.room.img}" width="15" height="15" /><div><strong>${seller.name}</strong></div><div> ${inn.room.name}</div><div> (x${inn.quantity} left)</div>
</div>
`;
        }
        ChatMessage.create({
            content: msg  ,
            whisper: send_to,
            speaker: ChatMessage.getSpeaker({ actor:seller })
            })

        }
}
},
landing:{
        new_day: function (dateData) {
if (game.user.isGM) {
console.log(dateData)
const rate =86400
let last_day_num = -1
let cur_day_num = parseInt(dateData.date.sunrise /rate )
try {
    last_day_num = game.settings.get('elt-toolkit','last_day_num')
} catch {
    last_day_num= -1
}
if (last_day_num===-1){ last_day_num = cur_day_num }
let diff_day_num =cur_day_num - last_day_num
if (diff_day_num >= 0 ) { game.settings.set('elt-toolkit','last_day_num', cur_day_num)}
for (let i = 0; i < diff_day_num; i++) {
   let i_date = SimpleCalendar.api.secondsToInterval((cur_day_num-i)*rate);
   elt.trackers.innRooms.expire(i_date );
}
console.log(last_day_num)
        }
        }
}
}


Hooks.on("item-piles-tradeItems", (seller,buyer, trade,tid) => {
        if (game.user.isGM) {
                elt.trackers.innRooms.AddNights(
                seller.id,
                buyer.id,
                trade.buyerReceive[0]
                )
        }
});
Hooks.on("simple-calendar-date-time-change", (x) =>{ elt.landing.new_day(x)});
