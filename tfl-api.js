const fetch = require('node-fetch');
const readline = require("readline-sync");
const winston = require('winston');


const consoleFormat = winston.format.printf(info => `${info.message}`)
const logFileFormat = winston.format.printf(info => `${info.level}: ${info.message}`)

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({ format: consoleFormat }),
        new winston.transports.File({ filename: 'bus-board.log', format: logFileFormat })
    ]
});

const app_key = '';

function getPostcodeInput() {
    let postCode;
    do {
        console.log('\n Please enter a post code:')
        postCode = readline.prompt();
    } while (!validPostcode(postCode));
    logger.info(`Valid postcode provided: ${postCode}`)
    return postCode;
}

function validPostcode(postcode) {
    postcode = postcode.replace(/\s/g, "");
    var regex = /^[A-Z]{1,2}[0-9]{1,2} ?[0-9][A-Z]{2}$/i;
    try {
        valid = regex.test(postcode)
        if (!valid) {
            throw `Invalid postcode: ${postcode}`
        }
    }
    catch (err) {
        logger.error(err)
    }
    return valid;
}

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

function filterBusData(arrivalResponse) {
    const busses = [];
    for (let i = 0; i < arrivalResponse.length; i++) {
        const currentBus = {};
        currentBus['lineName'] = arrivalResponse[i]['lineName']
        currentBus['destinationName'] = arrivalResponse[i]['destinationName']
        currentBus['expectedArrival'] = arrivalResponse[i]['expectedArrival']
        currentBus['timeToStation'] = arrivalResponse[i]['timeToStation']
        busses.push(currentBus)
    }
    return busses;
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

    const postCode = getPostcodeInput();
    const position = await getLatLong(postCode);
    let busStops;
    try {
        busStops = await getBusStopsFromPosition(position);
        if (busStops.length === 0) {
            throw 'No bus stops found within 200 meters'
        }
    }
    catch (err) {
        logger.error(err)
    }
    const filteredBusStops = filterBusStopData(busStops);
    const nextStops = getNumberOfStops(filteredBusStops);

    for (let i = 0; i < nextStops.length; i++) {
        printBusStopInfo(nextStops[i]);
        let arrivalResponse = await getBusArrivalsFromStopId(nextStops[i]["id"]);
        let filteredBusses = filterBusData(arrivalResponse);
        let nextFiveBusses = getNextNumberOfBusses(filteredBusses);
        for (let j = 0; j < nextFiveBusses.length; j++) {
            printBusInfo(nextFiveBusses[j])
        }
    }
    logger.info("END");
}

main()