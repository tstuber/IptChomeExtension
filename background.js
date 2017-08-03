// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Global variables only exist for the life of the page, so they get reset
// each time the page is unloaded.
var counter = 1;
var lastTabId = -1;
var employees = null;

// TODO: Remove Slogan etc.
var getAllEmployees = function() {
  if (employees) {
    return employees;
  }
}

var getEmployeeByCode = function(code) {
  // only if list of employees is loaded.
  if (employees) {
    for (var i = 0; i < employees.length; i++) {
      if (employees[i].code == code) {
        return employees[i];
      }
    }
  }
}

// Function to read local employee json file.
var xmlhttp = new XMLHttpRequest();
xmlhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    employees = JSON.parse(this.responseText);
  }
}

chrome.runtime.onMessage.addListener(function(msg, _, sendResponse) {
  console.log("Listener hit!");

  if (msg.resize) {
    sendResponse(chrome.windows.getCurrent(function(win) {
      callback({
        "width": win.width,
        "height": win.height
      });
    }))
  } else if (msg.getAllEmployees) {
    // crate a datalist with employees.
    obj = getAllEmployees();

    if (obj) {
      sendResponse(obj);
    } else {
      sendResponse({
        "data": "Not available yet"
      });
    }
  } else if (msg.getEmployee) {
    // Lookup of employees.
    obj = getEmployeeByCode(msg.code);

    if (!obj) {
      sendResponse();
    } else {
      sendResponse(obj);
    }
  } 
  // If we don't return anything, the message channel will close, regardless
  // of whether we called sendResponse.
});

function initialize() {
  // load list of employees.
  if (employees == null) {
    // load json data.
    xmlhttp.open("GET", "iptEmployees.json", true);
    xmlhttp.send();
  }
}

initialize();
