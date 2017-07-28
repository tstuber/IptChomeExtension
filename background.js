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

/*
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
*/

// Badge Text on browserAction.
chrome.browserAction.setBadgeText({
  text: "ON"
});

chrome.runtime.onMessage.addListener(function(msg, _, sendResponse) {
  console.log("Listener hit!");
  if (msg.resize) {
    sendResponse(chrome.windows.getCurrent(function(win) {
      callback({
        "width": win.width,
        "height": win.height
      });
    }))
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
