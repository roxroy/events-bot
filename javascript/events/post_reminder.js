'use strict'

var https = require("https");
var url = require("url");
const calandar = require("../common/calendar");

const webhookURL = process.env.SLACK_WEBHOOK;
const channel = process.env.SLACK_CHANNEL;

const options = {
  hostname: url.parse(webhookURL).hostname,
  path: url.parse(webhookURL).pathname,
  method: 'POST',
  headers: {
      'Content-Type': 'application/json'
  }
};

function buildPayload(payload) {
    return {
        "text": payload.announcement,
        "channel": channel,
        "username": "torontojs-events-bot",
        "attachments": [
            {
                "fields": [
                    {
                        "title": "Location",
                        "value": payload.location,
                        "short": true
                    },
                    {
                        "title": "Title",
                        "value": payload.summary,
                        "short": true
                    },
                    {
                        "title": "Meetup Link",
                        "value": payload.link,
                        "short": false
                    },
                ]
            }
        ]
    };
};


function postToSlack(slack_payload) {
    var req = https.request(options, function(res) {
      console.log('Status: ' + res.statusCode);
      console.log('Headers: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (body) {
        console.log('Body: ' + body);
      });
    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write(JSON.stringify(slack_payload));
    req.end();
};

var fetchData =function(){
    return calandar.endpoints.map(function(url) {
                return calandar.getContent(url);
            });
}

const mapFields =function(eventData){
    const json = JSON.parse(eventData);
    //console.log(json);
    var items = [];
    if ( json.items) {
        items = json.items.map(function(data){
            return {
                 status : data.status,
                 summary : data.summary,
                 description : data.description,
                 link : data.description.split('\n')[1],
                 location : data.location,
                 dateTime : data.start.dateTime,
                 iCalUID : data.start.dateTime
            }
        });
    }

    return {
        summary: json.summary,
        description: json.description,
        nextSyncToken: json.nextSyncToken,
        items : items
    }
}

const postTodaysEvents =function(eventCalendar){
  const calendarEventData = mapFields (eventCalendar);
  const today =  new Date().setHours(0,0,0,0);
  const todaysEvents = calendarEventData.items.filter(function(event){
    return event.status === 'confirmed' && today === (new Date(Date.parse(event.dateTime))).setHours(0,0,0,0)  
  });

  console.info(`${calendarEventData.summary}: There are ${calendarEventData.items.length} events with ${todaysEvents.length} for today.`);
  todaysEvents.map(function(event){

    const creator = event.summary.replace('Events - ', '');
    var payload = buildPayload({
         announcement : `${calendarEventData.summary} hosted by ${creator} is happening today`,
         summary : event.summary,
         location : event.location,
         link : event.link
    });
    return postToSlack(payload);
  });
}

module.exports.check_for_events = (event, context, callback) => {
    Promise.all(fetchData()).then(allEventData => {
        allEventData.map(function(event){
            postTodaysEvents(event);
        });
    }); 
};
