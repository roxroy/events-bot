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
        "text": announcement,
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

var creator = 'Toronto JS';
var announcement = `${creator} announced a new tech meetup`;
var slack_payload =  buildPayload({
	location : 'DevHub (46 Spadina Ave, 4th Floor, Toronto, ON, Canada)',
	summary : 'JS Code Club',
	link : 'https://www.meetup.com/torontojs/events/238900532/'
});

var fetch_data =function(){
    calandar.endpoints.map(function(url) {
                return calandar.getContent(url);
            });
}

const mapFields =function(eventData){
    const json = JSON.parse(eventData);
    var items = [];
    if (json.items) {
        items = json.items.map(function(data){
            return {
                 status : data.status,
                 summary : data.summary,
                 description : data.description,
                 link : data.description.split('\n')[1],
                 dateTime : Date.parse(data.start.dateTime)
            }
        });
    }

    return {
        summary: json.summary,
        description: json.description,
        items : items
    }
}

module.exports.check_for_events = (event, context, callback) => {

  postToSlack(slack_payload);
   
};
