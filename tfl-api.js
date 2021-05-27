const fetch = require('node-fetch')

const app_key = '';
const stopId = '490008660N';


async function getBusArrivalsFromStopId(stopId) {
    const body = await fetch(`https://api.tfl.gov.uk/StopPoint/${stopId}/Arrivals?app_key=${app_key}`)
        .then(response => response.json())
    return body
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



async function main() {
    let arrivalResponse = await getBusArrivalsFromStopId(stopId);
    let nextBusses = getNextBusses(arrivalResponse);

    console.log(getNextNumberOfBusses(nextBusses))
    console.log("END");
}

main()
