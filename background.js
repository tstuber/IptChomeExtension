// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Global variables only exist for the life of the page, so they get reset
// each time the page is unloaded.
var counter = 1;
var lastTabId = -1;
var employees = null;

var lookup = function(searchTerm) {
    // only if list of employees is loaded.
    if (employees) {
      for (var i = 0; i < employees.length; i++) {
        if (employees[i].code == searchTerm) {
          return employees[i];
        }
      }
    }
  },

  // Function to read local employee json file.
  xmlhttp = new XMLHttpRequest();
xmlhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    employees = JSON.parse(this.responseText);
  }
}

function sendMessage() {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    lastTabId = tabs[0].id;
    console.log(lastTabId);
    chrome.tabs.sendMessage(lastTabId, "Background page started.");
  });
}

sendMessage();

// Badge Text on browserAction.
chrome.browserAction.setBadgeText({
  text: "ON"
});
console.log("Loaded.");

// chrome.runtime.onInstalled.addListener(function() {
//   console.log("Installed.");
//
//   // localStorage is persisted, so it's a good place to keep state that you
//   // need to persist across page reloads.
//   localStorage.counter = 1;
//
//   // Register a webRequest rule to redirect bing to google.
//   var wr = chrome.declarativeWebRequest;
//   chrome.declarativeWebRequest.onRequest.addRules([{
//     id: "0",
//     conditions: [new wr.RequestMatcher({
//       url: {
//         hostSuffix: "bing.com"
//       }
//     })],
//     actions: [new wr.RedirectRequest({
//       redirectUrl: "http://google.com"
//     })]
//   }]);
// });

/*
chrome.bookmarks.onRemoved.addListener(function(id, info) {
  alert("I never liked that site anyway.");
});
*/


/*
// Wenn das browserAction Icon geklickt wird.
chrome.browserAction.onClicked.addListener(function() {
  // The event page will unload after handling this event (assuming nothing
  // else is keeping it awake). The content script will become the main way to
  // interact with us.
  chrome.tabs.create({
    url: "http://google.com"
  }, function(tab) {
    chrome.tabs.executeScript(tab.id, {
      file: "content.js"
    }, function() {
      // Note: we also sent a message above, upon loading the event page,
      // but the content script will not be loaded at that point, so we send
      // another here.
      sendMessage();
    });
  });
});
*/

/*
chrome.commands.onCommand.addListener(function(command) {
  chrome.tabs.create({
    url: "http://www.google.com/"
  });
});
*/

chrome.runtime.onMessage.addListener(function(msg, _, sendResponse) {
  console.log("Listener hit!");
  if (msg.setAlarm) {
    // For testing only.  delayInMinutes will be rounded up to at least 1 in a
    // packed or released extension.
    chrome.alarms.create({
      delayInMinutes: 0.1
    });
  } else if (msg.resize) {
    sendResponse(chrome.windows.getCurrent(function(win) {
      callback({
        "width": win.width,
        "height": win.height
      });
    }))
  } else if (msg.delayedResponse) {
    // Note: setTimeout itself does NOT keep the page awake. We return true
    // from the onMessage event handler, which keeps the message channel open -
    // in turn keeping the event page awake - until we call sendResponse.
    setTimeout(function() {
      sendResponse("Got your message.");
    }, 5000);
    return true;
  } else if (msg.getCounters) {
    sendResponse({
      counter: counter++,
      persistentCounter: localStorage.counter++
    });
  } else if (msg.getEmployee) {

    // load list of employees.
    if (employees == null) {
      // load json data.
      xmlhttp.open("GET", "iptEmployees.json", true);
      xmlhttp.send();
    }

    // Lookup of employees.
    obj = lookup(msg.code);

    if (!obj) {
      sendResponse();
    } else {
      sendResponse(obj);
    }
  }
  // If we don't return anything, the message channel will close, regardless
  // of whether we called sendResponse.
});

/*
chrome.alarms.onAlarm.addListener(function() {
  alert("Time's up!");
});
*/

/*
chrome.runtime.onSuspend.addListener(function() {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    // After the unload event listener runs, the page will unload, so any
    // asynchronous callbacks will not fire.
    alert("This does not show up.");
  });
  console.log("Unloading.");
  chrome.browserAction.setBadgeText({
    text: ""
  });
  chrome.tabs.sendMessage(lastTabId, "Background page unloaded.");
});
*/
