/**
 * OLD MESSAGE - TODO
 * This programm scans your environment for APs of the eduroam network.
 * Just run it with 'node script.js' and map out a room.
 * If you want to pause scanning (f.e. when moving to another room)
 * just press Ctrl + C and follow the instructions.
 *
 * Beware: The set containing each scanned MAC-address is cleared upon
 * inputing a new room. This is done in order to get a clean list of only
 * the access point in every room and only this room.
 * -> Don't interrupt unless you intend to change to a new room and want to
 *    create a new list of APs.
 *
 * Don't worry if you see a spam of 'stderr' messages in your console,
 * the programm is still working and will return to its normal behaviour momentarily.
 * Florian Utku
 */

/* global $ */
const childProcess = require('child_process');
const fs = require('fs');
const { remote } = require('electron');

const networkScan = 'sudo iwlist wlan0 scanning | egrep \'Address|Frequency|ESSID\' | grep -B2 \'eduroam\' | grep -B1 -A1 \'Frequency:2\'';
const addressSet = new Set();
const roomIDMap = new Map();

// DEPRECATED
// Change this to your prefered name for the legend file
// const legendFileName = 'legend.txt';

// Change this to whatever value you want as an ID
// also change the increment in line 93.
let currentRoomID = 1;

let currentLibrary = '';

let stringBuilder = '';

/**
 * Removes unnecessary information and saves every mac-address in a hashmap.
 * Calls the previous function to start a infinite scanning loop.
 * @param {String} stdout The stdout from the previous function
 */
function saveAddresses(stdout) {
  const cleaned = stdout
    .replace(/Cell [0-9]* | - Address: /g, '')
    .replace(/- Address: /g, '')
    .replace(/Frequency:2.4[0-9]{2} GHz \(Channel [0-9]+\)/g, '')
    .replace(/ESSID:"eduroam"/g, '')
    .replace(/\n/g, '')
    .replace(/ /g, '')
    .replace(/--/g, '');

  const addresses = cleaned.match(/.{1,17}/g);
  console.log('addresses: ', addresses);
  addresses.forEach((element) => {
    const address = element.replace(/.$/, '0');
    addressSet.add(address);
  });

  stringBuilder = `${currentLibrary}-${roomIDMap.get(currentRoomID)}|${[...addressSet].join('|')}`;
  scanning(networkScan);
}

/**
 * Executes a bash command and starts a function to analyse
 * the stdout.
 * @param {String} command a Bash command
 */
function scanning(command) {
  childProcess.exec(command, (execerr, stdout) => {
    if (execerr) scanning(command);
    if (stdout) saveAddresses(stdout);
  });
}

/**
 * This function gets called, when the user interrupts the program
 * via Ctrl + C. The programm stops scanning and waits for the user
 * to make a choice, if he wants to continue scanning.
 */
function cont() {
  fs.appendFileSync(`${currentLibrary}.txt`, `${stringBuilder}\n`);
  console.log('stringBuilder: ', stringBuilder);
  currentRoomID += 1;
  addressSet.clear();
  scanning(networkScan);
}

$(() => {
  $('#startScanRow').click(() => {
    $('#startScanRow').hide();
    $('#stopScanRow').hide();
    $('#listScanRow').show();
  });

  $('#stopScanRow').click(() => {
    if ($('#scanActive').is(':visible')) {
      cont();
      $('#scanActive').hide();
      $('#startScanRow').show();
      $('#stopScanRow').height('50%');
    }
  });

  $('#close').click(() => {
    if (roomIDMap.size === 0) {
      remote.getCurrentWindow().close();
      // return;
    }
    /* DEPRECATED
    fs.writeFileSync(legendFileName, 'Zuordnung von ID zu Raumname/Gebietsname:\n');
    roomIDMap.forEach((value, key) => {
      fs.appendFileSync(legendFileName, `${key} = ${value}\n`);
    });
    */
    remote.getCurrentWindow().close();
  });
});

$(() => {
  $('.libList').click((event) => {
    currentLibrary = $(event.target).text();

    /**
     * Set the available rooms.
     * Every library has its own file where each room is written on a new line.
     */
    const allRooms = fs.readFileSync(`./rooms/${currentLibrary.toLowerCase()}Rooms`, 'utf-8').split('\n');
    for (let i = 0; i < allRooms.length; i += 1) {
      const element = allRooms[i];
      console.log('i: ', i);
      console.log('element: ', element);
      $(`#room0${i}`).text(element);
    }

    $('#listLibRow').hide();
    $('#stopScanRow').show();
    $('#startScanRow').show();
  });

  $('.areaList').click((event) => {
    roomIDMap.set(currentRoomID, $(event.target).text());
    scanning(networkScan);
    $('#stopScanRow').show().height('100%');
    $('#listScanRow').hide();
    $('#scanActive').show().append(`${currentLibrary}-${roomIDMap.get(currentRoomID)}...`);
  });
});

process.on('SIGINT', () => cont());
// setTimeout(() => process.exit(22), 5000);
// saveAddresses(fs.readFileSync('test.txt').toString());
