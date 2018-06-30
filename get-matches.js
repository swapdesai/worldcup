/*jshint esversion: 6 */
/* jshint node: true */

'use strict';

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-southeast-2' });
const lambda = new AWS.Lambda();

exports.handler = (event, context, callback) => {

  // let token = event.token;
  //
  // if (token !== '<token>') {
  //   console.log('Invalid Slash Command token.');
  //   context.fail(new Error('Invalid Slash Command token.'));
  //   return;
  // }

  let country = event.country;
  let countryText = event.text; // Slack country message

  console.log('get-matches start');

  console.log('get-teams start');

  var getTeamsParams = {
    FunctionName: 'get-teams', // the lambda function we are going to invoke
    InvocationType: 'RequestResponse',
    LogType: 'Tail',
  };

  lambda.invoke(getTeamsParams, function (error, data) {
    if (error) {
      console.log('get-teams error: ' + error);

      // context.fail(error);
    } else {
      console.log('get-teams end');

      // console.log(data.Payload);
      // context.succeed(data.Payload);
      var teams = JSON.parse(data.Payload);

      // Prepared Statements
      var matchesScanningParams = {
        TableName: 'Matches',
        Limit: 64,
        KeyConditionExpression: '#year = :year',
        ExpressionAttributeNames: {
          '#year': 'year',
        },
        ExpressionAttributeValues: {
          ':year': 2018,
        },
      };

      docClient.query(matchesScanningParams, function (error, data) {
          if (error) {
            console.log('get-matches error');
            callback(error, null);
          } else {
            console.log('get-matches end');

            var response = {};
            response.records = [];
            data.Items.forEach(function (item) {
              if (Date.parse(item.date) > new Date()) {
                var record = {};
                record.groupName = item.group_name;
                record.homeTeam = getTeamName(teams.Items, item.home_team);
                record.awayTeam = getTeamName(teams.Items, item.away_team);
                record.date = new Date(item.date)
                                .toLocaleString('en-US', { timeZone: 'Australia/Melbourne' });

                response.records.push(record);
              }
            });

            if (country != null && country != '*') {
              console.log('country: ' + country);
              response.records = response.records.filter(function (record) {
                return record.homeTeam == country || record.awayTeam == country;
              }).slice(0, 3);
            } else if (countryText != null && countryText != '*') {
              console.log('countryText: ' + countryText);
              response.records = response.records.filter(function (record) {
                return record.homeTeam == countryText || record.awayTeam == countryText;
              }).slice(0, 3);
            } else {
              response.records = response.records.slice(0, 5);
            }

            callback(null, response);
          }
        });
    }

  });

  function getTeamName(data, teamId) {
    var teamName = data.find(x => x.id == teamId).name;

    return teamName;
  }
};
