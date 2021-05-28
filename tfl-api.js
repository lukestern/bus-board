const fetch = require('node-fetch');
const readline = require("readline-sync");
const winston = require('winston');


const consoleFormat = winston.format.printf(info => `${info.message}`)

const logger = winston.createLogger({
      transports: [
        new winston.transports.Console({format: consoleFormat}),
        new winston.transports.File({ filename: 'bus-board.log' })
      ]
    });

const app_key = '';

async function getBusArrivalsFromStopId(stopId) {
    const body = await fetch(`https://api.tfl.gov.uk/StopPoint/${stopId}/Arrivals?app_key=${app_key}`)
        .then(response => response.json())
    return body
}

async function getBusStopsFromPosition(position) {
    const body = await fetch(`https://api.tfl.gov.uk/StopPoint/?lon=${position.lon}&lat=${position.lat}&stopTypes=NaptanPublicBusCoachTram&app_key=${app_key}`)
        .then(response => response.json())
    return body["stopPoints"]
}

async function getLatLong(postCode) {
    const body = await fetch(`http://api.postcodes.io/postcodes/${postCode}?app_key=${app_key}`)
        .then(response => response.json())
    return { 'lon': body["result"]["longitude"], 'lat': body["result"]["latitude"] }
}

function filterBusStopData(busStops) {
    const filteredBusStops = [];
    for (let i = 0; i < busStops.length; i++) {
        const currentBusStop = {};
        currentBusStop['id'] = busStops[i]['naptanId']
        currentBusStop['distance'] = busStops[i]['distance']
        currentBusStop['commonName'] = busStops[i]['commonName']
        filteredBusStops.push(currentBusStop)
    }
    return filteredBusStops;
}

function getNumberOfStops(busStops, n = 2) {
    const sortedStops = busStops.sort(function (a, b) { return a.distance - b.distance });
    if (sortedStops.length <= n) {
        return sortedStops;
    } else {
        return sortedStops.slice(0, n) // second parameter is relative to the first
    }
}

function getNextBusses(arrivalResponse) {
    const nextBusses = [];
    for (let i = 0; i < arrivalResponse.length; i++) {
        const currentBus = {};
        currentBus['lineName'] = arrivalResponse[i]['lineName']
        currentBus['destinationName'] = arrivalResponse[i]['destinationName']
        currentBus['expectedArrival'] = arrivalResponse[i]['expectedArrival']
        currentBus['timeToStation'] = arrivalResponse[i]['timeToStation']
        nextBusses.push(currentBus)
    }
    return nextBusses;
}

function getNextNumberOfBusses(nextBusses, n = 5) {
    const sortedBusses = nextBusses.sort(function (a, b) { return a.timeToStation - b.timeToStation });
    if (sortedBusses.length <= n) {
        return sortedBusses;
    } else {
        return sortedBusses.slice(0, n)
    }
}

function printBusStopInfo(stop) {
    logger.info(`\n Bus Stop: ${stop["commonName"]}`);

}

function printBusInfo(bus) {
    logger.info(`\t ${bus.lineName} ${bus.destinationName} arriving in approximately ${Math.floor(bus.timeToStation / 60)} minutes`)
}

async function main() {
    logger.info(`START: ${new Date().toUTCString()}`)
    
    console.log('Please enter a post code')
    const postCode = readline.prompt();
    const position = await getLatLong(postCode);

    const busStops = await getBusStopsFromPosition(position);
    const filteredBusStops = filterBusStopData(busStops);
    const nextStops = getNumberOfStops(filteredBusStops);

    for (let i = 0; i < nextStops.length; i++) {
        printBusStopInfo(nextStops[i]);
        let arrivalResponse = await getBusArrivalsFromStopId(nextStops[i]["id"]);
        let nextBusses = getNextBusses(arrivalResponse);
        let nextFiveBusses = getNextNumberOfBusses(nextBusses);
        for (let j = 0; j < nextFiveBusses.length; j++) {
            printBusInfo(nextFiveBusses[j])
        }
    }
    logger.info("END");
}

main()
// implement logging to a file
// validate postcode
// logging and other errors

// try {
//     // where the code goes
//     adddlert("Welcome guest!");
// }
// catch (err) {
//     // put our throws and our logs in here
//     throw 'test if this goes to the console'
//     console.log(err.name); // find out what the error name is. 
//     console.log(err.message); // find out what the message looks like. 
//     if(err.name ==="")
// }
// finally() {
//     // not sure what to put in here are we dont have anything open. Maybe unnecessary. 

// }

//Example errors